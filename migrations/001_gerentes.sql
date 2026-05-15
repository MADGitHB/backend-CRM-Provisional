-- Migración: añadir rol gerente y tabla de territorios asignados

-- 1. Añadir 'gerente' al ENUM de role en users
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'gerente', 'vendedor') NOT NULL DEFAULT 'vendedor';

-- 2. Tabla de territorios asignados a gerentes
CREATE TABLE IF NOT EXISTS gerente_territorios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gerente_id INT NOT NULL,
  tipo ENUM('provincia', 'canton', 'parroquia', 'institucion') NOT NULL,
  valor VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gerente_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_gerente_territorio (gerente_id, tipo, valor)
);
