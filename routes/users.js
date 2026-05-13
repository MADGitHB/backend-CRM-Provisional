import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT id, nombre, email, role, created_at FROM users ORDER BY nombre');
  res.json(rows);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { nombre, email, password, role } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Campos requeridos: nombre, email, password' });
  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO users (nombre, email, password, role) VALUES (?, ?, ?, ?)',
    [nombre, email, hash, role || 'vendedor']
  );
  res.status(201).json({ id: result.insertId, nombre, email, role: role || 'vendedor' });
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
