// Shared database connection using singleton pattern
const Database = require('./sqlite-stub');

class DatabaseManager {
  constructor() {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }
    
    const dbPath = process.env.DB_PATH || './inventario.db';
    this.db = new Database(dbPath);
    
    // Enable foreign key constraints and WAL mode for better performance
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    
    console.log('✅ Shared database connection established');
    console.log('📝 Database file: ' + dbPath);
    console.log('🔧 Using singleton SQLite stub instance');
    
    DatabaseManager.instance = this;
  }

  getDb() {
    return this.db;
  }

  // Helper function to convert PostgreSQL queries to SQLite
  async query(sql, params = []) {
    try {
      // Convert PostgreSQL placeholders ($1, $2) to SQLite (?)
      let sqliteSQL = sql.replace(/\$\d+/g, '?');
      
      // Convert PostgreSQL-specific functions to SQLite equivalents
      sqliteSQL = sqliteSQL.replace(/NOW\(\)/g, "datetime('now')");
      sqliteSQL = sqliteSQL.replace(/CURRENT_TIMESTAMP/g, "datetime('now')");
      sqliteSQL = sqliteSQL.replace(/COALESCE\(/g, 'IFNULL(');
      sqliteSQL = sqliteSQL.replace(/::int/g, '');
      sqliteSQL = sqliteSQL.replace(/::timestamp/g, '');
      sqliteSQL = sqliteSQL.replace(/JSONB/g, 'TEXT');
      
      if (sqliteSQL.trim().toUpperCase().startsWith('SELECT')) {
        const rows = this.db.prepare(sqliteSQL).all(params);
        return { rows };
      } else {
        const result = this.db.prepare(sqliteSQL).run(params);
        return { rows: [{ id: result.lastInsertRowid, changes: result.changes }] };
      }
    } catch (error) {
      console.error('Database query error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  // Create a pool-like interface for compatibility
  getPool() {
    return {
      query: this.query.bind(this),
      connect: () => ({ 
        query: this.query.bind(this), 
        release: () => {} 
      })
    };
  }
}

// Export singleton instance
const dbManager = new DatabaseManager();
module.exports = dbManager;