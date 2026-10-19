import { Router } from 'express';
import { z } from 'zod';
import {
  buscarUsuarioPorCorreo,
  generarToken,
  registrarUsuario,
  validarDominioInstitucional,
  validarPassword,
} from '../services/authService';

export const authRouter = Router();

const registroSchema = z.object({
  correo: z.string().email(),
  nombre: z.string().min(1),
  password: z.string().min(6),
});

const loginSchema = z.object({
  correo: z.string().email(),
  password: z.string().min(1),
});

/**
 * @openapi
 * /api/auth/registro:
 *   post:
 *     summary: Registra un nuevo estudiante (correo institucional obligatorio)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo, nombre, password]
 *             properties:
 *               correo:
 *                 type: string
 *                 example: suribe893@soyudemedellin.edu.co
 *               nombre:
 *                 type: string
 *                 example: Samuel Uribe
 *               password:
 *                 type: string
 *                 example: VSJ2026!
 *     responses:
 *       201:
 *         description: Usuario creado y token emitido
 *       400:
 *         description: Datos inválidos o correo fuera del dominio institucional
 *       409:
 *         description: El correo ya está registrado
 */
authRouter.post('/registro', async (req, res) => {
  const parsed = registroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos.', detalles: parsed.error.flatten() });
  }
  const { correo, nombre, password } = parsed.data;

  // RN-01
  if (!validarDominioInstitucional(correo)) {
    return res.status(400).json({ error: 'Debes usar tu correo institucional @soyudemedellin.edu.co' });
  }

  const existente = await buscarUsuarioPorCorreo(correo);
  if (existente) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }

  const usuario = await registrarUsuario(correo, nombre, password);
  const token = generarToken(usuario);
  return res.status(201).json({
    token,
    usuario: { id: usuario.id, correo: usuario.correo_institucional, nombre: usuario.nombre },
  });
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión con correo institucional y contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo, password]
 *             properties:
 *               correo:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso, devuelve un token JWT
 *       400:
 *         description: Correo fuera del dominio institucional
 *       401:
 *         description: Credenciales inválidas
 */
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Por favor completa todos los campos.' });
  }
  const { correo, password } = parsed.data;

  // RN-01
  if (!validarDominioInstitucional(correo)) {
    return res.status(400).json({ error: 'Debes usar tu correo institucional @soyudemedellin.edu.co' });
  }

  const usuario = await buscarUsuarioPorCorreo(correo);
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const passwordOk = await validarPassword(usuario, password);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const token = generarToken(usuario);
  return res.json({
    token,
    usuario: { id: usuario.id, correo: usuario.correo_institucional, nombre: usuario.nombre },
  });
});
