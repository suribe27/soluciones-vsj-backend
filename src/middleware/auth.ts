import { NextFunction, Request, Response } from 'express';
import { verificarToken } from '../services/authService';

export interface AuthRequest extends Request {
  usuarioId?: string;
  correo?: string;
}

/**
 * Middleware RF-05 / RN-01: exige un token JWT válido (reemplaza la sesión
 * guardada en localStorage por autenticación basada en token, como pedía el
 * criterio de éxito del semestre en la ficha técnica).
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación faltante.' });
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = verificarToken(token);
    req.usuarioId = payload.sub;
    req.correo = payload.correo;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}
