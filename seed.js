/**
 * Crea usuarios iniciales en la BD.
 * Ejecutar UNA VEZ después de crear la base de datos:
 *   node seed.js
 */
import bcrypt from 'bcryptjs';
import pool from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const users = [
  { nombre: 'Administrador', email: 'admin@crm.com', password: 'admin123', role: 'admin' },
  { nombre: 'Juan Vendedor',  email: 'vendedor@crm.com', password: 'vendedor123', role: 'vendedor' },
];

for (const u of users) {
  const hash = await bcrypt.hash(u.password, 10);
  await pool.query(
    'INSERT IGNORE INTO users (nombre, email, password, role) VALUES (?, ?, ?, ?)',
    [u.nombre, u.email, hash, u.role]
  );
  console.log(`✓ ${u.email} (${u.role})`);
}

console.log('Seed completado.');
process.exit(0);
