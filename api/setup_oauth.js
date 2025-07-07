// setup_oauth.js - Initialize OAuth tables and hash existing passwords
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');

// Database connection
const dbConf = {
  user: process.env.DB_USER || 'DUOC',
  database: process.env.DB_NAME || 'inventario', 
  password: process.env.DB_PASS || '712423aA$$',
  port: process.env.DB_PORT || 5432,
  host: process.env.DB_HOST || 'localhost',
};

const pool = new Pool(dbConf);

async function setupOAuth() {
  try {
    console.log('🔧 Setting up OAuth tables and user passwords...');

    // 1. Create OAuth tables
    console.log('📄 Creating OAuth tables...');
    const oauthSchema = fs.readFileSync('./oauth_schema.sql', 'utf8');
    await pool.query(oauthSchema);
    console.log('✅ OAuth tables created successfully');

    // 2. Hash passwords for existing users (if they aren't already hashed)
    console.log('🔐 Checking and hashing user passwords...');
    
    const users = await pool.query('SELECT id, username, password_hash FROM users');
    
    for (const user of users.rows) {
      // Check if password is already hashed (bcrypt hashes start with $2b$)
      if (!user.password_hash.startsWith('$2b$')) {
        console.log(`🔄 Hashing password for user: ${user.username}`);
        
        // Hash the plain text password
        const hashedPassword = await bcrypt.hash(user.password_hash, 10);
        
        // Update the user with hashed password
        await pool.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [hashedPassword, user.id]
        );
        
        console.log(`✅ Password hashed for user: ${user.username}`);
      } else {
        console.log(`ℹ️  Password already hashed for user: ${user.username}`);
      }
    }

    // 3. Verify OAuth client exists
    console.log('🔑 Verifying OAuth client...');
    const client = await pool.query('SELECT id FROM oauth_clients WHERE id = $1', ['inventario-app']);
    
    if (client.rows.length > 0) {
      console.log('✅ OAuth client exists');
    } else {
      console.log('❌ OAuth client not found - check oauth_schema.sql');
    }

    console.log('\n🎉 OAuth setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Install bcrypt: npm install');
    console.log('2. Restart your API server');
    console.log('3. Test OAuth login with:');
    console.log('   POST /oauth/token');
    console.log('   {');
    console.log('     "grant_type": "password",');
    console.log('     "client_id": "inventario-app",');
    console.log('     "client_secret": "your-super-secret-client-secret",');
    console.log('     "username": "[any existing username]",');
    console.log('     "password": "[user password]"');
    console.log('   }');

  } catch (error) {
    console.error('❌ Error setting up OAuth:', error);
  } finally {
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupOAuth();
}

module.exports = { setupOAuth };