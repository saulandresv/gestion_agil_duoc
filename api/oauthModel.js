// api/oauthModel.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database connection using same config as main app
const dbConf = {
  user: process.env.DB_USER || 'DUOC',
  database: process.env.DB_NAME || 'inventario', 
  password: process.env.DB_PASS || '712423aA$$',
  port: process.env.DB_PORT || 5432,
  host: process.env.DB_HOST || 'localhost',
};

const pool = new Pool(dbConf);

module.exports = {
  // Validate OAuth client credentials
  async getClient(clientId, clientSecret) {
    try {
      const result = await pool.query(
        'SELECT id, secret, grants FROM oauth_clients WHERE id = $1',
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
        grants: client.grants || ['password', 'client_credentials'],
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
      const result = await pool.query(
        'SELECT id, username, password_hash, full_name, role FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      
      // Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      };
    } catch (error) {
      console.error('Error in getUser:', error);
      return null;
    }
  },

  // Save access token to database
  async saveToken(token, client, user) {
    try {
      const result = await pool.query(
        `INSERT INTO oauth_access_tokens 
         (access_token, access_token_expires_at, client_id, user_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [
          token.accessToken,
          token.accessTokenExpiresAt,
          client.id,
          user ? user.id : null
        ]
      );

      // Also save refresh token if provided
      if (token.refreshToken) {
        await pool.query(
          `INSERT INTO oauth_refresh_tokens 
           (refresh_token, refresh_token_expires_at, client_id, user_id) 
           VALUES ($1, $2, $3, $4)`,
          [
            token.refreshToken,
            token.refreshTokenExpiresAt,
            client.id,
            user ? user.id : null
          ]
        );
      }

      return {
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
        client: { id: client.id },
        user: user ? { 
          id: user.id, 
          username: user.username,
          fullName: user.fullName,
          role: user.role
        } : null
      };
    } catch (error) {
      console.error('Error in saveToken:', error);
      return null;
    }
  },

  // Retrieve access token from database
  async getAccessToken(bearerToken) {
    try {
      const result = await pool.query(
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
         WHERE t.access_token = $1`,
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
          grants: tokenData.grants 
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
      const result = await pool.query(
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
         WHERE t.refresh_token = $1`,
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
          grants: tokenData.grants 
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
      await pool.query(
        'DELETE FROM oauth_access_tokens WHERE access_token = $1',
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
      await pool.query(
        'DELETE FROM oauth_access_tokens WHERE access_token_expires_at < $1',
        [now]
      );
      await pool.query(
        'DELETE FROM oauth_refresh_tokens WHERE refresh_token_expires_at < $1',
        [now]
      );
      return true;
    } catch (error) {
      console.error('Error in cleanupExpiredTokens:', error);
      return false;
    }
  }
};