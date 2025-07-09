require("dotenv").config(); // Carga DATABASE_URL y PORT de .env
const express = require("express");
const cors = require("cors");
// Use shared database connection
const dbManager = require('./database');
const OAuthServer = require('express-oauth-server');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();

app.oauth = new OAuthServer({
  model: require('./oauthModel'),
  accessTokenLifetime: 60 * 60,            // 1 hora
  allowBearerTokensInQueryString: true
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use shared database connection
const db = dbManager.getDb();
const query = dbManager.query.bind(dbManager);
const pool = dbManager.getPool();

// Initialize database schema on startup

const initializeDatabase = async () => {
  try {
    // Check if database is already initialized
    const { rows } = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='products'");
    
    if (rows.length === 0) {
      console.log('Initializing SQLite database...');
      const schemaPath = path.join(__dirname, 'sqlite_schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Execute schema as a single transaction
      db.exec(schema);
      
      console.log('Database initialized successfully');
    } else {
      console.log('Database already initialized');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Initialize database when module is loaded
initializeDatabase();

// Function to check and notify low stock
async function checkAndNotifyLowStock(productId) {
  try {
    const { rows } = await pool.query(
      `SELECT p.name as producto, lp.stock, lp.minimum_stock
       FROM location_products lp
       JOIN products p ON p.id = lp.product_id
       WHERE lp.product_id = $1 AND lp.stock <= lp.minimum_stock`,
      [productId]
    );
    
    if (rows.length > 0) {
      const product = rows[0];
      console.log(`🚨 Low stock detected: ${product.producto} (${product.stock}/${product.minimum_stock})`);
    }
  } catch (error) {
    console.error('Error checking low stock:', error);
  }
}

// Health endpoint (public, no auth required)
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity (timeout handled by pool config)
    const { rows } = await pool.query('SELECT datetime() as timestamp');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        serverTime: rows[0].timestamp
      },
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message
      },
      uptime: process.uptime()
    });
  }
});

// Ruta pública para obtener tokens
app.post('/oauth/token', app.oauth.token());
// Todas las rutas bajo /api requerirán un Bearer token válido
app.use('/api', app.oauth.authenticate());

