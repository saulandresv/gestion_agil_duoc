// Stub implementation of SQLite for demonstration purposes
// This provides a working API without native dependencies

const fs = require('fs');
const path = require('path');

class SQLiteStub {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {};
    this.initializeData();
    this.loadFromFile();
  }

  initializeData() {
    // Initialize with sample data structure
    this.data = {
      users: [
        { id: 1, username: 'admin', full_name: 'Administrator', password_hash: '$2b$10$i26a98J0hNm1/9TsuSYS6eJxKygQM/v2NAQuxKsxzoEIIw1Rrl9xu', role: 'admin', shift_id: 1, created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
        { id: 2, username: 'juan.garcia', full_name: 'Juan García', password_hash: '$2b$10$i26a98J0hNm1/9TsuSYS6eJxKygQM/v2NAQuxKsxzoEIIw1Rrl9xu', role: 'admin', shift_id: 1, created_at: new Date(Date.now() - 86400000 * 25).toISOString() },
        { id: 3, username: 'manuel.reyes', full_name: 'Manuel Reyes', password_hash: '$2b$10$i26a98J0hNm1/9TsuSYS6eJxKygQM/v2NAQuxKsxzoEIIw1Rrl9xu', role: 'supervisor', shift_id: 1, created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
        { id: 4, username: 'andres.leon', full_name: 'Andrés León', password_hash: '$2b$10$i26a98J0hNm1/9TsuSYS6eJxKygQM/v2NAQuxKsxzoEIIw1Rrl9xu', role: 'storekeeper', shift_id: 1, created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
        { id: 5, username: 'andres.perez', full_name: 'Andrés Pérez', password_hash: '$2b$10$i26a98J0hNm1/9TsuSYS6eJxKygQM/v2NAQuxKsxzoEIIw1Rrl9xu', role: 'operador', shift_id: 1, created_at: new Date(Date.now() - 86400000 * 10).toISOString() }
      ],
      products: [
        { id: 1, sku: 'SKU0001', name: 'Martillo perforador SDS-Max', description: 'Martillo eléctrico para perforación de roca', unit: 'EA', is_returnable: 1, category_id: 1 },
        { id: 2, sku: 'SKU0002', name: 'Taladro neumático 1"', description: 'Taladro de impacto para barrenos cortos', unit: 'EA', is_returnable: 1, category_id: 1 },
        { id: 3, sku: 'SKU0041', name: 'Casco seguridad clase E', description: 'Casco dieléctrico color amarillo', unit: 'EA', is_returnable: 1, category_id: 2 },
        { id: 4, sku: 'SKU0071', name: 'Broca SDS-Plus 14 mm', description: 'Broca perforación concreto', unit: 'EA', is_returnable: 0, category_id: 3 }
      ],
      categories: [
        { id: 1, name: 'Herramientas', description: 'Herramientas manuales y eléctricas' },
        { id: 2, name: 'EPP', description: 'Elementos de Protección Personal' },
        { id: 3, name: 'Consumibles', description: 'Materiales de consumo y desgaste' }
      ],
      locations: [
        { id: 1, code: 'CR', name: 'Chancado Rosario', description: 'Primary crushing area' }
      ],
      shifts: [
        { id: 1, code: 'G21', start_time: '07:00', end_time: '19:00', cycle_start_day: 'Thursday', cycle_end_day: 'Wednesday' },
        { id: 2, code: 'G22', start_time: '19:00', end_time: '07:00', cycle_start_day: 'Thursday', cycle_end_day: 'Wednesday' }
      ],
      location_products: [
        { id: 1, location_id: 1, product_id: 1, stock: 5, minimum_stock: 2 },
        { id: 2, location_id: 1, product_id: 2, stock: 3, minimum_stock: 1 },
        { id: 3, location_id: 1, product_id: 3, stock: 20, minimum_stock: 5 },
        { id: 4, location_id: 1, product_id: 4, stock: 50, minimum_stock: 10 }
      ],
      movements: [
        { id: 1, storekeeper_id: 4, supervisor_id: 3, product_id: 1, type: 'entrada', quantity: 10, reference: 'Initial stock', location_id: 1, created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 2, storekeeper_id: 4, supervisor_id: 3, product_id: 1, type: 'salida', quantity: 2, reference: 'Tool checkout', location_id: 1, created_at: new Date(Date.now() - 43200000).toISOString() },
        { id: 3, storekeeper_id: 4, supervisor_id: 3, product_id: 2, type: 'entrada', quantity: 5, reference: 'Equipment received', location_id: 1, created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 4, storekeeper_id: 4, supervisor_id: 3, product_id: 3, type: 'salida', quantity: 3, reference: 'Safety equipment checkout', location_id: 1, created_at: new Date().toISOString() }
      ],
      oauth_clients: [
        { id: 'inventario-app', secret: 'inventario-secret', grants: 'password,client_credentials' }
      ],
      oauth_access_tokens: [],
      oauth_refresh_tokens: []
    };
  }

  pragma(setting) {
    // Stub implementation
    console.log(`PRAGMA ${setting} executed (stub)`);
  }

  prepare(sql) {
    return {
      all: (params = []) => this.executeQuery(sql, params),
      run: (params = []) => this.executeQuery(sql, params),
      get: (params = []) => {
        const results = this.executeQuery(sql, params);
        return results[0] || null;
      }
    };
  }

  exec(sql) {
    console.log('Executing schema (stub):', sql.substring(0, 100) + '...');
    // For demo purposes, we'll just log that the schema was executed
    return true;
  }

  executeQuery(sql, params = []) {
    console.log('Executing query (stub):', sql.substring(0, 100) + '...');
    console.log('Query params:', params);
    
    // Convert SQL to basic operations
    const upperSQL = sql.toUpperCase().trim();
    
    if (upperSQL.includes('SELECT')) {
      return this.handleSelect(sql, params);
    } else if (upperSQL.includes('INSERT')) {
      return this.handleInsert(sql, params);
    } else if (upperSQL.includes('UPDATE')) {
      return this.handleUpdate(sql, params);
    } else if (upperSQL.includes('DELETE')) {
      return this.handleDelete(sql, params);
    }
    
    return [];
  }

  handleSelect(sql, params) {
    // Simple stub implementation for common queries
    if (sql.includes('sqlite_master')) {
      return [{ name: 'products' }]; // Simulate that tables exist
    }
    
    // Handle datetime() queries for health check
    if (sql.includes('datetime()')) {
      return [{ timestamp: new Date().toISOString() }];
    }
    
    if (sql.includes('FROM users')) {
      if (sql.includes('WHERE username')) {
        const username = Array.isArray(params) ? params[0] : params;
        console.log('Searching for username:', username);
        console.log('Available users:', this.data.users.map(u => u.username));
        const user = this.data.users.find(u => u.username === username);
        console.log('Found user:', user ? user.username : 'none');
        if (user) {
          console.log('User details:', { id: user.id, username: user.username, role: user.role });
        }
        return user ? [user] : [];
      }
      if (sql.includes('WHERE id')) {
        const userId = Array.isArray(params) ? params[0] : params;
        console.log('Searching for user ID:', userId);
        console.log('Available user IDs:', this.data.users.map(u => u.id));
        const user = this.data.users.find(u => u.id === userId);
        console.log('Found user by ID:', user ? user.username : 'none');
        if (user) {
          console.log('User details by ID:', { id: user.id, username: user.username, role: user.role });
        }
        return user ? [user] : [];
      }
      // For general user listing, return users ordered by created_at DESC
      if (sql.includes('ORDER BY created_at DESC')) {
        return [...this.data.users].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }
      return this.data.users;
    }
    
    if (sql.includes('FROM products')) {
      if (sql.includes('LEFT JOIN')) {
        // Handle products with joins
        const result = this.data.products.map(product => {
          const lp = this.data.location_products.find(lp => lp.product_id === product.id);
          const location = this.data.locations.find(l => l.id === lp?.location_id);
          const category = this.data.categories.find(c => c.id === product.category_id);
          
          return {
            id: product.id,
            sku: product.sku,
            descripcion: product.name,
            categoria: category?.name || 'Sin categoría',
            unidad: product.unit,
            stock: lp?.stock || 0,
            ubicacion: location?.name || 'Sin ubicación',
            observaciones: product.description || '',
            estado: (lp?.stock || 0) > 0 ? 'Activo' : 'Inactivo',
            minimum_stock: lp?.minimum_stock || 0,
            location_id: lp?.location_id || null
          };
        });
        console.log('Products query result:', result);
        return result;
      }
      return this.data.products;
    }
    
    if (sql.includes('FROM oauth_clients')) {
      return this.data.oauth_clients;
    }
    
    if (sql.includes('FROM oauth_access_tokens')) {
      // Handle access tokens query with proper Date conversion and JOINs
      if (sql.includes('WHERE access_token') || sql.includes('WHERE t.access_token')) {
        const accessToken = Array.isArray(params) ? params[0] : params;
        const token = this.data.oauth_access_tokens.find(t => t.access_token === accessToken);
        if (token) {
          // Get user and client info for JOIN
          const user = this.data.users.find(u => u.id === token.user_id);
          const client = this.data.oauth_clients.find(c => c.id === token.client_id);
          
          // Ensure expires_at is a Date object
          const result = {
            ...token,
            access_token_expires_at: token.access_token_expires_at instanceof Date 
              ? token.access_token_expires_at 
              : new Date(token.access_token_expires_at),
            // Add joined fields for getAccessToken query
            username: user?.username || null,
            role: user?.role || null,
            full_name: user?.full_name || null,
            grants: client?.grants || null
          };
          console.log('Access token query result:', {
            token_id: result.id,
            user_id: result.user_id,
            username: result.username,
            role: result.role,
            expires_at: result.access_token_expires_at,
            expires_at_type: typeof result.access_token_expires_at,
            is_date: result.access_token_expires_at instanceof Date
          });
          return [result];
        }
        return [];
      }
      return this.data.oauth_access_tokens;
    }
    
    if (sql.includes('FROM location_products')) {
      return this.data.location_products;
    }
    
    if (sql.includes('FROM movements')) {
      if (sql.includes('JOIN')) {
        // Handle movements with joins for the frontend
        const result = this.data.movements.map(movement => {
          const product = this.data.products.find(p => p.id === movement.product_id);
          const supervisor = this.data.users.find(u => u.id === movement.supervisor_id);
          const storekeeper = this.data.users.find(u => u.id === movement.storekeeper_id);
          const location = this.data.locations.find(l => l.id === movement.location_id);
          
          return {
            id: movement.id,
            producto: product?.name || `Producto ${movement.product_id}`,
            accion: movement.type,
            cantidad: movement.quantity,
            supervisor: supervisor?.full_name || 'Sin supervisor',
            solicitante: 'Sin solicitante', // This field doesn't exist in current data structure
            bodeguero: storekeeper?.full_name || 'Sin bodeguero',
            ubicacion: location?.name || 'Sin ubicación',
            observaciones: movement.reference || '',
            fecha: movement.created_at
          };
        }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Sort by date descending
        console.log('Movements query result:', result);
        return result;
      }
      return this.data.movements;
    }
    
    if (sql.includes('FROM shifts')) {
      return this.data.shifts;
    }
    
    // Join queries - simplified
    if (sql.includes('JOIN')) {
      if (sql.includes('location_products') && sql.includes('products')) {
        return this.data.location_products.map(lp => {
          const product = this.data.products.find(p => p.id === lp.product_id);
          const location = this.data.locations.find(l => l.id === lp.location_id);
          const category = this.data.categories.find(c => c.id === product?.category_id);
          
          return {
            id: product?.id || lp.product_id,
            sku: product?.sku || `SKU-${lp.product_id}`,
            descripcion: product?.name || `Producto ${lp.product_id}`,
            categoria: category?.name || 'Sin categoría',
            unidad: product?.unit || 'EA',
            stock: lp.stock || 0,
            ubicacion: location?.name || 'Sin ubicación',
            observaciones: product?.description || '',
            estado: (lp.stock || 0) > 0 ? 'Activo' : 'Inactivo',
            minimum_stock: lp.minimum_stock || 0,
            location_id: lp.location_id
          };
        }).filter(item => item.descripcion); // Only return items with descripcion
      }
    }
    
    return [];
  }

  handleInsert(sql, params) {
    const allItems = Object.values(this.data).flat();
    const validIds = allItems.map(item => item.id).filter(id => id !== null && id !== undefined && typeof id === 'number');
    const nextId = validIds.length > 0 ? Math.max(...validIds) + 1 : 1;
    
    if (sql.includes('oauth_access_tokens')) {
      const token = {
        id: nextId,
        access_token: params[0],
        access_token_expires_at: params[1] instanceof Date ? params[1] : new Date(params[1]),
        client_id: params[2],
        user_id: params[3]
      };
      this.data.oauth_access_tokens.push(token);
      this.saveToFile();
      return { lastInsertRowid: nextId, changes: 1 };
    }
    
    if (sql.includes('movements')) {
      const movement = {
        id: nextId,
        product_id: params[0],
        type: params[1],
        quantity: params[2],
        supervisor_id: params[3],
        storekeeper_id: params[4],
        location_id: params[5],
        reference: params[6],
        created_at: params[7] || new Date().toISOString()
      };
      this.data.movements.push(movement);
      this.saveToFile();
      return { lastInsertRowid: nextId, changes: 1 };
    }

    if (sql.includes('users')) {
      const user = {
        id: nextId,
        username: params[0],
        full_name: params[1],
        password_hash: params[2],
        role: params[3],
        shift_id: params[4],
        created_at: params[5] || new Date().toISOString()
      };
      this.data.users.push(user);
      this.saveToFile();
      console.log('User added:', user.username, 'Total users:', this.data.users.length);
      console.log('All usernames:', this.data.users.map(u => u.username));
      return { lastInsertRowid: nextId, changes: 1 };
    }
    
    return { lastInsertRowid: nextId, changes: 1 };
  }

  handleUpdate(sql, params) {
    if (sql.includes('users') && sql.includes('SET password_hash')) {
      // Update all users with the new password hash
      this.data.users.forEach(user => {
        user.password_hash = params[0];
      });
      this.saveToFile();
      return { changes: this.data.users.length };
    }
    return { changes: 1 };
  }

  handleDelete(sql, params) {
    return { changes: 1 };
  }

  // File persistence methods
  loadFromFile() {
    try {
      if (fs.existsSync(this.dbPath + '.json')) {
        const fileData = fs.readFileSync(this.dbPath + '.json', 'utf8');
        const parsedData = JSON.parse(fileData);
        this.data = { ...this.data, ...parsedData };
        console.log('✅ Loaded data from file persistence');
      }
    } catch (error) {
      console.log('📝 No existing data file found, using defaults');
    }
  }

  saveToFile() {
    try {
      fs.writeFileSync(this.dbPath + '.json', JSON.stringify(this.data, null, 2));
      console.log('💾 Data saved to file persistence');
      // Force reload to ensure consistency
      this.loadFromFile();
    } catch (error) {
      console.error('Error saving data to file:', error);
    }
  }
}

module.exports = SQLiteStub;