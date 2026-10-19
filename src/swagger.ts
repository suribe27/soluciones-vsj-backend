import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Soluciones VSJ — Alerta Temprana API',
      version: '1.0.0',
      description:
        'API REST del backend de Soluciones VSJ. Expone autenticación con JWT, gestión de materias, ' +
        'encuesta de bienestar y cálculo del puntaje de riesgo académico-emocional.',
    },
    servers: [{ url: '/', description: 'Raíz de la API' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
});
