import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import pool from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

async function registrarEvento(lead_id, user, tipo, detalle) {
  await pool.query(
    'INSERT INTO lead_eventos (lead_id, user_id, user_nombre, tipo, detalle) VALUES (?, ?, ?, ?, ?)',
    [lead_id, user?.id ?? null, user?.nombre ?? 'Sistema', tipo, detalle]
  );
}

// ── GET /leads/ubicaciones ────────────────────────────────────────────────────
router.get('/ubicaciones', requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT provincia, ciudad, parroquia FROM leads
     WHERE provincia IS NOT NULL AND provincia != ''
     ORDER BY provincia, ciudad, parroquia`
  );
  res.json(rows);
});

// ── GET /leads ────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { user } = req;
  const { provincia, ciudad, parroquia, institucion } = req.query;

  // Provincia + ciudad + parroquia son obligatorios para cargar leads
  if (!provincia || !ciudad || !parroquia) {
    return res.json([]);
  }

  const conditions = ['l.provincia = ?', 'l.ciudad = ?', 'l.parroquia = ?'];
  const params = [provincia, ciudad, parroquia];

  if (institucion) { conditions.push('l.institucion = ?'); params.push(institucion); }
  if (user.role !== 'admin') { conditions.push('l.asignado_a = ?'); params.push(user.id); }

  const where = 'WHERE ' + conditions.join(' AND ');
  const [rows] = await pool.query(
    `SELECT l.*, u.nombre as vendedor_nombre
     FROM leads l LEFT JOIN users u ON l.asignado_a = u.id
     ${where} ORDER BY l.updated_at DESC`,
    params
  );
  res.json(rows);
});

// ── GET /leads/:id/eventos ────────────────────────────────────────────────────
router.get('/:id/eventos', requireAuth, async (req, res) => {
  const [lead] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  if (!lead[0]) return res.status(404).json({ error: 'Lead no encontrado' });
  if (req.user.role !== 'admin' && lead[0].asignado_a !== req.user.id)
    return res.status(403).json({ error: 'Sin permiso' });

  const [rows] = await pool.query(
    'SELECT * FROM lead_eventos WHERE lead_id = ? ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json(rows);
});

// ── PATCH /leads/:id/estado ───────────────────────────────────────────────────
router.patch('/:id/estado', requireAuth, async (req, res) => {
  const { estado } = req.body;
  const valid = ['asignado', 'contactado', 'negociacion', 'ganado', 'perdido'];
  if (!valid.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

  const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  const lead = rows[0];
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
  if (req.user.role !== 'admin' && lead.asignado_a !== req.user.id)
    return res.status(403).json({ error: 'Sin permiso' });

  const LABEL = { asignado: 'Asignado', contactado: 'Contactado', negociacion: 'Negociación', ganado: 'Ganado', perdido: 'Perdido' };
  await pool.query('UPDATE leads SET estado = ? WHERE id = ?', [estado, req.params.id]);
  await registrarEvento(req.params.id, req.user, 'estado',
    `${LABEL[lead.estado] ?? lead.estado} → ${LABEL[estado]}`);
  res.json({ ok: true });
});

// ── PATCH /leads/:id/asignar ──────────────────────────────────────────────────
router.patch('/:id/asignar', requireAuth, requireAdmin, async (req, res) => {
  const { vendedor_id } = req.body;
  let nombreVendedor = 'Sin asignar';
  if (vendedor_id) {
    const [u] = await pool.query('SELECT nombre FROM users WHERE id = ?', [vendedor_id]);
    nombreVendedor = u[0]?.nombre ?? 'Desconocido';
  }
  await pool.query('UPDATE leads SET asignado_a = ?, estado = "asignado" WHERE id = ?', [vendedor_id, req.params.id]);
  await registrarEvento(req.params.id, req.user, 'asignacion',
    `Asignado a ${nombreVendedor}`);
  res.json({ ok: true });
});

// ── POST /leads/:id/nota ──────────────────────────────────────────────────────
router.post('/:id/nota', requireAuth, async (req, res) => {
  const { texto } = req.body;
  if (!texto?.trim()) return res.status(400).json({ error: 'El comentario no puede estar vacío' });

  const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  const lead = rows[0];
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
  if (req.user.role !== 'admin' && lead.asignado_a !== req.user.id)
    return res.status(403).json({ error: 'Sin permiso' });

  await registrarEvento(req.params.id, req.user, 'nota', texto.trim());
  res.json({ ok: true });
});

// ── DELETE /leads/:id ─────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ── POST /leads/upload ────────────────────────────────────────────────────────
router.post('/upload', requireAuth, requireAdmin, (req, res, next) => {
  upload.single('file')(req, res, err => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: `Error multer: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) return res.status(400).json({ error: 'El archivo está vacío' });

  const leads = rows.map(r => [
    String(r['Nombre'] || r['nombre'] || r['__EMPTY'] || r['__EMPTY_1'] || '').trim(),
    String(r['Teléfono'] || r['Telefono'] || r['telefono'] || '').trim(),
    String(r['Provincia'] || r['provincia'] || '').trim(),
    String(r['Ciudad'] || r['ciudad'] || '').trim(),
    String(r['Parroquia'] || r['parroquia'] || '').trim(),
    String(r['Dirección'] || r['Direccion'] || r['direccion'] || '').trim(),
    String(r['Institución'] || r['Institucion'] || r['institucion'] || '').trim(),
  ]).filter(([nombre]) => nombre);

  if (!leads.length) return res.status(400).json({ error: 'No se encontraron registros válidos' });

  const placeholders = leads.map(() => '(?,?,?,?,?,?,?)').join(',');
  const [result] = await pool.query(
    `INSERT INTO leads (nombre, telefono, provincia, ciudad, parroquia, direccion, institucion) VALUES ${placeholders}`,
    leads.flat()
  );

  // Registro de creación para cada lead importado
  const firstId = result.insertId;
  const eventRows = leads.map((_, i) => [
    firstId + i, null, 'Sistema', 'creacion', 'Lead creado por importación masiva',
  ]);
  const evPlaceholders = eventRows.map(() => '(?,?,?,?,?)').join(',');
  await pool.query(
    `INSERT INTO lead_eventos (lead_id, user_id, user_nombre, tipo, detalle) VALUES ${evPlaceholders}`,
    eventRows.flat()
  );

  res.json({ inserted: leads.length });
});

export default router;
