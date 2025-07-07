# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an inventory management system called "DUOC-inventario" with three main components:
- **Frontend**: Vue 3 PWA with Vue Router for inventory, movement tracking, and dashboard features
- **API**: Express.js REST API with PostgreSQL database

## Development Commands

### Frontend (Vue 3 PWA)
```bash
cd front                  # Navigate to frontend directory
nvm use                   # Use Node.js version specified in .nvmrc
npm install               # Install dependencies
npm run serve             # Development server with hot reload
npm run build             # Production build
npm run lint              # ESLint with Prettier
```

### API (Express.js)
- Located in `/api` directory
- Uses PM2 for process management
- Connects to PostgreSQL database
- Start with: `pm2 start api/index.js --name inventario-api`

## Architecture

### Frontend Structure
- **Views**: Main application screens (Dashboard, Inventory, Movements, Login)
  - Authentication required for most routes via router guards
  - Offline capability with connection status indicator
- **Services**: 
  - `auth.js`: Authentication state management
  - `api.js`: HTTP client for backend communication
- **Router**: Vue Router with authentication guards in `front/src/router/index.js`

### Authentication Flow
- **OAuth2 Implementation**: API uses express-oauth-server with password grant type
  - Login endpoint: `POST /oauth/token` with `grant_type=password`, `username`, `password`
  - Returns `access_token`, `token_type`, and optional `refresh_token`
  - Protected routes under `/api/*` require Bearer token authentication
- **Frontend Authentication**: 
  - `auth.js` service handles OAuth2 token exchange and storage
  - `api.js` automatically includes Bearer tokens in all API requests
  - Tokens stored in localStorage: `auth_token`, `token_type`, `refresh_token`
- **Route Protection**: Vue Router guards via `meta.requiresAuth`
- **Reactive State**: Centralized authentication state management
- **Auto Redirect**: Unauthenticated users redirected to login

### Data Flow
- Frontend communicates with Express API
- API connects to PostgreSQL for inventory data
- Streamlit dashboard provides analytics interface
- Supports offline functionality as PWA

### Key Features
- Progressive Web App (PWA) capabilities
- Real-time inventory tracking
- Movement/transaction logging
- Search functionality for requests
- Multi-component architecture with separate concerns

## Database
- PostgreSQL database shared between API and Dashboard
- Initialization SQL in `api/ini.sql`