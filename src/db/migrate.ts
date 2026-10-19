/**
 * Ejecuta el esquema db/schema.sql contra la base de datos indicada en DATABASE_URL.
 * Uso: npm run db:migrate
 */
import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function migrate() {
  const schemaPath = path.resolve(__dirname, '../../../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('[migrate] Aplicando esquema desde', schemaPath);
  await pool.query(sql);
  console.log('[migrate] Esquema aplicado correctamente.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[migrate] Error aplicando el esquema:', err);
  process.exit(1);
});
