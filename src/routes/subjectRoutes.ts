import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { AuthRequest, requireAuth } from '../middleware/auth';

export const subjectRouter = Router();
subjectRouter.use(requireAuth);

const materiaSchema = z.object({
  nombre: z.string().min(1),
  nota: z.number().min(0).max(5),
});

/**
 * @openapi
 * /api/materias:
 *   get:
 *     summary: Lista las materias del estudiante autenticado
 *     tags: [Materias]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista de materias
 */
subjectRouter.get('/', async (req: AuthRequest, res) => {
  const result = await pool.query(
    'SELECT id, nombre, nota FROM materias WHERE usuario_id = $1 ORDER BY creado_en ASC',
    [req.usuarioId]
  );
  res.json(result.rows);
});

const materiasArraySchema = z.array(materiaSchema);

/**
 * @openapi
 * /api/materias:
 *   put:
 *     summary: Reemplaza TODAS las materias del estudiante en una sola operación
 *     description: >
 *       Pensado para el frontend actual, que maneja la lista de materias como un
 *       solo bloque (agregar/editar/eliminar localmente y guardar todo de una vez).
 *       Borra las materias existentes del usuario y crea las que llegan en el body,
 *       dentro de una misma transacción.
 *     tags: [Materias]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required: [nombre, nota]
 *               properties:
 *                 nombre: { type: string, example: "Bases de datos" }
 *                 nota: { type: number, example: 3.8 }
 *     responses:
 *       200:
 *         description: Lista de materias ya guardada, con sus id reales
 *       400:
 *         description: Datos inválidos
 */
subjectRouter.put('/', async (req: AuthRequest, res) => {
  const parsed = materiasArraySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos.', detalles: parsed.error.flatten() });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM materias WHERE usuario_id = $1', [req.usuarioId]);

    const creadas = [];
    for (const { nombre, nota } of parsed.data) {
      const result = await client.query(
        'INSERT INTO materias (usuario_id, nombre, nota) VALUES ($1, $2, $3) RETURNING id, nombre, nota',
        [req.usuarioId, nombre, nota]
      );
      creadas.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.json(creadas);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/**
 * @openapi
 * /api/materias:
 *   post:
 *     summary: Registra una nueva materia (RF-02)
 *     tags: [Materias]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, nota]
 *             properties:
 *               nombre: { type: string, example: "Bases de datos" }
 *               nota: { type: number, example: 3.8 }
 *     responses:
 *       201:
 *         description: Materia creada
 *       400:
 *         description: Datos inválidos (la nota debe estar entre 0.0 y 5.0)
 */
subjectRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = materiaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos.', detalles: parsed.error.flatten() });
  }
  const { nombre, nota } = parsed.data;
  const result = await pool.query(
    'INSERT INTO materias (usuario_id, nombre, nota) VALUES ($1, $2, $3) RETURNING id, nombre, nota',
    [req.usuarioId, nombre, nota]
  );
  res.status(201).json(result.rows[0]);
});

/**
 * @openapi
 * /api/materias/{id}:
 *   put:
 *     summary: Edita una materia existente
 *     tags: [Materias]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Materia actualizada
 *       404:
 *         description: Materia no encontrada para este usuario
 */
subjectRouter.put('/:id', async (req: AuthRequest, res) => {
  const parsed = materiaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos.', detalles: parsed.error.flatten() });
  }
  const { nombre, nota } = parsed.data;
  const result = await pool.query(
    `UPDATE materias SET nombre = $1, nota = $2
     WHERE id = $3 AND usuario_id = $4
     RETURNING id, nombre, nota`,
    [nombre, nota, req.params.id, req.usuarioId]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Materia no encontrada.' });
  }
  res.json(result.rows[0]);
});

/**
 * @openapi
 * /api/materias/{id}:
 *   delete:
 *     summary: Elimina una materia
 *     tags: [Materias]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Materia eliminada
 *       404:
 *         description: Materia no encontrada para este usuario
 */
subjectRouter.delete('/:id', async (req: AuthRequest, res) => {
  const result = await pool.query(
    'DELETE FROM materias WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.usuarioId]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Materia no encontrada.' });
  }
  res.status(204).send();
});
