# DUOC Inventario

Un sistema integral de gestión de inventario diseñado para operaciones mineras, con una arquitectura multicapa que permite funcionamiento sin conexión y sincronización en tiempo real.

## 🏗️ Arquitectura del Sistema

El sistema está compuesto por tres componentes principales:

### 🖥️ Frontend - Vue 3 PWA

Una Aplicación Web Progresiva (PWA) construida con Vue 3 que proporciona la interfaz principal para la gestión de inventario.

**Características Clave:**
- **Diseño offline-first** con caché en IndexedDB
- **Soporte para autenticación con RFID** junto con inicio de sesión tradicional
- **Indicador de estado de conexión en tiempo real**
- **Interfaz multi-pantalla** con control de acceso por rol
- **Diseño responsivo** optimizado para dispositivos móviles y de escritorio

**Pantallas Principales:**
- **Login / Autenticación RFID** – Autenticación segura de usuarios
- **Panel Principal (Dashboard)** – Centro de navegación con información del usuario
- **Gestión de Inventario** – Listado de productos con búsqueda y filtros
- **Editor de Productos** – CRUD completo para productos
- **Registro de Movimientos** – Registro de entradas, salidas y ajustes de stock
- **Historial de Movimientos** – Registro completo de transacciones con filtros
- **Búsqueda de Solicitudes** – Aprobación o rechazo de solicitudes pendientes

### 🔧 API - Backend con Express.js

Servidor API RESTful que maneja toda la lógica de negocio y las operaciones con la base de datos.

**Características:**
- Integración con base de datos **PostgreSQL**
- Gestión de procesos con **PM2** para despliegue en producción
- Servicio de **autenticación** con gestión de sesiones
- **Validación de stock** y seguimiento de movimientos
- Flujo de trabajo para **aprobación de solicitudes**

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js (versión especificada en `front/.nvmrc`)
- Python 3.x
- Base de datos PostgreSQL
- PM2 instalado globalmente

### Configuración en Desarrollo

1. **Frontend:**
```bash
cd front
nvm use                   # Usar versión específica de Node.js
npm install               # Instalar dependencias
npm run serve             # Iniciar servidor de desarrollo
