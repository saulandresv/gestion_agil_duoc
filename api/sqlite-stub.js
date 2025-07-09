// Stub implementation of SQLite for demonstration purposes
// This provides a working API without native dependencies

const fs = require('fs');
const path = require('path');

class SQLiteStub {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {};
    this.initializeData();
  }

  initializeData() {
    // Initialize with sample data structure
    this.data = {
      users: [
        { id: 1, username: 'admin', full_name: 'Administrator', password_hash: '$2b$10$i26a98J0hNm1/9TsuSYS6eJxKygQM/v2NAQuxKsxzoEIIw1Rrl9xu', role: 'admin', shift_id: 1 },
        { id: 2, username: 'juan.garcia', full_name: 'Juan García', password_hash: '$2b$10$i26a98J0hNm1/9TsuSYS6eJxKygQM/v2NAQuxKsxzoEIIw1Rrl9xu', role: 'admin', shift_id: 1 },
        { id: 3, username: 'manuel.reyes', full_name: 'Manuel Reyes', password_hash: '$2b$10$i26a98J0hNm1/9TsuSYS6eJxKygQM/v2NAQuxKsxzoEIIw1Rrl9xu', role: 'supervisor', shift_id: 1 },
        { id: 4, username: 'andres.leon', full_name: 'Andrés León', password_hash: '$2b$10$i26a98J0hNm1/9TsuSYS6eJxKygQM/v2NAQuxKsxzoEIIw1Rrl9xu', role: 'storekeeper', shift_id: 1 },
        { id: 5, username: 'andres.perez', full_name: 'Andrés Pérez', password_hash: '$2b$10$i26a98J0hNm1/9TsuSYS6eJxKygQM/v2NAQuxKsxzoEIIw1Rrl9xu', role: 'operador', shift_id: 1 }
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
      location_products: [
        { id: 1, location_id: 1, product_id: 1, stock: 5, minimum_stock: 2 },
        { id: 2, location_id: 1, product_id: 2, stock: 3, minimum_stock: 1 },
        { id: 3, location_id: 1, product_id: 3, stock: 20, minimum_stock: 5 },
        { id: 4, location_id: 1, product_id: 4, stock: 50, minimum_stock: 10 }
      ],
      movements: [
        { id: 1, storekeeper_id: 4, supervisor_id: 3, product_id: 1, type: 'entrada', quantity: 10, reference: 'Initial stock', location_id: 1, created_at: new Date().toISOString() },
        { id: 2, storekeeper_id: 4, supervisor_id: 3, product_id: 1, type: 'salida', quantity: 2, reference: 'Tool checkout', location_id: 1, created_at: new Date().toISOString() }
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
        const user = this.data.users.find(u => u.username === username);
        console.log('Found user:', user ? user.username : 'none');
        return user ? [user] : [];
      }
      return this.data.users;
    }
    
    if (sql.includes('FROM products')) {
      return this.data.products;
    }
    
    if (sql.includes('FROM oauth_clients')) {
      return this.data.oauth_clients;
    }
    
    if (sql.includes('FROM oauth_access_tokens')) {
      return this.data.oauth_access_tokens;
    }
    
    if (sql.includes('FROM location_products')) {
      return this.data.location_products;
    }
    
    if (sql.includes('FROM movements')) {
      return this.data.movements;
    }
    
    // Join queries - simplified
    if (sql.includes('JOIN')) {
      if (sql.includes('location_products') && sql.includes('products')) {
        return this.data.location_products.map(lp => {
          const product = this.data.products.find(p => p.id === lp.product_id);
          const location = this.data.locations.find(l => l.id === lp.location_id);
          const category = this.data.categories.find(c => c.id === product?.category_id);
          
          return {
            id: product?.id,
            sku: product?.sku,
            descripcion: product?.name,
            categoria: category?.name,
            unidad: product?.unit,
            stock: lp.stock,
            ubicacion: location?.name,
            observaciones: product?.description,
            estado: lp.stock > 0 ? 'Activo' : 'Inactivo',
            minimum_stock: lp.minimum_stock,
            location_id: lp.location_id
          };
        });
      }
    }
    
    return [];
  }

  handleInsert(sql, params) {
    const nextId = Math.max(...Object.values(this.data).flat().map(item => item.id || 0)) + 1;
    
    if (sql.includes('oauth_access_tokens')) {
      const token = {
        id: nextId,
        access_token: params[0],
        access_token_expires_at: params[1],
        client_id: params[2],
        user_id: params[3]
      };
      this.data.oauth_access_tokens.push(token);
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
      return { changes: this.data.users.length };
    }
    return { changes: 1 };
  }

  handleDelete(sql, params) {
    return { changes: 1 };
  }
}

module.exports = SQLiteStub;