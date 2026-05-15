import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import pool from '../db.js';
import { requireAuth, requireAdmin, requireAdminOrGerente } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

async function registrarEvento(lead_id, user, tipo, detalle) {
  await pool.query(
    'INSERT INTO lead_eventos (lead_id, user_id, user_nombre, tipo, detalle) VALUES (?, ?, ?, ?, ?)',
    [lead_id, user?.id ?? null, user?.nombre ?? 'Sistema', tipo, detalle]
  );
}

async function buildGerenteWhere(gerente_id) {
  const [territorios] = await pool.query(
    'SELECT tipo, valor FROM gerente_territorios WHERE gerente_id = ?',
    [gerente_id]
  );
  if (!territorios.length) return null;
  const colMap = { provincia: 'l.provincia', canton: 'l.ciudad', parroquia: 'l.parroquia', institucion: 'l.institucion' };
  const conditions = territorios.map(t => `${colMap[t.tipo]} = ?`);
  const params = territorios.map(t => t.valor);
  return { where: `(${conditions.join(' OR ')})`, params };
}

// ── GET /leads/ubicaciones ────────────────────────────────────────────────────
router.get('/ubicaciones', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT provincia, ciudad, parroquia FROM leads
       WHERE provincia IS NOT NULL AND provincia != ''
       ORDER BY provincia, ciudad, parroquia`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar ubicaciones' });
  }
});

// ── GET /leads ────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { user } = req;
    const { provincia, ciudad, parroquia, institucion } = req.query;

    if (user.role === 'vendedor') {
      const [rows] = await pool.query(
        `SELECT l.*, u.nombre as vendedor_nombre
         FROM leads l LEFT JOIN users u ON l.asignado_a = u.id
         WHERE l.asignado_a = ? ORDER BY l.updated_at DESC`,
        [user.id]
      );
      return res.json(rows);
    }

    if (user.role === 'gerente') {
      const geo = await buildGerenteWhere(user.id);
      if (!geo) return res.json([]);
      const [rows] = await pool.query(
        `SELECT l.*, u.nombre as vendedor_nombre
         FROM leads l LEFT JOIN users u ON l.asignado_a = u.id
         WHERE ${geo.where} ORDER BY l.updated_at DESC`,
        geo.params
      );
      return res.json(rows);
    }

    if (!provincia || !ciudad || !parroquia) return res.json([]);

    const conditions = [];
    const params = [];
    if (provincia)   { conditions.push('l.provincia = ?');   params.push(provincia); }
    if (ciudad)      { conditions.push('l.ciudad = ?');      params.push(ciudad); }
    if (parroquia)   { conditions.push('l.parroquia = ?');   params.push(parroquia); }
    if (institucion) { conditions.push('l.institucion = ?'); params.push(institucion); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [rows] = await pool.query(
      `SELECT l.*, u.nombre as vendedor_nombre
       FROM leads l LEFT JOIN users u ON l.asignado_a = u.id
       ${where} ORDER BY l.updated_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar leads' });
  }
});

