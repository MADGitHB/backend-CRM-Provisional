import bcrypt from 'bcryptjs';
import pool from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const users = [
  { nombre: 'Administrador', usuario: '1724994973', email: 'admin@crm.com',     password: 'admin123',    role: 'admin' },
  { nombre: 'Juan Vendedor',  usuario: 'jvendedor',  email: 'vendedor@crm.com',  password: 'vendedor123', role: 'vendedor' },
];

for (const u of users) {
  const hash = await bcrypt.hash(u.password, 10);
  await pool.query(
    'INSERT IGNORE INTO users (nombre, usuario, email, password, role) VALUES (?, ?, ?, ?, ?)',
    [u.nombre, u.usuario, u.email, hash, u.role]
  );
  console.log(`✓ ${u.usuario} (${u.role})`);
}

console.log('Seed completado.');
process.exit(0);
