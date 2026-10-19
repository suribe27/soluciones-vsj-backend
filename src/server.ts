import { createApp } from './app';

const PORT = process.env.PORT || 4000;
const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] Soluciones VSJ backend escuchando en el puerto ${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[server] Documentación Swagger disponible en http://localhost:${PORT}/api-docs`);
});
