// api/oauthModel.js
// Use shared database connection
const dbManager = require('./database');
const bcrypt = require('bcrypt');

// Use shared database connection
const db = dbManager.getDb();
const query = dbManager.query.bind(dbManager);

console.log('✅ OAuth using shared database connection');

// Create OAuth tables if they don't exist
const initializeOAuthTables = async () => {
  try {
    // Create OAuth clients table
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_clients (
        id TEXT PRIMARY KEY,
        secret TEXT,
        grants TEXT,
        redirect_uris TEXT
      )
    `);
    
    // Create OAuth access tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_access_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        access_token TEXT UNIQUE NOT NULL,
        access_token_expires_at TIMESTAMP NOT NULL,
        client_id TEXT NOT NULL,
        user_id INTEGER,
        FOREIGN KEY (client_id) REFERENCES oauth_clients(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Create OAuth refresh tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        refresh_token TEXT UNIQUE NOT NULL,
        refresh_token_expires_at TIMESTAMP NOT NULL,
        client_id TEXT NOT NULL,
        user_id INTEGER,
        FOREIGN KEY (client_id) REFERENCES oauth_clients(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Insert default OAuth client
    const insertClient = db.prepare(`
      INSERT OR IGNORE INTO oauth_clients (id, secret, grants)
      VALUES (?, ?, ?)
    `);
    insertClient.run('inventario-app', 'inventario-secret', 'password,client_credentials');
    
    console.log('OAuth tables initialized successfully');
  } catch (error) {
    console.error('Error initializing OAuth tables:', error);
  }
};

// Initialize OAuth tables
initializeOAuthTables();

module.exports = {
  // Validate OAuth client credentials
  async getClient(clientId, clientSecret) {
    try {
      const result = await query(
        'SELECT id, secret, grants FROM oauth_clients WHERE id = ?',
        [clientId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const client = result.rows[0];
      
      // If clientSecret is provided, verify it
      if (clientSecret && client.secret !== clientSecret) {
        return null;
      }

      return {
        id: client.id,
        grants: client.grants ? client.grants.split(',') : ['password', 'client_credentials'],
        redirectUris: client.redirect_uris
      };
    } catch (error) {
      console.error('Error in getClient:', error);
      return null;
    }
  },

  // Authenticate user with username/password
  async getUser(username, password) {
    try {
      console.log('getUser called with username:', username);
      const result = await query(
        'SELECT id, username, password_hash, full_name, role FROM users WHERE username = ?',
        [username]
      );

      console.log('Query result:', result.rows.length, 'rows');
      if (result.rows.length === 0) {
        console.log('No user found with username:', username);
        return null;
      }

      const user = result.rows[0];
      console.log('Found user:', { id: user.id, username: user.username, role: user.role });
      
      // Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('Password validation result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('Invalid password for user:', username);
        return null;
      }

      const userResult = {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      };
      console.log('Returning user:', userResult);
      return userResult;
    } catch (error) {
      console.error('Error in getUser:', error);
      return null;
    }
  },

  // Save access token to database
  async saveToken(token, client, user) {
    try {
      console.log('saveToken called with token:', {
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        accessTokenExpiresAtType: typeof token.accessTokenExpiresAt,
        isDate: token.accessTokenExpiresAt instanceof Date
      });
      
      const result = await query(
        `INSERT INTO oauth_access_tokens 
         (access_token, access_token_expires_at, client_id, user_id) 
         VALUES (?, ?, ?, ?)`,
        [
          token.accessToken,
          token.accessTokenExpiresAt,
          client.id,
          user ? user.id : null
        ]
      );

      // Also save refresh token if provided
      if (token.refreshToken) {
        await query(
          `INSERT INTO oauth_refresh_tokens 
           (refresh_token, refresh_token_expires_at, client_id, user_id) 
           VALUES (?, ?, ?, ?)`,
          [
            token.refreshToken,
            token.refreshTokenExpiresAt,
            client.id,
            user ? user.id : null
          ]
        );
      }

      const returnToken = {
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt instanceof Date ? token.accessTokenExpiresAt : new Date(token.accessTokenExpiresAt),
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt instanceof Date ? token.refreshTokenExpiresAt : new Date(token.refreshTokenExpiresAt),
        client: { id: client.id },
        user: user ? { 
          id: user.id, 
          username: user.username,
          fullName: user.fullName,
          role: user.role
        } : null
      };
      
      console.log('saveToken returning:', {
        accessTokenExpiresAt: returnToken.accessTokenExpiresAt,
        accessTokenExpiresAtType: typeof returnToken.accessTokenExpiresAt,
        isDate: returnToken.accessTokenExpiresAt instanceof Date
      });
      
      return returnToken;
    } catch (error) {
      console.error('Error in saveToken:', error);
      return null;
    }
  },

  // Retrieve access token from database
  async getAccessToken(bearerToken) {
    try {
      const result = await query(
        `SELECT 
           t.access_token,
           t.access_token_expires_at,
           t.client_id,
           t.user_id,
           c.grants,
           u.username,
           u.role
         FROM oauth_access_tokens t
         LEFT JOIN oauth_clients c ON t.client_id = c.id
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.access_token = ?`,
        [bearerToken]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tokenData = result.rows[0];

      // Check if token is expired
      if (new Date() > tokenData.access_token_expires_at) {
        // Remove expired token
        await this.revokeToken(bearerToken);
        return null;
      }

      return {
        accessToken: tokenData.access_token,
        accessTokenExpiresAt: tokenData.access_token_expires_at,
        client: { 
          id: tokenData.client_id,
          grants: tokenData.grants ? tokenData.grants.split(',') : ['password', 'client_credentials']
        },
        user: tokenData.user_id ? {
          id: tokenData.user_id,
          username: tokenData.username,
          role: tokenData.role
        } : null
      };
    } catch (error) {
      console.error('Error in getAccessToken:', error);
      return null;
    }
  },

  // Get refresh token (for refresh token flow)
  async getRefreshToken(refreshToken) {
    try {
      const result = await query(
        `SELECT 
           t.refresh_token,
           t.refresh_token_expires_at,
           t.client_id,
           t.user_id,
           c.grants,
           u.username
         FROM oauth_refresh_tokens t
         LEFT JOIN oauth_clients c ON t.client_id = c.id
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.refresh_token = ?`,
        [refreshToken]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tokenData = result.rows[0];

      return {
        refreshToken: tokenData.refresh_token,
        refreshTokenExpiresAt: tokenData.refresh_token_expires_at,
        client: { 
          id: tokenData.client_id,
          grants: tokenData.grants ? tokenData.grants.split(',') : ['password', 'client_credentials']
        },
        user: tokenData.user_id ? {
          id: tokenData.user_id,
          username: tokenData.username
        } : null
      };
    } catch (error) {
      console.error('Error in getRefreshToken:', error);
      return null;
    }
  },

  // Revoke token (logout)
  async revokeToken(token) {
    try {
      await query(
        'DELETE FROM oauth_access_tokens WHERE access_token = ?',
        [token.accessToken || token]
      );
      return true;
    } catch (error) {
      console.error('Error in revokeToken:', error);
      return false;
    }
  },

  // Cleanup expired tokens (maintenance function)
  async cleanupExpiredTokens() {
    try {
      const now = new Date();
      await query(
        'DELETE FROM oauth_access_tokens WHERE access_token_expires_at < ?',
        [now]
      );
      await query(
        'DELETE FROM oauth_refresh_tokens WHERE refresh_token_expires_at < ?',
        [now]
      );
      return true;
    } catch (error) {
      console.error('Error in cleanupExpiredTokens:', error);
      return false;
    }
  }
};