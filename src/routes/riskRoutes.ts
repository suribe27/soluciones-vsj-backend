import { Router } from 'express';
import { pool } from '../db/pool';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { calcularNotasScore, calcularSurveyScore, clasificarRiesgo } from '../services/riskService';

export const riskRouter = Router();
riskRouter.use(requireAuth);

/**
 * @openapi
 * /api/riesgo:
 *   get:
 *     summary: Calcula el puntaje de riesgo actual del estudiante (RF-05, RF-06)
 *     description: >
 *       El puntaje nunca se guarda en la base de datos; siempre se recalcula a
 *       partir de las notas vigentes y la última encuesta (ver sección 5.3 del
 *       documento de análisis).
 *     tags: [Riesgo]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Puntaje, nivel de riesgo y recomendación
 */
riskRouter.get('/', async (req: AuthRequest, res) => {
  const materias = await pool.query('SELECT nota FROM materias WHERE usuario_id = $1', [req.usuarioId]);
  const encuesta = await pool.query(
    `SELECT re.valor FROM respuestas_encuesta re
     JOIN encuestas e ON e.id = re.encuesta_id
     WHERE e.usuario_id = $1
     ORDER BY re.pregunta_id ASC`,
    [req.usuarioId]
  );

  const notas = materias.rows.map((r) => ({ nota: Number(r.nota) }));
  const respuestas = encuesta.rows.map((r) => Number(r.valor));

  const notasScore = calcularNotasScore(notas);
  const surveyScore = calcularSurveyScore(respuestas);
  const finalScore = Math.round(notasScore + surveyScore);

  const { nivel, recomendacion, mostrarContacto } = clasificarRiesgo(finalScore);

  res.json({
    puntaje: finalScore,
    notasScore: Math.round(notasScore),
    surveyScore: Math.round(surveyScore),
    nivel,
    recomendacion,
    mostrarContacto,
  });
});