// User profile endpoint
app.get("/api/user/profile", async (req, res) => {
  try {
    console.log("OAuth token data:", {
      token: res.locals.oauth.token,
      user: res.locals.oauth.token.user,
      userId: res.locals.oauth.token.user?.id
    });
    
    const userId = res.locals.oauth.token.user.id;
    
    const { rows } = await pool.query(
      `SELECT id, username, full_name, role, shift_id, created_at
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      shiftId: user.shift_id,
      createdAt: user.created_at
    });
  } catch (err) {
    console.error("Error en /api/user/profile:", err);
    res.status(500).json({ error: "Error al obtener perfil de usuario" });
  }
});

// KPIs del turno
app.get("/api/kpis", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const start = `${today}T00:00:00`;
    const end = `${today}T23:59:59`;

    const { rows: retirosRows } = await pool.query(
      `SELECT COALESCE(SUM(quantity),0)::int AS retiros
         FROM movements
        WHERE type = 'salida'
          AND created_at BETWEEN $1 AND $2`,
      [start, end]
    );
    const { rows: bodegRows } = await pool.query(
      `SELECT COUNT(DISTINCT storekeeper_id)::int AS bodegueros
         FROM movements
        WHERE type = 'salida'
          AND created_at BETWEEN $1 AND $2`,
      [start, end]
    );
    const { rows: critRows } = await pool.query(
      `SELECT COUNT(*)::int AS criticos
         FROM location_products
        WHERE stock < minimum_stock`
    );

    res.json({
      retiros: retirosRows[0].retiros,
      bodegueros: bodegRows[0].bodegueros,
      criticos: critRows[0].criticos,
    });
  } catch (err) {
    console.error("Error en /api/kpis:", err);
    res.status(500).json({ error: "Error al obtener KPIs" });
  }
});

// Top herramientas
app.get("/api/top-tools", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const { rows } = await pool.query(
      `SELECT p.name AS herramienta,
              SUM(m.quantity)::int AS cantidad
         FROM movements m
         JOIN products  p ON p.id = m.product_id
        WHERE m.type = 'salida'
        GROUP BY p.name
        ORDER BY cantidad DESC
        LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en /api/top-tools:", err);
    res.status(500).json({ error: "Error al obtener top-tools" });
  }
});

// Herramientas por supervisor
app.get("/api/tools-by-supervisor", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.username AS supervisor,
              p.name AS herramienta,
              SUM(m.quantity)::int AS cantidad
         FROM movements m
         JOIN users u    ON u.id = m.supervisor_id
         JOIN products p  ON p.id = m.product_id
        WHERE m.type = 'salida'
        GROUP BY u.username, p.name
        ORDER BY u.username`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en /api/tools-by-supervisor:", err);
    res.status(500).json({ error: "Error al obtener tools-by-supervisor" });
  }
});

// Bodegueros activos en el turno
app.get("/api/storekeepers-turno", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const start = `${today}T00:00:00`;
    const end = `${tomorrow}T00:00:00`;

    const { rows } = await pool.query(
      `SELECT u.full_name AS nombre,
              MIN(m.created_at)::timestamp AS hora_entrada
         FROM movements m
         JOIN users u ON u.id = m.storekeeper_id
        WHERE m.created_at BETWEEN $1 AND $2
        GROUP BY u.full_name`,
      [start, end]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en /api/storekeepers-turno:", err);
    res.status(500).json({ error: "Error al obtener storekeepers-turno" });
  }
});

// Retiros por persona (filtros opcionales)
app.get("/api/retiros-persona", async (req, res) => {
  try {
    const { persona, fecha_ini, fecha_fin } = req.query;
    const startDate = fecha_ini
      ? fecha_ini
      : new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const endDate = fecha_fin
      ? fecha_fin
      : new Date().toISOString().slice(0, 10);
    const start = `${startDate}T00:00:00`;
    const end = `${endDate}T23:59:59`;

    let sql = `
      SELECT u.full_name AS persona,
             p.name AS herramienta,
             m.quantity AS cantidad,
             m.created_at AS hora
        FROM movements m
        JOIN users u ON u.id = m.storekeeper_id
        JOIN products p ON p.id = m.product_id
       WHERE m.type = 'salida'
         AND m.created_at BETWEEN $1 AND $2`;
    const params = [start, end];
    if (persona && persona !== "Todos") {
      sql += ` AND u.full_name = $3`;
      params.push(persona);
    }

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("Error en /api/retiros-persona:", err);
    res.status(500).json({ error: "Error al obtener retiros-persona" });
  }
});

// Personas autorizadas
app.get("/api/personas-autorizadas", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT full_name AS persona,
              role AS rol
         FROM users
        WHERE role IN ('operador','supervisor')`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en /api/personas-autorizadas:", err);
    res.status(500).json({ error: "Error al obtener personas-autorizadas" });
  }
});

// Bodegueros
app.get("/api/storekeepers", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT full_name AS persona
         FROM users
        WHERE role = 'storekeeper'`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en /api/storekeepers:", err);
    res.status(500).json({ error: "Error al obtener storekeepers" });
  }
});

// Alertas de stock bajo
app.get("/api/alertas-stock", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.name AS producto,
              lp.stock,
              lp.minimum_stock
         FROM location_products lp
         JOIN products p ON p.id = lp.product_id
        WHERE lp.stock < lp.minimum_stock
        ORDER BY lp.stock`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en /api/alertas-stock:", err);
    res.status(500).json({ error: "Error al obtener alertas-stock" });
  }
});

