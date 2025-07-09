# DUOC Inventario

Sistema de gestión de inventario con autenticación por roles y funcionalidad offline.

## 🏗️ Arquitectura

- **Frontend**: Vue 3 PWA con autenticación OAuth2
- **API**: Express.js con SQLite (modo desarrollo)
- **Autenticación**: Sistema de roles (admin, supervisor, storekeeper, operador)

## 🚀 Instalación

### 1. Configurar variables de entorno

```bash
# Copiar archivos de configuración
cp .env.sample .env
cp api/.env.sample api/.env
```

### 2. Instalar dependencias

**Frontend:**
```bash
cd front
npm install
```

**API:**
```bash
cd api
npm install
```

### 3. Iniciar en desarrollo

**Terminal 1 - API:**
```bash
cd api
node index.js
```

**Terminal 2 - Frontend:**
```bash
cd front
npm run serve
```

## 🔑 Usuarios predeterminados

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | password | Administrador |
| manuel.reyes | password | Supervisor |
| andres.leon | password | Bodeguero |
| andres.perez | password | Operador |

## 📱 Funcionalidades por Rol

### 👑 Administrador
- Crear y gestionar usuarios
- Acceso completo al sistema
- Asignar permisos por rol

### 👨‍💼 Supervisor
- Registrar entrada/salida de componentes
- Buscar componentes
- Visualizar inventario
- Crear y editar productos

### 📦 Bodeguero
- Registrar entrada/salida de componentes
- Buscar componentes
- Visualizar inventario

### 👷 Operador
- Visualizar inventario (solo lectura)
- Crear solicitudes de componentes

## 🛠️ Comandos útiles

```bash
# Instalar dependencias frontend
cd front && npm install

# Servir frontend en desarrollo
cd front && npm run serve

# Construir para producción
cd front && npm run build

# Linter
cd front && npm run lint

# Iniciar API
cd api && node index.js

# Ver logs en tiempo real
cd api && tail -f logs/app.log
```

## 📁 Estructura del proyecto

```
├── front/          # Vue 3 PWA
│   ├── src/
│   │   ├── views/     # Páginas principales
│   │   ├── services/  # API y autenticación
│   │   └── utils/     # Utilidades y guards
├── api/            # Express.js API
│   ├── index.js       # Servidor principal
│   ├── oauthModel.js  # Modelo OAuth2
│   └── database.js    # Conexión BD compartida
└── README.md
```

## 🔧 Configuración

### Variables de entorno (.env)
```env
NODE_ENV=development
PORT=3001
DB_PATH=./inventario.db
```

### Variables de entorno frontend (front/.env)
```env
VUE_APP_API_BASE_URL=http://localhost:3001
```

## 🚀 Despliegue

### Frontend
```bash
cd front
npm run build
# Servir desde dist/
```

### API
```bash
cd api
pm2 start index.js --name inventario-api
```

## 📋 Notas técnicas

- **Base de datos**: SQLite en desarrollo, PostgreSQL en producción
- **Autenticación**: OAuth2 con Bearer tokens
- **Persistencia**: Archivo JSON para desarrollo
- **Roles**: Control de acceso basado en roles (RBAC)
- **Offline**: PWA con capacidades offline