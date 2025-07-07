-- 1) Limpia viejas tablas y vistas (si existen)
DROP VIEW IF EXISTS current_stock;
DROP TABLE IF EXISTS
  sync_queue,
  movements,
  request_items,
  requests,
  rfid_logs,
  user_relations,
  users,
  location_products,
  products,
  categories,
  locations,
  shifts
CASCADE;

-- 2) Ahora crea las tablas en orden de dependencias:

-- 2.1 Turnos
CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  start_time TIME,
  end_time TIME,
  cycle_start_day TEXT NOT NULL,
  cycle_end_day TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 Ubicaciones
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.3 Categorías
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.4 Productos (FK → categories)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  is_returnable BOOLEAN NOT NULL DEFAULT FALSE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.5 Stock por ubicación (FK → locations, products)
CREATE TABLE location_products (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  UNIQUE(location_id, product_id)
);

-- 2.6 Usuarios (FK → shifts)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','operador','supervisor','storekeeper')),
  shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.7 Relaciones entre usuarios (FK → users)
CREATE TABLE user_relations (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('manager','supervisor')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.8 Registros RFID (FK → users)
CREATE TABLE rfid_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rfid_tag TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('login','logout','access')),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.9 Solicitudes (FK → users, locations, products)
CREATE TABLE requests (
  id SERIAL PRIMARY KEY,
  storekeeper_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  supervisor_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  location_id    INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  product_id     INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK(status IN ('pendiente','aprobada','rechazada','completada')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- 2.10 Items de solicitud (FK → requests, products)
CREATE TABLE request_items (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL
);

-- 2.11 Movimientos (FK → users, products, requests, locations)
CREATE TABLE movements (
  id SERIAL PRIMARY KEY,
  storekeeper_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  supervisor_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  requesting_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  product_id     INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('entrada','salida')),
  quantity INTEGER NOT NULL,
  serial_number TEXT,
  seal TEXT,
  reference TEXT,
  request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.12 Cola de sincronización (sin dependencias externas)
CREATE TABLE sync_queue (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('insert','update','delete')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','synced','error')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.13 Vista de stock actual
CREATE OR REPLACE VIEW current_stock AS
SELECT
  lp.location_id,
  l.name      AS location_name,
  lp.product_id,
  p.name      AS product_name,
  lp.stock,
  lp.minimum_stock
FROM location_products lp
JOIN locations l  ON l.id = lp.location_id
JOIN products  p  ON p.id = lp.product_id;


INSERT INTO locations (code, name, description) VALUES
  ('CR', 'Chancado Rosario', 'Primary crushing area');

-- Inserciones de ejemplo (shifts, categories, products, users, relaciones, etc.)
-- Asegúrate de ajustar las funciones de fecha para PostgreSQL (e.g. NOW() en lugar de NOW())

INSERT INTO shifts (code, start_time, end_time, cycle_start_day, cycle_end_day) VALUES
('G21', '07:00', '19:00', 'Thursday', 'Wednesday'),
('G22', '19:00', '07:00', 'Thursday', 'Wednesday');

-- Y así sucesivamente para el resto de los INSERTs...

-- Datos de ejemplo: categorías
INSERT INTO categories (name, description) VALUES

('Herramientas', 'Herramientas manuales y eléctricas'),
('EPP', 'Elementos de Protección Personal'),
('Consumibles', 'Materiales de consumo y desgaste');

-- Products (use TRUE/FALSE for boolean)
INSERT INTO products (sku, name, description, unit, is_returnable, category_id) VALUES
('SKU0001', 'Martillo perforador SDS-Max', 'Martillo eléctrico para perforación de roca', 'EA', TRUE, 1),
('SKU0002', 'Taladro neumático 1"', 'Taladro de impacto para barrenos cortos', 'EA', TRUE, 1),
('SKU0003', 'Barreta minera 1,5 m', 'Palanca de acero templado', 'EA', TRUE, 1),
('SKU0004', 'Llave Stilson 24"', 'Llave ajustable para tuberías', 'EA', TRUE, 1),
('SKU0005', 'Llave Impacto 1/2"', 'Llave de impacto eléctrica', 'EA', TRUE, 1),
('SKU0006', 'Gata hidráulica 20 t', 'Gata tipo botella para levantamiento de equipos', 'EA', TRUE, 1),
('SKU0007', 'Esmeril Angular 7"', 'Esmeril industrial 2200 W', 'EA', TRUE, 1),
('SKU0008', 'Cortatubos cobre 2"', 'Herramienta de corte de tubería', 'EA', TRUE, 1),
('SKU0009', 'Destornillador aislado PZ2', 'Destornillador 1000 V', 'EA', TRUE, 1),
('SKU0010', 'Juego llaves combinadas 6-32 mm', 'Set de 25 piezas cromo-vanadio', 'SET', TRUE, 1),
('SKU0011', 'Prensa sargento 12"', 'Prensa de sujeción rápida', 'EA', TRUE, 1),
('SKU0012', 'Cizalla manual 36"', 'Cizalla para barras Ø16 mm', 'EA', TRUE, 1),
('SKU0013', 'Multímetro digital CAT IV', 'Multímetro True RMS 1000 V', 'EA', TRUE, 1),
('SKU0014', 'Pinza amperimétrica 600 A', 'Pinza eléctrica para medición de corriente', 'EA', TRUE, 1),
('SKU0015', 'Prensa de banco 6"', 'Tornillo de banco fundición', 'EA', TRUE, 1),
('SKU0016', 'Martillo mecánico 3 lb', 'Martillo de peña con mango fibra', 'EA', TRUE, 1),
('SKU0017', 'Juego dados impacto 1"', 'Set 15 dados hasta 60 mm', 'SET', TRUE, 1),
('SKU0018', 'Extractor de rodamientos 10 t', 'Extractor hidráulico', 'EA', TRUE, 1),
('SKU0019', 'Paleta albañil 8"', 'Paleta acero inoxidable', 'EA', TRUE, 1),
('SKU0020', 'Nivel láser autonivelante', 'Nivel con soporte magnético', 'EA', TRUE, 1),
('SKU0021', 'Carretilla neumática 160 L', 'Carretilla metálica rueda inflable', 'EA', TRUE, 1),
('SKU0022', 'Sierra sable industrial', 'Sierra eléctrica para demolición', 'EA', TRUE, 1),
('SKU0023', 'Kit soldador oxiacetilénico', 'Equipo completo con mangueras', 'SET', TRUE, 1),
('SKU0024', 'Cepillo eléctrico 3-1/4"', 'Cepillo carpintero 750 W', 'EA', TRUE, 1),
('SKU0025', 'Pala punta cuadrada', 'Pala acero templado mango fibra', 'EA', TRUE, 1),
('SKU0026', 'Pala punta de dragón', 'Pala excavación suelos duros', 'EA', TRUE, 1),
('SKU0027', 'Picota minería', 'Picota cabeza 2,5 kg', 'EA', TRUE, 1),
('SKU0028', 'Cortafrío 18"', 'Cortafrío acero aleado', 'EA', TRUE, 1),
('SKU0029', 'Llave torque 200 N·m', 'Llave dinamométrica 1/2"', 'EA', TRUE, 1),
('SKU0030', 'Compresor portátil 50 L', 'Compresor lubricado 3 HP', 'EA', TRUE, 1),
('SKU0031', 'Motosierra 20"', 'Motosierra gasolina 62 cc', 'EA', TRUE, 1),
('SKU0032', 'Taladro magnético 50 mm', 'Taladro base magnética', 'EA', TRUE, 1),
('SKU0033', 'Bomba manual grasa', 'Engrasadora palanca 500 cm³', 'EA', TRUE, 1),
('SKU0034', 'Juego machos y terrajas M3-M12', 'Set roscado manual', 'SET', TRUE, 1),
('SKU0035', 'Linterna cabeza LED 400 lm', 'Frontal recargable IP65', 'EA', TRUE, 1),
('SKU0036', 'Cinta medir 30 m fibra', 'Cinta abierta alta visibilidad', 'EA', TRUE, 1),
('SKU0037', 'Prensa hidráulica 20 t', 'Prensa taller armazón H', 'EA', TRUE, 1),
('SKU0038', 'Cortadora plasma 40 A', 'Equipo corte plasma 220 V', 'EA', TRUE, 1),
('SKU0039', 'Taladro percutor 13 mm', 'Taladro 800 W reversa', 'EA', TRUE, 1),
('SKU0040', 'Soplete propano', 'Soplete manual encendido piezo', 'EA', TRUE, 1),

-- PPE (returnable TRUE, else FALSE)
('SKU0041', 'Casco seguridad clase E', 'Casco dieléctrico color amarillo', 'EA', TRUE, 2),
('SKU0042', 'Protector auditivo tipo copa', 'Orejeras 27 dB NRR', 'EA', TRUE, 2),
('SKU0043', 'Lentes seguridad antiempañantes', 'Lente policarbonato claro', 'EA', TRUE, 2),
('SKU0044', 'Guantes nitrilo pesado T-9', 'Guante químico alto espesor', 'PAR', TRUE, 2),
('SKU0045', 'Arnés 4 argollas', 'Arnés de seguridad contra caídas', 'EA', TRUE, 2),
('SKU0046', 'Línea de vida 1,8 m', 'Elemento detención caídas con absorbedor', 'EA', TRUE, 2),
('SKU0047', 'Filtro P100 para respirador', 'Cartucho partículas alta eficiencia', 'PAR', TRUE, 2),
('SKU0048', 'Respirador media cara', 'Respirador elastomérico reutilizable', 'EA', TRUE, 2),
('SKU0049', 'Polainas cuero soldador', 'Protección piernas soldadura', 'PAR', TRUE, 2),
('SKU0050', 'Pechera cuero soldador', 'Pechera vacuno 90 cm', 'EA', TRUE, 2),
('SKU0051', 'Calzado seguridad punta AC', 'Borcego dieléctrico S3', 'PAR', TRUE, 2),
('SKU0052', 'Overol ignífugo talla L', 'Overol algodón retardante', 'EA', TRUE, 2),
('SKU0053', 'Chaqueta alta visibilidad', 'Chaqueta reflectante ANSI 107', 'EA', TRUE, 2),
('SKU0054', 'Guantes dieléctricos clase 0', 'Guante caucho 1000 V', 'PAR', TRUE, 2),
('SKU0055', 'Protector facial policarbonato', 'Pantalla facial transparente', 'EA', TRUE, 2),
('SKU0056', 'Cinturón lumbar soporte', 'Faja ergonómica talla M', 'EA', TRUE, 2),
('SKU0057', 'Manta soldador 1x1 m', 'Manta fibra silicato alta temp.', 'EA', TRUE, 2),
('SKU0058', 'Casco ventilado c/suspensión ratchet', 'Casco HDPE ventilación superior', 'EA', TRUE, 2),
('SKU0059', 'Protector solar SPF 50+ 1 L', 'Bloqueador UV alta resistencia', 'BOT', FALSE, 2),
('SKU0060', 'Gafas panorámicas selladas', 'Antiparra ventilada indirecta', 'EA', TRUE, 2),
('SKU0061', 'Guantes anticorte nivel C', 'Guante fibra HPPE recubierto nitrilo', 'PAR', TRUE, 2),
('SKU0062', 'Tapón auditivo espuma', 'Tapón desechable 32 dB', 'PAR', FALSE, 2),
('SKU0063', 'Casco con barbuquejo', 'Casco + barbuquejo 4 puntos', 'EA', TRUE, 2),
('SKU0064', 'Guantes PVC largos', 'Guante PVC 45 cm químicos', 'PAR', TRUE, 2),
('SKU0065', 'Poncho impermeable PVC', 'Poncho amarillo soldado HF', 'EA', TRUE, 2),
('SKU0066', 'Guantes de cuero flor', 'Guante montañista alta resistencia', 'PAR', TRUE, 2),
('SKU0067', 'Protector cervical casco', 'Adición sombra cuello', 'EA', TRUE, 2),
('SKU0068', 'Rodilleras gel industrial', 'Rodillera con almohadilla gel', 'PAR', TRUE, 2),
('SKU0069', 'Mascarilla desechable P2', 'Respirador plegable con válvula', 'UND', FALSE, 2),
('SKU0070', 'Guantes latex desechables', 'Guante examen sin polvo', 'PAR', FALSE, 2),

-- Consumibles (todos FALSE)
('SKU0071', 'Broca SDS-Plus 14 mm', 'Broca perforación concreto', 'EA', FALSE, 3),
('SKU0072', 'Disco corte metal 7\"', 'Disco abrasivo acero', 'EA', FALSE, 3),
('SKU0073', 'Disco flap 4-1/2\" gr 80', 'Disco láminas pulido', 'EA', FALSE, 3),
('SKU0074', 'Electrodo E6011 1/8\"', 'Electrodo soldadura acero', 'KG', FALSE, 3),
('SKU0075', 'Alambre MIG ER70S-6 15 kg', 'Carrete alambre soldadura', 'ROL', FALSE, 3),
('SKU0076', 'Grasa SKF LGEP2 400 g', 'Cartucho grasa extrema presión', 'EA', FALSE, 3),
('SKU0077', 'Aceite hidráulico ISO 46 20 L', 'Bidón aceite hidráulico', 'BOT', FALSE, 3),
('SKU0078', 'Spray zinc en frío 500 mL', 'Aerosol galvanizado', 'EA', FALSE, 3),
('SKU0079', 'Spray pintura amarillo seguridad', 'Aerosol alta visibilidad', 'EA', FALSE, 3),
('SKU0080', 'Cinta aisladora 3/4\" negra', 'Cinta PVC 600 V', 'ROL', FALSE, 3),
('SKU0081', 'Cinta teflón 12 mm', 'Cinta PTFE sellado roscas', 'ROL', FALSE, 3),
('SKU0082', 'Soldadura estaño 60/40 1 mm', 'Carrete 500 g', 'ROL', FALSE, 3),
('SKU0083', 'Silicona alta temp. 300 g', 'Sellador RTV rojo', 'EA', FALSE, 3),
('SKU0084', 'Limpiador dieléctrico 500 mL', 'Aerosol limpieza eléctrica', 'EA', FALSE, 3),
('SKU0085', 'Grasa multiuso 120 g', 'Tubo grasa litio', 'EA', FALSE, 3),
('SKU0086', 'Escobilla acero mango plástico', 'Escobilla limpieza metal', 'EA', FALSE, 3),
('SKU0087', 'Disco diamante 9\" hormigón', 'Disco corte hormigón', 'EA', FALSE, 3),
('SKU0088', 'Pasta pulir metal 250 g', 'Pulimento abrasivo', 'EA', FALSE, 3),
('SKU0089', 'Filtro gasoil spin-on', 'Filtro combustible motor', 'EA', FALSE, 3),
('SKU0090', 'Valvula engrasadora 1/8 NPT', 'Acople zerk recto', 'EA', FALSE, 3),
('SKU0091', 'Kit juntas tóricas viton', 'Surtido 419 piezas', 'SET', FALSE, 3),
('SKU0092', 'Tubo termorretráctil 4 mm negro', 'Rollo 5 m', 'ROL', FALSE, 3),
('SKU0093', 'Paño microfibra 40x40 cm', 'Paño limpieza suave', 'EA', FALSE, 3),
('SKU0094', 'Agua destilada 5 L', 'Bidón agua desmineralizada', 'BOT', FALSE, 3),
('SKU0095', 'Batería AA alcalina', 'Pila alcalina alta duración', 'PAR', FALSE, 3),
('SKU0096', 'Grasa cerámica 400 g', 'Cartucho grasa alta temp.', 'EA', FALSE, 3),
('SKU0097', 'Bolsas basura industriales 120 L', 'Paquete 20 unidades', 'PAC', FALSE, 3),
('SKU0098', 'Cinta doble contacto industrial 2\"', 'Rollo adhesivo espuma', 'ROL', FALSE, 3),
('SKU0099', 'Lubricante penetrante 400 mL', 'Aerosol aflojatodo', 'EA', FALSE, 3),
('SKU0100', 'Guantes desechables nitrilo T-M', 'Caja 100 unidades', 'CAJ', FALSE, 3);

/* ─────────────────────────────────────────────────────────────
   USERS  (130 users: 65 per shift)
   ───────────────────────────────────────────────────────────── */

INSERT INTO users (username, full_name, password_hash, role, shift_id) VALUES
-- 5 MANAGERS - G21
('juan.garcia','Juan García','hash','admin',1),
('maria.rodriguez','María Rodríguez','hash','admin',1),
('pedro.martinez','Pedro Martínez','hash','admin',1),
('carlos.torres','Carlos Torres','hash','admin',1),
('ana.salazar','Ana Salazar','hash','admin',1),
-- 10 SUPERVISORS - G21
('manuel.reyes','Manuel Reyes','hash','supervisor',1),
('laura.vargas','Laura Vargas','hash','supervisor',1),
('pablo.sanchez','Pablo Sánchez','hash','supervisor',1),
('isabel.rodriguez','Isabel Rodríguez','hash','supervisor',1),
('diana.torres','Diana Torres','hash','supervisor',1),
('fernando.moya','Fernando Moya','hash','supervisor',1),
('camila.guzman','Camila Guzmán','hash','supervisor',1),
('rodrigo.soto','Rodrigo Soto','hash','supervisor',1),
('sofia.leon','Sofía León','hash','supervisor',1),
('javier.colina','Javier Colina','hash','supervisor',1),
-- 40 WORKERS (4 each supervisor) - G21
('andres.perez','Andrés Pérez','hash','operador',1),
('jose.munoz','José Muñoz','hash','operador',1),
('marta.villegas','Marta Villegas','hash','operador',1),
('raul.rodrigo','Raúl Rodrigo','hash','operador',1),
('fernando.lopez','Fernando López','hash','operador',1),
('valentina.ramirez','Valentina Ramírez','hash','operador',1),
('sebastian.rios','Sebastián Ríos','hash','operador',1),
('camila.fernandez','Camila Fernández','hash','operador',1),
('belen.martinez','Belén Martínez','hash','operador',1),
('nicolas.torrealba','Nicolás Torrealba','hash','operador',1),
('antonia.soto','Antonia Soto','hash','operador',1),
('francisco.aguirre','Francisco Aguirre','hash','operador',1),
('carla.ortiz','Carla Ortiz','hash','operador',1),
('diego.castillo','Diego Castillo','hash','operador',1),
('martina.duenas','Martina Dueñas','hash','operador',1),
('jorge.pereira','Jorge Pereira','hash','operador',1),
('roxana.villalobos','Roxana Villalobos','hash','operador',1),
('eduardo.galvez','Eduardo Gálvez','hash','operador',1),
('paula.fuentealba','Paula Fuentealba','hash','operador',1),
('rafael.cifuentes','Rafael Cifuentes','hash','operador',1),
('marcela.sanchez','Marcela Sánchez','hash','operador',1),
('cristian.poblete','Cristián Poblete','hash','operador',1),
('daniela.tapia','Daniela Tapia','hash','operador',1),
('andres.arias','Andrés Arias','hash','operador',1),
('fernanda.cortes','Fernanda Cortés','hash','operador',1),
('raul.espinoza','Raúl Espinoza','hash','operador',1),
('karla.guzman','Karla Guzmán','hash','operador',1),
('alexander.llanos','Alexander Llanos','hash','operador',1),
('veronica.molina','Verónica Molina','hash','operador',1),
('patricio.salinas','Patricio Salinas','hash','operador',1),
('adriana.munoz','Adriana Muñoz','hash','operador',1),
('jorge.gonzalez','Jorge González','hash','operador',1),
('catalina.benitez','Catalina Benítez','hash','operador',1),
('sebastian.heredia','Sebastián Heredia','hash','operador',1),
('fernando.silva','Fernando Silva','hash','operador',1),
('camila.perez','Camila Pérez','hash','operador',1),
('sebastian.molina','Sebastián Molina','hash','operador',1),
('andrea.rios','Andrea Ríos','hash','operador',1),
('matias.fernandez','Matías Fernández','hash','operador',1),
('sofia.vega','Sofía Vega','hash','operador',1),
-- 10 STOREKEEPERS - G21
('andres.leon','Andrés León','hash','storekeeper',1),
('josefa.castro','Josefa Castro','hash','storekeeper',1),
('miguel.ortiz','Miguel Ortiz','hash','storekeeper',1),
('lorena.gonzalez','Lorena González','hash','storekeeper',1),
('cristian.vargas','Cristián Vargas','hash','storekeeper',1),
('paula.munoz','Paula Muñoz','hash','storekeeper',1),
('diego.alvarez','Diego Álvarez','hash','storekeeper',1),
('karina.soto','Karina Soto','hash','storekeeper',1),
('julian.rojas','Julián Rojas','hash','storekeeper',1),
('veronica.beltran','Verónica Beltrán','hash','storekeeper',1),

-- 5 MANAGERS - G22
('raul.sanchez','Raúl Sánchez','hash','admin',2),
('gabriela.rodriguez','Gabriela Rodríguez','hash','admin',2),
('felipe.aguirre','Felipe Aguirre','hash','admin',2),
('silvia.nunez','Silvia Núñez','hash','admin',2),
('jorge.munoz','Jorge Muñoz','hash','admin',2),
-- 10 SUPERVISORS - G22
('marcela.ramirez','Marcela Ramírez','hash','supervisor',2),
('nicolas.vargas','Nicolás Vargas','hash','supervisor',2),
('alejandra.castillo','Alejandra Castillo','hash','supervisor',2),
('pedro.galvez','Pedro Gálvez','hash','supervisor',2),
('sandra.tapia','Sandra Tapia','hash','supervisor',2),
('daniel.salinas','Daniel Salinas','hash','supervisor',2),
('patricia.cortes','Patricia Cortés','hash','supervisor',2),
('gustavo.rodriguez','Gustavo Rodríguez','hash','supervisor',2),
('monica.leiva','Mónica Leiva','hash','supervisor',2),
('ricardo.munoz','Ricardo Muñoz','hash','supervisor',2),
-- 40 WORKERS - G22
('soledad.figueroa','Soledad Figueroa','hash','operador',2),
('maximiliano.orta','Maximiliano Orta','hash','operador',2),
('valeria.morales','Valeria Morales','hash','operador',2),
('jose.sandoval','José Sandoval','hash','operador',2),
('ximena.carrasco','Ximena Carrasco','hash','operador',2),
('benjamin.torres','Benjamín Torres','hash','operador',2),
('camilo.santana','Camilo Santana','hash','operador',2),
('pamela.fuentes','Pamela Fuentes','hash','operador',2),
('francisca.villar','Francisca Villar','hash','operador',2),
('ignacio.pizarro','Ignacio Pizarro','hash','operador',2),
('alejandro.galvez','Alejandro Gálvez','hash','operador',2),
('martina.escobar','Martina Escobar','hash','operador',2),
('matias.rios','Matías Ríos','hash','operador',2),
('antonella.castro','Antonella Castro','hash','operador',2),
('daniel.munoz','Daniel Muñoz','hash','operador',2),
('valentina.silva','Valentina Silva','hash','operador',2),
('vicente.sanhueza','Vicente Sanhueza','hash','operador',2),
('carolina.vasquez','Carolina Vásquez','hash','operador',2),
('bastian.vera','Bastián Vera','hash','operador',2),
('trinidad.cabrera','Trinidad Cabrera','hash','operador',2),
('lucas.saavedra','Lucas Saavedra','hash','operador',2),
('martin.pena','Martín Peña','hash','operador',2),
('antonio.espinoza','Antonio Espinoza','hash','operador',2),
('camila.carreno','Camila Carreño','hash','operador',2),
('melissa.rios','Melissa Ríos','hash','operador',2),
('cristobal.leyton','Cristóbal Leyton','hash','operador',2),
('fernanda.gatica','Fernanda Gatica','hash','operador',2),
('isidora.moreno','Isidora Moreno','hash','operador',2),
('pablo.uribe','Pablo Uribe','hash','operador',2),
('valeska.miranda','Valeska Miranda','hash','operador',2),
('sofia.carrasco','Sofía Carrasco','hash','operador',2),
('felipe.godoy','Felipe Godoy','hash','operador',2),
('rodrigo.sandoval','Rodrigo Sandoval','hash','operador',2),
('victor.mella','Víctor Mella','hash','operador',2),
('camila.paredes','Camila Paredes','hash','operador',2),
('roberto.cerda','Roberto Cerda','hash','operador',2),
('constanza.vidal','Constanza Vidal','hash','operador',2),
('matilde.reyes','Matilde Reyes','hash','operador',2),
('hugo.salazar','Hugo Salazar','hash','operador',2),
('carla.bustos','Carla Bustos','hash','operador',2),
('marco.cifuentes','Marco Cifuentes','hash','operador',2),
-- 10 STOREKEEPERS - G22
('manuel.vega','Manuel Vega','hash','storekeeper',2),
('cristina.saez','Cristina Sáez','hash','storekeeper',2),
('javier.garrido','Javier Garrido','hash','storekeeper',2),
('elena.baeza','Elena Baeza','hash','storekeeper',2),
('francisco.miranda','Francisco Miranda','hash','storekeeper',2),
('paula.ramirez','Paula Ramírez','hash','storekeeper',2),
('leonardo.fuentes','Leonardo Fuentes','hash','storekeeper',2),
('rocio.cardenas','Rocío Cárdenas','hash','storekeeper',2),
('daniel.rosas','Daniel Rosas','hash','storekeeper',2),
('maria.espinoza','María Espinoza','hash','storekeeper',2);

/* ─────────────────────────────────────────────────────────────
   USER RELATIONS
   ───────────────────────────────────────────────────────────── */

INSERT INTO user_relations (parent_id, child_id, relation)
SELECT p.id, c.id, 'manager'
FROM users p
JOIN users c ON (
     (p.username IN ('juan.garcia','maria.rodriguez','pedro.martinez','carlos.torres','ana.salazar')
         AND c.username IN ('manuel.reyes','laura.vargas','pablo.sanchez','isabel.rodriguez','diana.torres',
                            'fernando.moya','camila.guzman','rodrigo.soto','sofia.leon','javier.colina'))
  OR (p.username IN ('raul.sanchez','gabriela.rodriguez','felipe.aguirre','silvia.nunez','jorge.munoz')
         AND c.username IN ('marcela.ramirez','nicolas.vargas','alejandra.castillo','pedro.galvez','sandra.tapia',
                            'daniel.salinas','patricia.cortes','gustavo.rodriguez','monica.leiva','ricardo.munoz'))
)
WHERE
     ((p.username = 'juan.garcia' AND c.username IN ('manuel.reyes','laura.vargas')) OR
      (p.username = 'maria.rodriguez' AND c.username IN ('pablo.sanchez','isabel.rodriguez')) OR
      (p.username = 'pedro.martinez' AND c.username IN ('diana.torres','fernando.moya')) OR
      (p.username = 'carlos.torres' AND c.username IN ('camila.guzman','rodrigo.soto')) OR
      (p.username = 'ana.salazar' AND c.username IN ('sofia.leon','javier.colina')) OR
      (p.username = 'raul.sanchez' AND c.username IN ('marcela.ramirez','nicolas.vargas')) OR
      (p.username = 'gabriela.rodriguez' AND c.username IN ('alejandra.castillo','pedro.galvez')) OR
      (p.username = 'felipe.aguirre' AND c.username IN ('sandra.tapia','daniel.salinas')) OR
      (p.username = 'silvia.nunez' AND c.username IN ('patricia.cortes','gustavo.rodriguez')) OR
      (p.username = 'jorge.munoz' AND c.username IN ('monica.leiva','ricardo.munoz'))
     );

INSERT INTO user_relations (parent_id, child_id, relation)
SELECT s.id, w.id, 'supervisor'
FROM users s
JOIN users w ON (
     (s.username IN ('manuel.reyes','laura.vargas','pablo.sanchez','isabel.rodriguez','diana.torres',
                     'fernando.moya','camila.guzman','rodrigo.soto','sofia.leon','javier.colina')
         AND w.username IN ('andres.perez','jose.munoz','marta.villegas','raul.rodrigo','fernando.lopez','valentina.ramirez','sebastian.rios','camila.fernandez','belen.martinez','nicolas.torrealba','antonia.soto','francisco.aguirre','carla.ortiz','diego.castillo','martina.duenas','jorge.pereira','roxana.villalobos','eduardo.galvez','paula.fuentealba','rafael.cifuentes','marcela.sanchez','cristian.poblete','daniela.tapia','andres.arias','fernanda.cortes','raul.espinoza','karla.guzman','alexander.llanos','veronica.molina','patricio.salinas','adriana.munoz','jorge.gonzalez','catalina.benitez','sebastian.heredia','fernando.silva','camila.perez','sebastian.molina','andrea.rios','matias.fernandez','sofia.vega'))
  OR (s.username IN ('marcela.ramirez','nicolas.vargas','alejandra.castillo','pedro.galvez','sandra.tapia',
                     'daniel.salinas','patricia.cortes','gustavo.rodriguez','monica.leiva','ricardo.munoz')
         AND w.username IN ('soledad.figueroa','maximiliano.orta','valeria.morales','jose.sandoval','ximena.carrasco','benjamin.torres','camilo.santana','pamela.fuentes','francisca.villar','ignacio.pizarro','alejandro.galvez','martina.escobar','matias.rios','antonella.castro','daniel.munoz','valentina.silva','vicente.sanhueza','carolina.vasquez','bastian.vera','trinidad.cabrera','lucas.saavedra','martin.pena','antonio.espinoza','camila.carreno','melissa.rios','cristobal.leyton','fernanda.gatica','isidora.moreno','pablo.uribe','valeska.miranda','sofia.carrasco','felipe.godoy','rodrigo.sandoval','victor.mella','camila.paredes','roberto.cerda','constanza.vidal','matilde.reyes','hugo.salazar','carla.bustos'))
)
WHERE
     -- mapping G21 supervisors to blocks of 4 workers (by order)
     (s.username='manuel.reyes' AND w.username IN ('andres.perez','jose.munoz','marta.villegas','raul.rodrigo')) OR
     (s.username='laura.vargas' AND w.username IN ('fernando.lopez','valentina.ramirez','sebastian.rios','camila.fernandez')) OR
     (s.username='pablo.sanchez' AND w.username IN ('belen.martinez','nicolas.torrealba','antonia.soto','francisco.aguirre')) OR
     (s.username='isabel.rodriguez' AND w.username IN ('carla.ortiz','diego.castillo','martina.duenas','jorge.pereira')) OR
     (s.username='diana.torres' AND w.username IN ('roxana.villalobos','eduardo.galvez','paula.fuentealba','rafael.cifuentes')) OR
     (s.username='fernando.moya' AND w.username IN ('marcela.sanchez','cristian.poblete','daniela.tapia','andres.arias')) OR
     (s.username='camila.guzman' AND w.username IN ('fernanda.cortes','raul.espinoza','karla.guzman','alexander.llanos')) OR
     (s.username='rodrigo.soto' AND w.username IN ('veronica.molina','patricio.salinas','adriana.munoz','jorge.gonzalez')) OR
     (s.username='sofia.leon' AND w.username IN ('catalina.benitez','sebastian.heredia','fernando.silva','camila.perez')) OR
     (s.username='javier.colina' AND w.username IN ('sebastian.molina','andrea.rios','matias.fernandez','sofia.vega')) OR
     -- mapping G22 supervisors to blocks of 4 workers (by order)
     (s.username='marcela.ramirez' AND w.username IN ('soledad.figueroa','maximiliano.orta','valeria.morales','jose.sandoval')) OR
     (s.username='nicolas.vargas' AND w.username IN ('ximena.carrasco','benjamin.torres','camilo.santana','pamela.fuentes')) OR
     (s.username='alejandra.castillo' AND w.username IN ('francisca.villar','ignacio.pizarro','alejandro.galvez','martina.escobar')) OR
     (s.username='pedro.galvez' AND w.username IN ('matias.rios','antonella.castro','daniel.munoz','valentina.silva')) OR
     (s.username='sandra.tapia' AND w.username IN ('vicente.sanhueza','carolina.vasquez','bastian.vera','trinidad.cabrera')) OR
     (s.username='daniel.salinas' AND w.username IN ('lucas.saavedra','martin.pena','antonio.espinoza','camila.carreno')) OR
     (s.username='patricia.cortes' AND w.username IN ('melissa.rios','cristobal.leyton','fernanda.gatica','isidora.moreno')) OR
     (s.username='gustavo.rodriguez' AND w.username IN ('pablo.uribe','valeska.miranda','sofia.carrasco','felipe.godoy')) OR
     (s.username='monica.leiva' AND w.username IN ('rodrigo.sandoval','victor.mella','camila.paredes','roberto.cerda')) OR
     (s.username='ricardo.munoz' AND w.username IN ('constanza.vidal','matilde.reyes','hugo.salazar','carla.bustos'));
/* ─────────────────────────────────────────────────────────────
   STOCK INITIAL: location_products (80% of catalog)
   Location: Chancado Rosario (id = 1)
   ───────────────────────────────────────────────────────────── */
INSERT INTO location_products (location_id, product_id, stock, minimum_stock) VALUES
-- Tools (product_id 1‑40) → stock 5, minimum 2
(1, 1, 5, 2),(1, 2, 5, 2),(1, 3, 5, 2),(1, 4, 5, 2),(1, 5, 5, 2),
(1, 6, 4, 1),(1, 7, 4, 1),(1, 8, 6, 2),(1, 9, 8, 3),(1,10, 3, 1),
(1,11, 4, 2),(1,12, 3, 1),(1,13, 4, 2),(1,14, 4, 2),(1,15, 2, 1),
(1,16, 6, 2),(1,17, 2, 1),(1,18, 2, 1),(1,19, 6, 2),(1,20, 2, 1),
(1,21, 3, 1),(1,22, 3, 1),(1,23, 1, 1),(1,24, 2, 1),(1,25,10, 4),
(1,26,10, 4),(1,27, 6, 2),(1,28, 8, 3),(1,29, 3, 1),(1,30, 1, 1),
(1,31, 2, 1),(1,32, 1, 1),(1,33, 4, 2),(1,34, 2, 1),(1,35,12, 4),
(1,36, 5, 2),(1,37, 1, 1),(1,38, 1, 1),(1,39, 4, 2),(1,40, 6, 2),
-- PPE (product_id 41‑70) → stock varies, minimum 5 or 0 for disposables
(1,41,20,5),(1,42,20,5),(1,43,40,10),(1,44,50,10),(1,45,10,2),
(1,46,10,2),(1,47,60,15),(1,48,25,5),(1,49,15,3),(1,50,10,2),
(1,51,40,8),(1,52,30,6),(1,53,20,5),(1,54,12,2),(1,55,20,5),
(1,56,25,5),(1,57,10,2),(1,58,15,3),(1,59,10,0),(1,60,25,5),
(1,61,40,8),(1,62,500,0),(1,63,20,5),(1,64,30,6),(1,65,20,4),
(1,66,60,12),(1,67,20,4),(1,68,15,3),(1,69,200,0),(1,70,400,0),
-- Consumables (product_id 71‑80) → stock high, minimum 10
(1,71,30,10),(1,72,60,15),(1,73,50,15),(1,74,40,10),(1,75,6,3),
(1,76,24,8),(1,77,12,4),(1,78,24,8),(1,79,30,10),(1,80,200,30),
-- Additional stock to cover products 81‑100 (completes 100 %)
(1,81,300,50),(1,82,10,2),(1,83,40,6),(1,84,24,5),(1,85,60,10),
(1,86,40,8),(1,87,20,4),(1,88,20,4),(1,89,30,6),(1,90,100,20),
(1,91,4,1),(1,92,20,4),(1,93,100,20),(1,94,30,6),(1,95,200,40),
(1,96,24,5),(1,97,50,10),(1,98,60,12),(1,99,40,8),(1,100,40,8);

/* ─────────────────────────────────────────────────────────────
   SAMPLE DATA: RFID LOGS
   ───────────────────────────────────────────────────────────── */
INSERT INTO rfid_logs (user_id, rfid_tag, event_type) VALUES
((SELECT id FROM users WHERE username='andres.perez'), 'TAG0001', 'login'),
((SELECT id FROM users WHERE username='andres.perez'), 'TAG0001', 'logout'),
((SELECT id FROM users WHERE username='ximena.carrasco'), 'TAG0021', 'login'),
((SELECT id FROM users WHERE username='ximena.carrasco'), 'TAG0021', 'access'),
((SELECT id FROM users WHERE username='ximena.carrasco'), 'TAG0021', 'logout');
/* ─────────────────────────────────────────────────────────────
   SAMPLE DATA: MATERIAL REQUESTS
   ────────────────────────────────────
   ───────────────────────── */

INSERT INTO requests (storekeeper_id, supervisor_id, location_id, product_id, status, processed_at) VALUES
  ((SELECT id FROM users WHERE username='andres.leon'),
   (SELECT id FROM users WHERE username='manuel.reyes'),
   1,
   71,
   'pendiente', NULL),
  ((SELECT id FROM users WHERE username='josefa.castro'),
   (SELECT id FROM users WHERE username='laura.vargas'),
   1,
   41,
   'aprobada', NOW()),
  ((SELECT id FROM users WHERE username='manuel.vega'),
   (SELECT id FROM users WHERE username='marcela.ramirez'),
   1,
   1,
   'rechazada', NOW()),
  ((SELECT id FROM users WHERE username='cristina.saez'),
   (SELECT id FROM users WHERE username='nicolas.vargas'),
   1,
   90,
   'completada', NOW()),
  ((SELECT id FROM users WHERE username='miguel.ortiz'),
   (SELECT id FROM users WHERE username='pablo.sanchez'),
   1,
   55,
   'pendiente', NULL);

-- Associate items to the above requests
INSERT INTO request_items (request_id, product_id, quantity) VALUES
(1, 71, 10),
(1, 72, 5),
(2, 41, 4),
(2, 42, 4),
(3, 1, 2),
(4, 90, 20),
(5, 55, 6);

/* ─────────────────────────────────────────────────────────────
   SAMPLE DATA: MOVEMENTS (entries and exits) con request_id
   ───────────────────────────────────────────────────────────── */
INSERT INTO movements (
    storekeeper_id,
    supervisor_id,
    product_id,
    type,
    quantity,
    serial_number,
    seal,
    reference,
    request_id,
    location_id
) VALUES
((SELECT id FROM users WHERE username='andres.leon'),
 (SELECT id FROM users WHERE username='manuel.reyes'),
 1, 'entrada', 10, NULL, NULL, 'Initial load', NULL, 1),

((SELECT id FROM users WHERE username='andres.leon'),
 (SELECT id FROM users WHERE username='manuel.reyes'),
 1, 'salida',   3, NULL, NULL, 'Issued to worker g21_op01', NULL, 1),

((SELECT id FROM users WHERE username='josefa.castro'),
 (SELECT id FROM users WHERE username='laura.vargas'),
 45, 'salida',  5, NULL, NULL, 'Issued PPE', 2, 1),  -- vinculado a request aprobada (id=2)

((SELECT id FROM users WHERE username='manuel.vega'),
 (SELECT id FROM users WHERE username='marcela.ramirez'),
 72, 'entrada', 50, NULL, NULL, 'Vendor delivery', NULL, 1),

((SELECT id FROM users WHERE username='manuel.vega'),
 (SELECT id FROM users WHERE username='marcela.ramirez'),
 72, 'salida',  10, NULL, NULL, 'Issued to crew A', NULL, 1),

((SELECT id FROM users WHERE username='miguel.ortiz'),
 (SELECT id FROM users WHERE username='pablo.sanchez'),
 90, 'entrada', 100, NULL, NULL, 'Initial stock', NULL, 1),

((SELECT id FROM users WHERE username='miguel.ortiz'),
 (SELECT id FROM users WHERE username='pablo.sanchez'),
 90, 'salida',  20, NULL, NULL, 'Maintenance use', NULL, 1),

((SELECT id FROM users WHERE username='cristina.saez'),
 (SELECT id FROM users WHERE username='nicolas.vargas'),
 15, 'salida',   1, 'SN-12345', 'Seal-001', 'Loan to workshop', NULL, 1),

((SELECT id FROM users WHERE username='cristina.saez'),
 (SELECT id FROM users WHERE username='nicolas.vargas'),
 15, 'entrada',  1, 'SN-12345', 'Seal-001', 'Returned from workshop', NULL, 1),

((SELECT id FROM users WHERE username='lorena.gonzalez'),
 (SELECT id FROM users WHERE username='isabel.rodriguez'),
 60, 'salida',   8, NULL, NULL, 'Field team issue', NULL, 1);

/* ─────────────────────────────────────────────────────────────
   SAMPLE DATA: SYNC QUEUE
   ───────────────────────────────────────────────────────────── */
INSERT INTO sync_queue (table_name, record_id, operation, payload, status) VALUES
('movements', 1, 'insert', '{"user_id":56,"product_id":1,"type":"entrada","quantity":10}', 'pending'),
('requests', 2, 'update', '{"status":"aprobada","processed_at":"NOW"}', 'synced'),
('rfid_logs', 3, 'insert', '{"user_id":91,"rfid_tag":"TAG0021","event_type":"login"}', 'pending');