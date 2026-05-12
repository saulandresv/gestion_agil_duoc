# DUOC Inventario

Sistema de gestión de inventario con autenticación por roles y soporte offline, desarrollado como proyecto de Gestión Ágil.

## Stack

- **Frontend:** Vue 3 PWA con autenticación OAuth2
- **API:** Express.js con SQLite
- **Autenticación:** OAuth2 con sistema de roles (RBAC)

## Roles

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | password | Administrador |
| manuel.reyes | password | Supervisor |
| andres.leon | password | Bodeguero |
| andres.perez | password | Operador |

### Permisos por rol

| Función | Admin | Supervisor | Bodeguero | Operador |
|---------|-------|-----------|-----------|---------|
| Gestionar usuarios | ✓ | | | |
| Crear/editar productos | ✓ | ✓ | | |
| Registrar entrada/salida | ✓ | ✓ | ✓ | |
| Visualizar inventario | ✓ | ✓ | ✓ | ✓ |
| Crear solicitudes | | | | ✓ |

## Instalación

```bash
# Variables de entorno
cp .env.sample .env
cp api/.env.sample api/.env
cp front/.env.sample front/.env

# Dependencias
cd front && npm install
cd ../api && npm install
```

## Desarrollo

**Terminal 1 — API:**
```bash
cd api
node index.js
```

**Terminal 2 — Frontend:**
```bash
cd front
npm run serve
```

## Estructura

```
├── front/          # Vue 3 PWA
│   └── src/
│       ├── views/     # Páginas principales
│       ├── services/  # API y autenticación
│       └── utils/     # Utilities y guards de ruta
└── api/            # Express.js
    ├── index.js       # Servidor principal
    ├── oauthModel.js  # Modelo OAuth2
    └── database.js    # Conexión SQLite
```

## Variables de entorno

**API (api/.env):**
```
NODE_ENV=development
PORT=3001
DB_PATH=./inventario.db
```

**Frontend (front/.env):**
```
VUE_APP_API_BASE_URL=http://localhost:3001
```

## Deploy

```bash
# Frontend
cd front && npm run build

# API con PM2
cd api && pm2 start index.js --name inventario-api
```

## Notas técnicas

- Base de datos SQLite en desarrollo, PostgreSQL en producción
- Autenticación OAuth2 con Bearer tokens
- PWA con capacidades offline