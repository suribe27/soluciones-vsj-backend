import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { authRouter } from './routes/authRoutes';
import { riskRouter } from './routes/riskRoutes';
import { subjectRouter } from './routes/subjectRoutes';
import { surveyRouter } from './routes/surveyRoutes';
import { swaggerSpec } from './swagger';

dotenv.config();

export function createApp() {
  const app = express();

  const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api/auth', authRouter);
  app.use('/api/materias', subjectRouter);
  app.use('/api/encuesta', surveyRouter);
  app.use('/api/riesgo', riskRouter);

  // Manejador de errores centralizado
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  });

  return app;
}