// ── GET /leads/:id/eventos ────────────────────────────────────────────────────
router.get('/:id/eventos', requireAuth, async (req, res) => {
  try {
    const [lead] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!lead[0]) return res.status(404).json({ error: 'Lead no encontrado' });

    const { user } = req;
    if (user.role === 'vendedor' && lead[0].asignado_a !== user.id)
      return res.status(403).json({ error: 'Sin permiso' });

    if (user.role === 'gerente') {
      const geo = await buildGerenteWhere(user.id);
      if (!geo) return res.status(403).json({ error: 'Sin territorios asignados' });
      const [check] = await pool.query(
        `SELECT id FROM leads WHERE id = ? AND ${geo.where}`,
        [req.params.id, ...geo.params]
      );
      if (!check[0]) return res.status(403).json({ error: 'Sin permiso' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM lead_eventos WHERE lead_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar eventos' });
  }
});

// ── PATCH /leads/:id/estado ───────────────────────────────────────────────────
router.patch('/:id/estado', requireAuth, async (req, res) => {
  try {
    const { estado } = req.body;
    const valid = ['asignado', 'contactado', 'negociacion', 'ganado', 'perdido'];
    if (!valid.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

    const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    const lead = rows[0];
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

    const { user } = req;
    if (user.role === 'vendedor' && lead.asignado_a !== user.id)
      return res.status(403).json({ error: 'Sin permiso' });

    const LABEL = { asignado: 'Asignado', contactado: 'Contactado', negociacion: 'Negociación', ganado: 'Ganado', perdido: 'Perdido' };
    await pool.query('UPDATE leads SET estado = ? WHERE id = ?', [estado, req.params.id]);
    await registrarEvento(req.params.id, user, 'estado',
      `${LABEL[lead.estado] ?? lead.estado} → ${LABEL[estado]}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// ── PATCH /leads/:id/asignar ──────────────────────────────────────────────────
router.patch('/:id/asignar', requireAuth, requireAdminOrGerente, async (req, res) => {
  try {
    const { vendedor_id } = req.body;
    const { user } = req;

    if (user.role === 'gerente') {
      const geo = await buildGerenteWhere(user.id);
      if (!geo) return res.status(403).json({ error: 'Sin territorios asignados' });
      const [check] = await pool.query(
        `SELECT id FROM leads WHERE id = ? AND ${geo.where}`,
        [req.params.id, ...geo.params]
      );
      if (!check[0]) return res.status(403).json({ error: 'Este lead no pertenece a tus territorios' });
    }

    let nombreVendedor = 'Sin asignar';
    if (vendedor_id) {
      const [u] = await pool.query('SELECT nombre FROM users WHERE id = ?', [vendedor_id]);
      nombreVendedor = u[0]?.nombre ?? 'Desconocido';
    }
    await pool.query('UPDATE leads SET asignado_a = ?, estado = "asignado" WHERE id = ?', [vendedor_id, req.params.id]);
    await registrarEvento(req.params.id, user, 'asignacion', `Asignado a ${nombreVendedor}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al asignar lead' });
  }
});

// ── PATCH /leads/asignar-masivo ───────────────────────────────────────────────
router.patch('/asignar-masivo', requireAuth, requireAdminOrGerente, async (req, res) => {
  try {
    const { lead_ids, vendedor_id } = req.body;
    if (!Array.isArray(lead_ids) || !lead_ids.length)
      return res.status(400).json({ error: 'lead_ids requerido' });

    const { user } = req;

    if (user.role === 'gerente') {
      const geo = await buildGerenteWhere(user.id);
      if (!geo) return res.status(403).json({ error: 'Sin territorios asignados' });
      const placeholders = lead_ids.map(() => '?').join(',');
      const [check] = await pool.query(
        `SELECT id FROM leads WHERE id IN (${placeholders}) AND ${geo.where}`,
        [...lead_ids, ...geo.params]
      );
      if (check.length !== lead_ids.length)
        return res.status(403).json({ error: 'Algunos leads no pertenecen a tus territorios' });
    }

    let nombreVendedor = 'Sin asignar';
    if (vendedor_id) {
      const [u] = await pool.query('SELECT nombre FROM users WHERE id = ?', [vendedor_id]);
      nombreVendedor = u[0]?.nombre ?? 'Desconocido';
    }

    const placeholders = lead_ids.map(() => '?').join(',');
    await pool.query(
      `UPDATE leads SET asignado_a = ?, estado = "asignado" WHERE id IN (${placeholders})`,
      [vendedor_id, ...lead_ids]
    );

    const eventRows = lead_ids.map(id => [id, user.id, user.nombre, 'asignacion', `Asignado a ${nombreVendedor}`]);
    const evPh = eventRows.map(() => '(?,?,?,?,?)').join(',');
    await pool.query(
      `INSERT INTO lead_eventos (lead_id, user_id, user_nombre, tipo, detalle) VALUES ${evPh}`,
      eventRows.flat()
    );

    res.json({ ok: true, updated: lead_ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al asignar leads' });
  }
});

// ── POST /leads/:id/nota ──────────────────────────────────────────────────────
router.post('/:id/nota', requireAuth, async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error: 'El comentario no puede estar vacío' });

    const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    const lead = rows[0];
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
    if (req.user.role === 'vendedor' && lead.asignado_a !== req.user.id)
      return res.status(403).json({ error: 'Sin permiso' });

    await registrarEvento(req.params.id, req.user, 'nota', texto.trim());
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar nota' });
  }
});

// ── DELETE /leads/:id ─────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar lead' });
  }
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
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar archivo' });
  }
});

export default router;
