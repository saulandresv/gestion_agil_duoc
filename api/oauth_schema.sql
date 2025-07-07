-- OAuth 2.0 Tables for express-oauth-server
-- Run this after your main database initialization

-- OAuth Clients table
CREATE TABLE IF NOT EXISTS oauth_clients (
  id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  grants TEXT[] NOT NULL DEFAULT ARRAY['password', 'client_credentials'],
  redirect_uris TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Access Tokens table
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL UNIQUE,
  access_token_expires_at TIMESTAMP NOT NULL,
  client_id TEXT NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Refresh Tokens table (optional, for refresh token flow)
CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id SERIAL PRIMARY KEY,
  refresh_token TEXT NOT NULL UNIQUE,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  client_id TEXT NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default OAuth client
INSERT INTO oauth_clients (id, secret, grants) 
VALUES ('inventario-app', 'your-super-secret-client-secret', ARRAY['password', 'client_credentials'])
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_token ON oauth_access_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_user ON oauth_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_token ON oauth_refresh_tokens(refresh_token);