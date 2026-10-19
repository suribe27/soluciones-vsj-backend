/**
 * Crea (o actualiza) los dos usuarios de prueba del equipo, con contraseña
 * real hasheada con bcryptjs. Pensado solo para desarrollo local / demo.
 *
 * Uso: npm run db:seed
 * Contraseña de ambos usuarios de prueba: VSJ2026!
 */
import bcrypt from 'bcryptjs';
import { pool } from './pool';

const PASSWORD_DEMO = 'VSJ2026!';

const USUARIOS_DEMO = [
  { correo: 'suribe893@soyudemedellin.edu.co', nombre: 'Samuel Uribe' },
  { correo: 'vmonsalve558@soyudemedellin.edu.co', nombre: 'Valery Monsalve' },
];

async function seed() {
  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);

  for (const u of USUARIOS_DEMO) {
    await pool.query(
      `INSERT INTO usuarios (correo_institucional, nombre, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (correo_institucional)
       DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [u.correo, u.nombre, passwordHash]
    );
    console.log(`[seed] Usuario listo: ${u.correo}`);
  }

  console.log(`[seed] Contraseña de prueba para ambos usuarios: ${PASSWORD_DEMO}`);
  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] Error creando usuarios de prueba:', err);
  process.exit(1);
});
