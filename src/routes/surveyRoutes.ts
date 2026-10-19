import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { AuthRequest, requireAuth } from '../middleware/auth';

export const surveyRouter = Router();
surveyRouter.use(requireAuth);

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

const encuestaSchema = z.object({
  respuestas: z.array(z.number().int().min(1).max(5)).length(6),
});

/**
 * @openapi
 * /api/encuesta:
 *   get:
 *     summary: Obtiene la última encuesta del estudiante y si puede responder otra (RN-03)
 *     tags: [Encuesta]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Estado de la encuesta (respuestas, fecha, si está bloqueada)
 */
surveyRouter.get('/', async (req: AuthRequest, res) => {
  const encuesta = await pool.query(
    'SELECT id, fecha_respuesta FROM encuestas WHERE usuario_id = $1',
    [req.usuarioId]
  );

  if (encuesta.rowCount === 0) {
    return res.json({ respuestas: [], fechaRespuesta: null, bloqueada: false, diasRestantes: 0 });
  }

  const { id, fecha_respuesta } = encuesta.rows[0];
  const respuestas = await pool.query(
    'SELECT pregunta_id, valor FROM respuestas_encuesta WHERE encuesta_id = $1 ORDER BY pregunta_id ASC',
    [id]
  );

  const transcurrido = Date.now() - new Date(fecha_respuesta).getTime();
  const bloqueada = transcurrido < SIETE_DIAS_MS;
  const diasRestantes = bloqueada ? Math.ceil((SIETE_DIAS_MS - transcurrido) / (24 * 60 * 60 * 1000)) : 0;

  res.json({
    respuestas: respuestas.rows.map((r) => r.valor),
    fechaRespuesta: fecha_respuesta,
    bloqueada,
    diasRestantes,
  });
});

/**
 * @openapi
 * /api/encuesta:
 *   post:
 *     summary: Registra la encuesta de bienestar de 6 preguntas (RF-03, RF-04, RN-03, RN-04)
 *     tags: [Encuesta]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [respuestas]
 *             properties:
 *               respuestas:
 *                 type: array
 *                 items: { type: integer, minimum: 1, maximum: 5 }
 *                 minItems: 6
 *                 maxItems: 6
 *     responses:
 *       201:
 *         description: Encuesta registrada
 *       400:
 *         description: Datos inválidos, el estudiante no tiene materias registradas, o faltan menos de 7 días
 */
surveyRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = encuestaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'La encuesta debe tener exactamente 6 respuestas entre 1 y 5.' });
  }

  // RN-04: el estudiante debe tener al menos una materia registrada
  const materias = await pool.query('SELECT 1 FROM materias WHERE usuario_id = $1 LIMIT 1', [req.usuarioId]);
  if (materias.rowCount === 0) {
    return res.status(400).json({ error: 'Necesitas tener al menos una materia registrada antes de hacer la encuesta.' });
  }

  const existente = await pool.query(
    'SELECT id, fecha_respuesta FROM encuestas WHERE usuario_id = $1',
    [req.usuarioId]
  );

  // RN-03 / RF-04: bloqueo de 7 días entre encuestas
  if (existente.rowCount && existente.rowCount > 0) {
    const transcurrido = Date.now() - new Date(existente.rows[0].fecha_respuesta).getTime();
    if (transcurrido < SIETE_DIAS_MS) {
      const diasRestantes = Math.ceil((SIETE_DIAS_MS - transcurrido) / (24 * 60 * 60 * 1000));
      return res.status(400).json({
        error: `Ya respondiste la encuesta recientemente. Podrás responderla de nuevo en ${diasRestantes} día(s).`,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let encuestaId: string;
    if (existente.rowCount && existente.rowCount > 0) {
      const actualizada = await client.query(
        'UPDATE encuestas SET fecha_respuesta = now() WHERE usuario_id = $1 RETURNING id',
        [req.usuarioId]
      );
      encuestaId = actualizada.rows[0].id;
      await client.query('DELETE FROM respuestas_encuesta WHERE encuesta_id = $1', [encuestaId]);
    } else {
      const creada = await client.query(
        'INSERT INTO encuestas (usuario_id) VALUES ($1) RETURNING id',
        [req.usuarioId]
      );
      encuestaId = creada.rows[0].id;
    }

    const { respuestas } = parsed.data;
    for (let i = 0; i < respuestas.length; i++) {
      await client.query(
        'INSERT INTO respuestas_encuesta (encuesta_id, pregunta_id, valor) VALUES ($1, $2, $3)',
        [encuestaId, i + 1, respuestas[i]]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