// API Inventario endpoint (for chatbot)
app.get("/api/inventario", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.sku, p.name as descripcion, c.name as categoria, p.unit as unidad, 
              lp.stock, l.name as ubicacion, p.description as observaciones,
              CASE WHEN lp.stock > 0 THEN 'Activo' ELSE 'Inactivo' END as estado,
              lp.minimum_stock, lp.location_id
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN location_products lp ON lp.product_id = p.id
       LEFT JOIN locations l ON l.id = lp.location_id
       ORDER BY p.name`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en GET /api/inventario:", err);
    res.status(500).json({ error: "Error al obtener inventario" });
  }
});

// Productos endpoints
app.get("/productos", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.sku, p.name as descripcion, c.name as categoria, p.unit as unidad, 
              lp.stock, l.name as ubicacion, p.description as observaciones,
              CASE WHEN lp.stock > 0 THEN 'Activo' ELSE 'Inactivo' END as estado,
              lp.minimum_stock, lp.location_id
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN location_products lp ON lp.product_id = p.id
       LEFT JOIN locations l ON l.id = lp.location_id
       ORDER BY p.name`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en GET /productos:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

app.get("/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT p.id, p.sku, p.name as descripcion, c.name as categoria, p.unit as unidad,
              lp.stock, l.name as ubicacion, p.description as observaciones,
              CASE WHEN lp.stock > 0 THEN 'Activo' ELSE 'Inactivo' END as estado,
              lp.minimum_stock, lp.location_id
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN location_products lp ON lp.product_id = p.id
       LEFT JOIN locations l ON l.id = lp.location_id
       WHERE p.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error en GET /productos/:id:", err);
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

app.post("/productos", async (req, res) => {
  try {
    const { descripcion, categoria, unidad, stock, ubicacion, observaciones } =
      req.body;

    // First, create the product
    const { rows: productRows } = await pool.query(
      `INSERT INTO products (sku, name, description, unit, category_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM categories WHERE name = $5))
       RETURNING id, sku, name, description, unit`,
      [`SKU-${Date.now()}`, descripcion, observaciones, unidad, categoria]
    );

    const product = productRows[0];

    // Then, create the location_product entry
    if (ubicacion && stock !== undefined) {
      await pool.query(
        `INSERT INTO location_products (location_id, product_id, stock, minimum_stock)
         VALUES ((SELECT id FROM locations WHERE name = $1), $2, $3, 0)`,
        [ubicacion, product.id, stock]
      );
    }

    res.status(201).json({
      id: product.id,
      descripcion: product.name,
      categoria,
      unidad: product.unit,
      stock,
      ubicacion,
      observaciones: product.description,
      estado: stock > 0 ? "Activo" : "Inactivo",
    });
  } catch (err) {
    console.error("Error en POST /productos:", err);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

app.patch("/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, categoria, unidad, stock, ubicacion, observaciones } =
      req.body;

    // Update product
    if (descripcion || categoria || unidad || observaciones) {
      await pool.query(
        `UPDATE products 
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             unit = COALESCE($4, unit),
             category_id = COALESCE((SELECT id FROM categories WHERE name = $5), category_id)
         WHERE id = $1`,
        [id, descripcion, observaciones, unidad, categoria]
      );
    }

    // Update stock if provided
    if (stock !== undefined) {
      await pool.query(
        `UPDATE location_products 
         SET stock = $2
         WHERE product_id = $1`,
        [id, stock]
      );
      
      // Check for low stock after update
      await checkAndNotifyLowStock(id);
    }

    // Return updated product
    const { rows } = await pool.query(
      `SELECT p.id, p.sku, p.name as descripcion, c.name as categoria, p.unit as unidad,
              lp.stock, l.name as ubicacion, p.description as observaciones,
              CASE WHEN lp.stock > 0 THEN 'Activo' ELSE 'Inactivo' END as estado
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN location_products lp ON lp.product_id = p.id
       LEFT JOIN locations l ON l.id = lp.location_id
       WHERE p.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error en PATCH /productos/:id:", err);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

// API Movimientos endpoint (for chatbot)
app.get("/api/movimientos", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, p.name as producto, m.type as accion, m.quantity as cantidad,
              sup.full_name as supervisor, sol.full_name as solicitante, ub.full_name as bodeguero, 
              l.name as ubicacion, m.reference as observaciones, m.created_at as fecha
       FROM movements m
       JOIN products p ON p.id = m.product_id
       LEFT JOIN users sup ON sup.id = m.supervisor_id
       LEFT JOIN users sol ON sol.id = m.requesting_id
       LEFT JOIN users ub ON ub.id = m.storekeeper_id
       LEFT JOIN locations l ON l.id = m.location_id
       ORDER BY m.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en GET /api/movimientos:", err);
    res.status(500).json({ error: "Error al obtener movimientos" });
  }
});

// Movimientos endpoints
app.get("/movimientos", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, p.name as producto, m.type as accion, m.quantity as cantidad,
              sup.full_name as supervisor, sol.full_name as solicitante, ub.full_name as bodeguero, 
              l.name as ubicacion, m.reference as observaciones, m.created_at as fecha
       FROM movements m
       JOIN products p ON p.id = m.product_id
       LEFT JOIN users sup ON sup.id = m.supervisor_id
       LEFT JOIN users sol ON sol.id = m.requesting_id
       LEFT JOIN users ub ON ub.id = m.storekeeper_id
       LEFT JOIN locations l ON l.id = m.location_id
       ORDER BY m.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en GET /movimientos:", err);
    res.status(500).json({ error: "Error al obtener movimientos" });
  }
});

app.post("/movimientos", async (req, res) => {
  try {
    const {
      producto,
      accion,
      cantidad,
      supervisor,
      solicitante,
      bodeguero,
      ubicacion,
      observaciones,
      fecha,
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO movements (product_id, type, quantity, supervisor_id, storekeeper_id, requesting_id, location_id, reference, created_at)
       VALUES ($1, $2, $3, $4, $5, $6,
               (SELECT id FROM locations WHERE name = $7),
               $8, $9)
       RETURNING id, product_id, type, quantity, reference, created_at`,
      [
        producto,
        accion.toLowerCase(),
        cantidad,
        supervisor.id,
        bodeguero.id,
        solicitante.id,
        ubicacion,
        observaciones,
        fecha,
      ]
    );

    res.status(201).json({
      ...req.body,
      id: rows[0].id,
      fecha: rows[0].created_at
    });
  } catch (err) {
    console.error("Error en POST /movimientos:", err);
    res.status(500).json({ error: "Error al crear movimiento" });
  }
});

// Solicitudes endpoints
app.get("/solicitudes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get request with items
    const { rows: requestRows } = await pool.query(
      `SELECT r.id, us.full_name as solicitante, l.name as lugar, 
              r.created_at as fecha, r.status as estado
       FROM requests r
       LEFT JOIN users us ON us.id = r.supervisor_id
       LEFT JOIN locations l ON l.id = r.location_id
       WHERE r.id = $1`,
      [id]
    );

    if (requestRows.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    // Get request items with stock info
    const { rows: itemRows } = await pool.query(
      `SELECT ri.product_id as id, p.name as nombre, ri.quantity as cantidad,
              lp.stock as stockActual
       FROM request_items ri
       JOIN products p ON p.id = ri.product_id
       LEFT JOIN location_products lp ON lp.product_id = ri.product_id
       WHERE ri.request_id = $1`,
      [id]
    );

    const solicitud = {
      ...requestRows[0],
      productos: itemRows,
    };

    res.json(solicitud);
  } catch (err) {
    console.error("Error en GET /solicitudes/:id:", err);
    res.status(500).json({ error: "Error al obtener solicitud" });
  }
});

app.patch("/solicitudes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    // Map Spanish status to English
    const statusMap = {
      aprobada: "aprobada",
      rechazada: "rechazada",
      completada: "completada",
      pendiente: "pendiente",
    };

    const { rows } = await pool.query(
      `UPDATE requests 
       SET status = $2, processed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, status`,
      [id, statusMap[estado] || estado]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    res.json({ id: rows[0].id, estado: rows[0].status });
  } catch (err) {
    console.error("Error en PATCH /solicitudes/:id:", err);
    res.status(500).json({ error: "Error al actualizar solicitud" });
  }
});

// Atomic request approval endpoint
app.post("/solicitudes/:id/approve", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { bodeguero = "Juan Pérez", observaciones = "" } = req.body;
    
    // Get request details and items
    const { rows: requestRows } = await client.query(
      `SELECT r.id, r.supervisor_id, r.location_id, us.full_name as solicitante
       FROM requests r
       LEFT JOIN users us ON us.id = r.supervisor_id
       WHERE r.id = $1 AND r.status = 'pendiente'`,
      [id]
    );
    
    if (requestRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Solicitud no encontrada o ya procesada" });
    }
    
    const request = requestRows[0];
    
    // Get request items with current stock
    const { rows: itemRows } = await client.query(
      `SELECT ri.product_id, ri.quantity, p.name as producto_nombre,
              lp.stock as stock_actual, l.name as ubicacion
       FROM request_items ri
       JOIN products p ON p.id = ri.product_id
       LEFT JOIN location_products lp ON lp.product_id = ri.product_id
       LEFT JOIN locations l ON l.id = lp.location_id
       WHERE ri.request_id = $1`,
      [id]
    );
    
    const movements = [];
    const stockUpdates = [];
    let partialApproval = false;
    
    // Process each item
    for (const item of itemRows) {
      const availableQuantity = Math.max(0, item.stock_actual || 0);
      const requestedQuantity = item.quantity;
      const approvedQuantity = Math.min(requestedQuantity, availableQuantity);
      
      if (approvedQuantity < requestedQuantity) {
        partialApproval = true;
      }
      
      if (approvedQuantity > 0) {
        // Create movement record
        const { rows: movementRows } = await client.query(
          `INSERT INTO movements (product_id, type, quantity, supervisor_id, storekeeper_id, location_id, reference, created_at)
           VALUES ($1, 'salida', $2, $3, 
                   (SELECT id FROM users WHERE full_name = $4 LIMIT 1),
                   $5, $6, CURRENT_TIMESTAMP)
           RETURNING id`,
          [
            item.product_id,
            approvedQuantity,
            request.supervisor_id,
            bodeguero,
            request.location_id,
            `Solicitud ${id} - ${observaciones || 'Aprobación automática'}`
          ]
        );
        
        movements.push({
          movement_id: movementRows[0].id,
          producto: item.producto_nombre,
          cantidad_solicitada: requestedQuantity,
          cantidad_aprobada: approvedQuantity,
          stock_anterior: item.stock_actual,
          stock_nuevo: item.stock_actual - approvedQuantity
        });
        
        // Update stock
        await client.query(
          `UPDATE location_products 
           SET stock = stock - $1
           WHERE product_id = $2`,
          [approvedQuantity, item.product_id]
        );
        
        // Check for low stock after update
        await checkAndNotifyLowStock(item.product_id);
        
        stockUpdates.push({
          product_id: item.product_id,
          cantidad_retirada: approvedQuantity
        });
      }
    }
    
    // Update request status
    const newStatus = partialApproval ? 'parcialmente_aprobada' : 'aprobada';
    await client.query(
      `UPDATE requests 
       SET status = $2, processed_at = CURRENT_TIMESTAMP,
           processed_by = (SELECT id FROM users WHERE full_name = $3 LIMIT 1)
       WHERE id = $1`,
      [id, newStatus, bodeguero]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      solicitud_id: id,
      estado: newStatus,
      approval_partial: partialApproval,
      movimientos_creados: movements.length,
      detalle: movements,
      message: partialApproval 
        ? "Solicitud parcialmente aprobada por stock insuficiente"
        : "Solicitud aprobada completamente"
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error en POST /solicitudes/:id/approve:", err);
    res.status(500).json({ error: "Error al aprobar solicitud" });
  } finally {
    client.release();
  }
});

