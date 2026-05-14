import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const [rows] = await pool.query('SELECT * FROM users WHERE usuario = ?', [usuario]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

  // Registrar último acceso
  await pool.query('UPDATE users SET ultimo_acceso = NOW() WHERE id = ?', [user.id]);

  const token = jwt.sign(
    { id: user.id, usuario: user.usuario, nombre: user.nombre, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, nombre: user.nombre, usuario: user.usuario, role: user.role } });
});

export default router;
