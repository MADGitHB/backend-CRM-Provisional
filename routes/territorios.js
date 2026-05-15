import { Router } from 'express';
import pool from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /territorios — admin: todos; gerente: los suyos
router.get('/', requireAuth, async (req, res) => {
  const { user } = req;
  if (user.role === 'admin') {
    const [rows] = await pool.query(
      `SELECT gt.*, u.nombre as gerente_nombre
       FROM gerente_territorios gt
       JOIN users u ON gt.gerente_id = u.id
       ORDER BY u.nombre, gt.tipo, gt.valor`
    );
    return res.json(rows);
  }
  if (user.role === 'gerente') {
    const [rows] = await pool.query(
      'SELECT * FROM gerente_territorios WHERE gerente_id = ? ORDER BY tipo, valor',
      [user.id]
    );
    return res.json(rows);
  }
  res.status(403).json({ error: 'Acceso no permitido' });
});

// POST /territorios — admin asigna territorio a gerente
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { gerente_id, tipo, valor } = req.body;
  if (!gerente_id || !tipo || !valor?.trim())
    return res.status(400).json({ error: 'gerente_id, tipo y valor son requeridos' });

  const tiposValidos = ['provincia', 'canton', 'parroquia', 'institucion'];
  if (!tiposValidos.includes(tipo))
    return res.status(400).json({ error: 'tipo inválido' });

  // Verificar que el usuario es gerente
  const [u] = await pool.query('SELECT id, nombre FROM users WHERE id = ? AND role = "gerente"', [gerente_id]);
  if (!u[0]) return res.status(404).json({ error: 'Gerente no encontrado' });

  try {
    const [result] = await pool.query(
      'INSERT INTO gerente_territorios (gerente_id, tipo, valor) VALUES (?, ?, ?)',
      [gerente_id, tipo, valor.trim()]
    );
    res.status(201).json({ id: result.insertId, gerente_id, tipo, valor: valor.trim(), gerente_nombre: u[0].nombre });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Este territorio ya está asignado a ese gerente' });
    throw err;
  }
});

// DELETE /territorios/:id — admin quita un territorio
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM gerente_territorios WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// GET /territorios/ubicaciones — valores disponibles para asignar (de los leads existentes)
router.get('/ubicaciones', requireAuth, requireAdmin, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT provincia, ciudad, parroquia, institucion FROM leads
     WHERE provincia IS NOT NULL AND provincia != ''
     ORDER BY provincia, ciudad, parroquia`
  );
  res.json(rows);
});

export default router;