// Atomic request rejection endpoint
app.post("/solicitudes/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo = "", bodeguero = "Juan Pérez" } = req.body;
    
    const { rows } = await pool.query(
      `UPDATE requests 
       SET status = 'rechazada', 
           processed_at = CURRENT_TIMESTAMP,
           processed_by = (SELECT id FROM users WHERE full_name = $3 LIMIT 1),
           rejection_reason = $2
       WHERE id = $1 AND status = 'pendiente'
       RETURNING id, status`,
      [id, motivo, bodeguero]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada o ya procesada" });
    }
    
    res.json({
      success: true,
      solicitud_id: id,
      estado: "rechazada",
      motivo: motivo,
      message: "Solicitud rechazada exitosamente"
    });
    
  } catch (err) {
    console.error("Error en POST /solicitudes/:id/reject:", err);
    res.status(500).json({ error: "Error al rechazar solicitud" });
  }
});

// Batch movements creation endpoint
app.post("/movimientos/batch", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { movimientos, bodeguero = "Juan Pérez" } = req.body;
    
    if (!Array.isArray(movimientos) || movimientos.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Se requiere un array de movimientos" });
    }
    
    const createdMovements = [];
    const stockUpdates = [];
    
    for (const mov of movimientos) {
      const {
        producto_id,
        accion,
        cantidad,
        solicitante,
        ubicacion,
        observaciones = "",
        fecha = new Date().toISOString()
      } = mov;
      
      // Validate stock for 'salida' movements
      if (accion.toLowerCase() === 'salida') {
        const { rows: stockRows } = await client.query(
          `SELECT stock FROM location_products WHERE product_id = $1`,
          [producto_id]
        );
        
        const currentStock = stockRows[0]?.stock || 0;
        if (currentStock < cantidad) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: `Stock insuficiente para producto ${producto_id}. Disponible: ${currentStock}, Solicitado: ${cantidad}` 
          });
        }
      }
      
      // Create movement
      const { rows: movementRows } = await client.query(
        `INSERT INTO movements (product_id, type, quantity, supervisor_id, storekeeper_id, location_id, reference, created_at)
         VALUES ($1, $2, $3, 
                 (SELECT id FROM users WHERE full_name = $4 LIMIT 1),
                 (SELECT id FROM users WHERE full_name = $5 LIMIT 1),
                 (SELECT id FROM locations WHERE name = $6 LIMIT 1),
                 $7, $8)
         RETURNING id, type, quantity`,
        [
          producto_id,
          accion.toLowerCase(),
          cantidad,
          solicitante,
          bodeguero,
          ubicacion,
          observaciones,
          fecha
        ]
      );
      
      const movement = movementRows[0];
      createdMovements.push(movement);
      
      // Update stock based on movement type
      const multiplier = accion.toLowerCase() === 'entrada' ? 1 : 
                        accion.toLowerCase() === 'salida' ? -1 : 0;
      
      if (multiplier !== 0) {
        await client.query(
          `UPDATE location_products 
           SET stock = stock + $1
           WHERE product_id = $2`,
          [cantidad * multiplier, producto_id]
        );
        
        // Check for low stock after update (only for 'salida' movements)
        if (accion.toLowerCase() === 'salida') {
          await checkAndNotifyLowStock(producto_id);
        }
        
        stockUpdates.push({
          product_id: producto_id,
          cambio: cantidad * multiplier,
          tipo: accion
        });
      }
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      movimientos_creados: createdMovements.length,
      actualizaciones_stock: stockUpdates.length,
      detalle: createdMovements,
      message: `${createdMovements.length} movimientos procesados exitosamente`
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error en POST /movimientos/batch:", err);
    res.status(500).json({ error: "Error al procesar movimientos en lote" });
  } finally {
    client.release();
  }
});

