import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import pool from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', requireAuth, async (req, res) => {
  const { user } = req;
  let query, params;
  if (user.role === 'admin') {
    query = `SELECT l.*, u.nombre as vendedor_nombre
             FROM leads l LEFT JOIN users u ON l.asignado_a = u.id
             ORDER BY l.updated_at DESC`;
    params = [];
  } else {
    query = `SELECT l.*, u.nombre as vendedor_nombre
             FROM leads l LEFT JOIN users u ON l.asignado_a = u.id
             WHERE l.asignado_a = ?
             ORDER BY l.updated_at DESC`;
    params = [user.id];
  }
  const [rows] = await pool.query(query, params);
  res.json(rows);
});

router.patch('/:id/estado', requireAuth, async (req, res) => {
  const { estado } = req.body;
  const valid = ['asignado', 'contactado', 'negociacion', 'ganado', 'perdido'];
  if (!valid.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

  const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  const lead = rows[0];
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
  if (req.user.role !== 'admin' && lead.asignado_a !== req.user.id)
    return res.status(403).json({ error: 'Sin permiso' });

  await pool.query('UPDATE leads SET estado = ? WHERE id = ?', [estado, req.params.id]);
  res.json({ ok: true });
});

router.patch('/:id/asignar', requireAuth, requireAdmin, async (req, res) => {
  const { vendedor_id } = req.body;
  await pool.query('UPDATE leads SET asignado_a = ?, estado = "asignado" WHERE id = ?', [vendedor_id, req.params.id]);
  res.json({ ok: true });
});

router.patch('/:id/notas', requireAuth, async (req, res) => {
  const { notas } = req.body;
  const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  const lead = rows[0];
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
  if (req.user.role !== 'admin' && lead.asignado_a !== req.user.id)
    return res.status(403).json({ error: 'Sin permiso' });
  await pool.query('UPDATE leads SET notas = ? WHERE id = ?', [notas, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

router.post('/upload', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) return res.status(400).json({ error: 'El archivo está vacío' });

  const leads = rows.map(r => [
    String(r['Nombre'] || r['nombre'] || '').trim(),
    String(r['Teléfono'] || r['Telefono'] || r['telefono'] || '').trim(),
    String(r['Provincia'] || r['provincia'] || '').trim(),
    String(r['Ciudad'] || r['ciudad'] || '').trim(),
    String(r['Parroquia'] || r['parroquia'] || '').trim(),
    String(r['Dirección'] || r['Direccion'] || r['direccion'] || '').trim(),
    String(r['Institución'] || r['Institucion'] || r['institucion'] || '').trim(),
  ]).filter(([nombre]) => nombre);

  if (!leads.length) return res.status(400).json({ error: 'No se encontraron registros válidos' });

  const placeholders = leads.map(() => '(?,?,?,?,?,?,?)').join(',');
  const flat = leads.flat();
  await pool.query(
    `INSERT INTO leads (nombre, telefono, provincia, ciudad, parroquia, direccion, institucion) VALUES ${placeholders}`,
    flat
  );

  res.json({ inserted: leads.length });
});

export default router;
