import { Router } from 'express';
import pool from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /stats — dashboard de métricas para admin
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
  const [
    [totales],
    [porEstado],
    [porProvincia],
    [porVendedor],
    [porGerente],
    [sinAsignar],
    [recientes],
    [actividad],
  ] = await Promise.all([
    // Total general
    pool.query('SELECT COUNT(*) as total FROM leads'),

    // Por estado
    pool.query(
      `SELECT estado, COUNT(*) as total FROM leads GROUP BY estado ORDER BY total DESC`
    ),

    // Top 10 provincias
    pool.query(
      `SELECT provincia, COUNT(*) as total FROM leads
       WHERE provincia IS NOT NULL AND provincia != ''
       GROUP BY provincia ORDER BY total DESC LIMIT 10`
    ),

    // Por vendedor (top 15)
    pool.query(
      `SELECT u.nombre as vendedor, u.id as vendedor_id, COUNT(l.id) as total,
              SUM(l.estado = 'ganado') as ganados,
              SUM(l.estado = 'perdido') as perdidos
       FROM users u LEFT JOIN leads l ON l.asignado_a = u.id
       WHERE u.role = 'vendedor'
       GROUP BY u.id, u.nombre ORDER BY total DESC LIMIT 15`
    ),

    // Por gerente (territorios)
    pool.query(
      `SELECT u.nombre as gerente, u.id as gerente_id,
              COUNT(DISTINCT gt.id) as num_territorios,
              COUNT(DISTINCT l.id) as total_leads,
              SUM(l.estado = 'ganado') as ganados
       FROM users u
       LEFT JOIN gerente_territorios gt ON gt.gerente_id = u.id
       LEFT JOIN leads l ON (
         (gt.tipo = 'provincia'  AND l.provincia  = gt.valor) OR
         (gt.tipo = 'canton'     AND l.ciudad     = gt.valor) OR
         (gt.tipo = 'parroquia'  AND l.parroquia  = gt.valor) OR
         (gt.tipo = 'institucion' AND l.institucion = gt.valor)
       )
       WHERE u.role = 'gerente'
       GROUP BY u.id, u.nombre ORDER BY total_leads DESC`
    ),

    // Sin asignar
    pool.query(
      `SELECT COUNT(*) as total FROM leads WHERE asignado_a IS NULL`
    ),

    // Últimos 30 días: leads creados por día
    pool.query(
      `SELECT DATE(created_at) as fecha, COUNT(*) as total
       FROM leads
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at) ORDER BY fecha ASC`
    ),

    // Últimas 20 acciones del sistema
    pool.query(
      `SELECT le.*, l.nombre as lead_nombre
       FROM lead_eventos le
       JOIN leads l ON le.lead_id = l.id
       ORDER BY le.created_at DESC LIMIT 20`
    ),
  ]);

  res.json({
    total: totales[0].total,
    sinAsignar: sinAsignar[0].total,
    porEstado,
    porProvincia,
    porVendedor,
    porGerente,
    recientes,
    actividad,
  });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Error al cargar estadísticas. Verifica que la migración 001_gerentes.sql fue ejecutada.' });
  }
});

export default router;
