import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-este-secreto-en-produccion';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const DOMINIO_INSTITUCIONAL = '@soyudemedellin.edu.co';

export interface UsuarioRow {
  id: string;
  correo_institucional: string;
  nombre: string;
  password_hash: string;
}

export function validarDominioInstitucional(correo: string): boolean {
  // RN-01: solo correos institucionales @soyudemedellin.edu.co
  return correo.toLowerCase().endsWith(DOMINIO_INSTITUCIONAL);
}

export async function registrarUsuario(correo: string, nombre: string, password: string): Promise<UsuarioRow> {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query<UsuarioRow>(
    `INSERT INTO usuarios (correo_institucional, nombre, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, correo_institucional, nombre, password_hash`,
    [correo.toLowerCase(), nombre, passwordHash]
  );
  return result.rows[0];
}

export async function buscarUsuarioPorCorreo(correo: string): Promise<UsuarioRow | null> {
  const result = await pool.query<UsuarioRow>(
    'SELECT id, correo_institucional, nombre, password_hash FROM usuarios WHERE correo_institucional = $1',
    [correo.toLowerCase()]
  );
  return result.rows[0] ?? null;
}

export async function validarPassword(usuario: UsuarioRow, password: string): Promise<boolean> {
  return bcrypt.compare(password, usuario.password_hash);
}

export function generarToken(usuario: Pick<UsuarioRow, 'id' | 'correo_institucional'>): string {
  return jwt.sign(
    { sub: usuario.id, correo: usuario.correo_institucional },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

export interface TokenPayload {
  sub: string;
  correo: string;
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