// Stock reservation endpoints
app.post("/productos/:id/reserve", async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, solicitud_id, motivo = "Reserva automática" } = req.body;
    
    const { rows: stockRows } = await pool.query(
      `SELECT stock FROM location_products WHERE product_id = $1`,
      [id]
    );
    
    if (stockRows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    const availableStock = stockRows[0].stock;
    if (availableStock < cantidad) {
      return res.status(400).json({ 
        error: "Stock insuficiente para reservar",
        disponible: availableStock,
        solicitado: cantidad
      });
    }
    
    // Create reservation record (you might need to create a reservations table)
    const { rows } = await pool.query(
      `INSERT INTO stock_reservations (product_id, quantity, request_id, reason, created_at, status)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'active')
       RETURNING id, quantity, created_at`,
      [id, cantidad, solicitud_id, motivo]
    );
    
    res.status(201).json({
      success: true,
      reservation_id: rows[0].id,
      producto_id: id,
      cantidad_reservada: cantidad,
      stock_disponible: availableStock - cantidad,
      message: "Stock reservado exitosamente"
    });
    
  } catch (err) {
    console.error("Error en POST /productos/:id/reserve:", err);
    res.status(500).json({ error: "Error al reservar stock" });
  }
});

app.delete("/productos/:id/reserve", async (req, res) => {
  try {
    const { id } = req.params;
    const { solicitud_id } = req.query;
    
    const { rows } = await pool.query(
      `UPDATE stock_reservations 
       SET status = 'released', released_at = CURRENT_TIMESTAMP
       WHERE product_id = $1 AND request_id = $2 AND status = 'active'
       RETURNING id, quantity`,
      [id, solicitud_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    
    res.json({
      success: true,
      cantidad_liberada: rows[0].quantity,
      message: "Reserva liberada exitosamente"
    });
    
  } catch (err) {
    console.error("Error en DELETE /productos/:id/reserve:", err);
    res.status(500).json({ error: "Error al liberar reserva" });
  }
});

// Personas endpoints
app.get("/personas", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name as nombre, role as rol
       FROM users
       WHERE role IN ('operador', 'supervisor', 'storekeeper')
       ORDER BY full_name`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en GET /personas:", err);
    res.status(500).json({ error: "Error al obtener personas" });
  }
});

// Users endpoints (admin only)
app.get("/api/users", async (req, res) => {
  try {
    // Check if user is admin
    const currentUserRole = res.locals.oauth.token.user.role;
    if (currentUserRole !== 'admin') {
      return res.status(403).json({ error: "Acceso denegado. Solo administradores pueden ver usuarios." });
    }
    
    const { rows } = await pool.query(
      `SELECT id, username, full_name, role, shift_id, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en GET /api/users:", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    // Check if user is admin
    const currentUserRole = res.locals.oauth.token.user.role;
    if (currentUserRole !== 'admin') {
      return res.status(403).json({ error: "Acceso denegado. Solo administradores pueden crear usuarios." });
    }
    
    const { username, fullName, password, role, shiftId } = req.body;

    // Validate required fields
    if (!username || !fullName || !password || !role) {
      return res.status(400).json({ error: "Faltan campos requeridos: username, fullName, password, role" });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    // Validate role
    const validRoles = ['admin', 'operador', 'supervisor', 'storekeeper'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Rol inválido. Roles válidos: ${validRoles.join(', ')}` });
    }

    // Check if username already exists
    const { rows: existingUsers } = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: `El nombre de usuario '${username}' ya existe` });
    }

    // Validate shift if provided
    if (shiftId) {
      const { rows: shifts } = await pool.query(
        'SELECT id FROM shifts WHERE id = $1',
        [shiftId]
      );
      if (shifts.length === 0) {
        return res.status(400).json({ error: `El turno con ID ${shiftId} no existe` });
      }
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const { rows } = await pool.query(
      `INSERT INTO users (username, full_name, password_hash, role, shift_id, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, username, full_name, role, shift_id, created_at`,
      [username, fullName, passwordHash, role, shiftId || null]
    );

    const newUser = rows[0];
    
    // Remove password hash from response
    const { password_hash, ...userResponse } = newUser;

    res.status(201).json({
      success: true,
      message: `Usuario '${username}' creado exitosamente`,
      user: userResponse
    });

  } catch (err) {
    console.error("Error en POST /users:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// Get shifts endpoint
app.get("/shifts", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, code, start_time, end_time, cycle_start_day, cycle_end_day
       FROM shifts
       ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error en GET /shifts:", err);
    res.status(500).json({ error: "Error al obtener turnos" });
  }
});

// Dashboard endpoint (authenticated)
app.get("/api/dashboard", async (req, res) => {
  try {
    // Get total products count
    const { rows: totalProductsRows } = await pool.query(
      `SELECT COUNT(*)::int AS total_products FROM products`
    );

    // Get low stock products count (stock <= minimum_stock)
    const { rows: lowStockRows } = await pool.query(
      `SELECT COUNT(*)::int AS low_stock_count
       FROM location_products lp
       WHERE lp.stock <= lp.minimum_stock`
    );

    // Get total inventory value (using stock count since price column doesn't exist)
    const { rows: totalValueRows } = await pool.query(
      `SELECT COALESCE(SUM(lp.stock), 0)::int AS total_value
       FROM location_products lp`
    );

    // Get recent movements count (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { rows: recentMovementsRows } = await pool.query(
      `SELECT COUNT(*)::int AS recent_movements
       FROM movements
       WHERE created_at >= $1`,
      [thirtyDaysAgo]
    );

    // Get low stock products details (for alerts)
    const { rows: lowStockProductsRows } = await pool.query(
      `SELECT p.id, p.name as nombre, p.description as descripcion, 
              c.name as categoria, lp.stock as cantidad, lp.minimum_stock as minimo
       FROM products p
       JOIN location_products lp ON lp.product_id = p.id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE lp.stock <= lp.minimum_stock
       ORDER BY lp.stock ASC
       LIMIT 10`
    );

    // Get recent movements for activity feed
    const { rows: recentActivityRows } = await pool.query(
      `SELECT m.id, p.name as producto, m.type as accion, m.quantity as cantidad,
              sup.full_name as supervisor, sol.full_name as solicitante, 
              ub.full_name as bodeguero, m.created_at as fecha
       FROM movements m
       JOIN products p ON p.id = m.product_id
       LEFT JOIN users sup ON sup.id = m.supervisor_id
       LEFT JOIN users sol ON sol.id = m.requesting_id
       LEFT JOIN users ub ON ub.id = m.storekeeper_id
       ORDER BY m.created_at DESC
       LIMIT 5`
    );

    const dashboardData = {
      stats: {
        totalProducts: totalProductsRows[0].total_products,
        lowStockProducts: lowStockRows[0].low_stock_count,
        totalValue: parseInt(totalValueRows[0].total_value || 0),
        recentMovements: recentMovementsRows[0].recent_movements
      },
      lowStockProducts: lowStockProductsRows,
      recentActivity: recentActivityRows
    };

    res.json(dashboardData);
  } catch (err) {
    console.error("Error en GET /api/dashboard:", err);
    res.status(500).json({ error: "Error al obtener datos del dashboard" });
  }
});

// 3. Arrancar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📦 API de inventario escuchando en puerto ${PORT}`);
});

// Export app for external use
module.exports = { app };
