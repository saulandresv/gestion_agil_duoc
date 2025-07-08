-- SQLite Schema for Inventory Management System
-- Converted from PostgreSQL schema

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- 1) Drop existing tables and views if they exist
DROP VIEW IF EXISTS current_stock;
DROP TABLE IF EXISTS sync_queue;
DROP TABLE IF EXISTS movements;
DROP TABLE IF EXISTS request_items;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS rfid_logs;
DROP TABLE IF EXISTS user_relations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS location_products;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS shifts;

-- 2) Create tables in order of dependencies:

-- 2.1 Shifts
CREATE TABLE shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  start_time TEXT,
  end_time TEXT,
  cycle_start_day TEXT NOT NULL,
  cycle_end_day TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 Locations
CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.3 Categories
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.4 Products (FK → categories)
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  is_returnable BOOLEAN NOT NULL DEFAULT 0,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.5 Stock by location (FK → locations, products)
CREATE TABLE location_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  UNIQUE(location_id, product_id)
);

-- 2.6 Users (FK → shifts)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','operador','supervisor','storekeeper')),
  shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.7 User relations (FK → users)
CREATE TABLE user_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('manager','supervisor')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.8 RFID logs (FK → users)
CREATE TABLE rfid_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rfid_tag TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('login','logout','access')),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.9 Requests (FK → users, locations, products)
CREATE TABLE requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storekeeper_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('pendiente','aprobada','rechazada','completada')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT
);

-- 2.10 Request items (FK → requests, products)
CREATE TABLE request_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL
);

-- 2.11 Movements (FK → users, products, requests, locations)
CREATE TABLE movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storekeeper_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  requesting_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('entrada','salida')),
  quantity INTEGER NOT NULL,
  serial_number TEXT,
  seal TEXT,
  reference TEXT,
  request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.12 Sync queue (no external dependencies)
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('insert','update','delete')),
  payload TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','synced','error')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.13 Stock reservations (optional table for stock management)
CREATE TABLE stock_reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL CHECK(status IN ('active','released','consumed')) DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP
);

-- 2.14 Current stock view
CREATE VIEW current_stock AS
SELECT
  lp.location_id,
  l.name AS location_name,
  lp.product_id,
  p.name AS product_name,
  lp.stock,
  lp.minimum_stock
FROM location_products lp
JOIN locations l ON l.id = lp.location_id
JOIN products p ON p.id = lp.product_id;

-- Insert sample data
INSERT INTO locations (code, name, description) VALUES
  ('CR', 'Chancado Rosario', 'Primary crushing area');

INSERT INTO shifts (code, start_time, end_time, cycle_start_day, cycle_end_day) VALUES
('G21', '07:00', '19:00', 'Thursday', 'Wednesday'),
('G22', '19:00', '07:00', 'Thursday', 'Wednesday');

-- Categories
INSERT INTO categories (name, description) VALUES
('Herramientas', 'Herramientas manuales y eléctricas'),
('EPP', 'Elementos de Protección Personal'),
('Consumibles', 'Materiales de consumo y desgaste');

-- Products (sample - use 1 for TRUE, 0 for FALSE in SQLite)
INSERT INTO products (sku, name, description, unit, is_returnable, category_id) VALUES
('SKU0001', 'Martillo perforador SDS-Max', 'Martillo eléctrico para perforación de roca', 'EA', 1, 1),
('SKU0002', 'Taladro neumático 1"', 'Taladro de impacto para barrenos cortos', 'EA', 1, 1),
('SKU0003', 'Barreta minera 1,5 m', 'Palanca de acero templado', 'EA', 1, 1),
('SKU0004', 'Llave Stilson 24"', 'Llave ajustable para tuberías', 'EA', 1, 1),
('SKU0005', 'Llave Impacto 1/2"', 'Llave de impacto eléctrica', 'EA', 1, 1),
('SKU0041', 'Casco seguridad clase E', 'Casco dieléctrico color amarillo', 'EA', 1, 2),
('SKU0042', 'Protector auditivo tipo copa', 'Orejeras 27 dB NRR', 'EA', 1, 2),
('SKU0071', 'Broca SDS-Plus 14 mm', 'Broca perforación concreto', 'EA', 0, 3),
('SKU0072', 'Disco corte metal 7"', 'Disco abrasivo acero', 'EA', 0, 3),
('SKU0073', 'Disco flap 4-1/2" gr 80', 'Disco láminas pulido', 'EA', 0, 3);

-- Sample users
INSERT INTO users (username, full_name, password_hash, role, shift_id) VALUES
('admin', 'Administrator', 'hash', 'admin', 1),
('juan.garcia', 'Juan García', 'hash', 'admin', 1),
('manuel.reyes', 'Manuel Reyes', 'hash', 'supervisor', 1),
('andres.leon', 'Andrés León', 'hash', 'storekeeper', 1),
('andres.perez', 'Andrés Pérez', 'hash', 'operador', 1);

-- Sample stock
INSERT INTO location_products (location_id, product_id, stock, minimum_stock) VALUES
(1, 1, 5, 2),
(1, 2, 3, 1),
(1, 3, 8, 3),
(1, 4, 4, 2),
(1, 5, 6, 2),
(1, 6, 20, 5),
(1, 7, 15, 3),
(1, 8, 50, 10),
(1, 9, 30, 8),
(1, 10, 25, 6);

-- Sample movements
INSERT INTO movements (storekeeper_id, supervisor_id, product_id, type, quantity, reference, location_id) VALUES
(4, 3, 1, 'entrada', 10, 'Initial stock', 1),
(4, 3, 1, 'salida', 2, 'Tool checkout', 1),
(4, 3, 6, 'salida', 5, 'PPE issuance', 1);