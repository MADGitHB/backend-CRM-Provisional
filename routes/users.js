import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAuth, requireAdmin, requireAdminOrGerente } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, usuario, email, role, ultimo_acceso, created_at FROM users ORDER BY nombre'
  );
  res.json(rows);
});

// Gerentes pueden obtener la lista de vendedores para asignar leads
router.get('/vendedores', requireAuth, requireAdminOrGerente, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, nombre FROM users WHERE role = 'vendedor' ORDER BY nombre"
  );
  res.json(rows);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { nombre, usuario, password, role } = req.body;
  if (!nombre || !usuario || !password) return res.status(400).json({ error: 'Campos requeridos: nombre, usuario, password' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (nombre, usuario, password, role) VALUES (?, ?, ?, ?)',
      [nombre, usuario, hash, role || 'vendedor']
    );
    res.status(201).json({ id: result.insertId, nombre, usuario, role: role || 'vendedor' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El usuario ya existe' });
    throw err;
  }
});

router.patch('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  const { role } = req.body;
  const valid = ['admin', 'gerente', 'vendedor'];
  if (!valid.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  if (Number(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
