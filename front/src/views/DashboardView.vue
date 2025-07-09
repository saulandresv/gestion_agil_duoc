<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p class="subtitulo">Acceso a tareas diarias</p>

    <!-- Access denied message -->
    <div v-if="accessDeniedMessage" class="access-denied-message">
      <p>⚠️ {{ accessDeniedMessage }}</p>
    </div>

    <div class="acciones">
      <template v-for="action in availableActions" :key="action.name">
        <button class="accion-btn" @click="action.handler">
          {{ action.icon }} {{ action.name }}
        </button>
      </template>
    </div>
  </div>
</template>

<script>
import roleGuard from "@/utils/roleGuard";

export default {
  name: "DashboardView",
  data() {
    return {
      accessDeniedMessage: null,
    };
  },
  mounted() {
    // Check for access denied message in query params
    if (this.$route.query.error === "access_denied") {
      this.accessDeniedMessage = this.$route.query.message || "Acceso denegado";

      // Clear the message after 5 seconds
      setTimeout(() => {
        this.accessDeniedMessage = null;
      }, 5000);
    }
  },
  computed: {
    availableActions() {
      roleGuard.getUserRole();
      const actions = [];

      // Common actions for all roles
      if (roleGuard.hasPermission("inventory.view")) {
        actions.push({
          name: "Inventario",
          icon: "📦",
          handler: () => this.$router.push({ name: "Inventario" }),
        });
      }

      if (roleGuard.hasPermission("movements.view")) {
        actions.push({
          name: "Movimientos",
          icon: "🔄",
          handler: () => this.$router.push({ name: "Movimientos" }),
        });
      }

      if (roleGuard.hasPermission("movements.create")) {
        actions.push({
          name: "Crear Movimiento",
          icon: "➕",
          handler: () => this.$router.push({ name: "CrearMovimiento" }),
        });
      }

      if (roleGuard.hasPermission("inventory.search")) {
        actions.push({
          name: "Buscar Solicitud",
          icon: "🔍",
          handler: () => this.$router.push({ name: "BuscarSolicitud" }),
        });
      }

      if (roleGuard.hasPermission("requests.view")) {
        actions.push({
          name: "Solicitudes Pendientes",
          icon: "⏳",
          handler: () => this.$router.push({ name: "RequestsPendientes" }),
        });
      }

      // Admin-specific actions
      if (roleGuard.hasPermission("users.create")) {
        actions.push({
          name: "Crear Usuario",
          icon: "👤",
          handler: () => this.$router.push({ name: "CreateUser" }),
        });
      }

      return actions;
    },
  },
  methods: {
    // Keep legacy methods for backward compatibility
    irAInventario() {
      this.$router.push({ name: "Inventario" });
    },
    irAMovimientos() {
      this.$router.push({ name: "Movimientos" });
    },
    crearMovimiento() {
      this.$router.push({ name: "CrearMovimiento" });
    },
    buscarSolicitud() {
      this.$router.push({ name: "BuscarSolicitud" });
    },
  },
};
</script>

<style scoped>
.dashboard {
  padding: 2rem;
  text-align: center;
  font-family: "Segoe UI", sans-serif;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitulo {
  color: #666;
  margin-bottom: 1.5rem;
}

.access-denied-message {
  background-color: #ffebee;
  border: 1px solid #f8bbd9;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  color: #d32f2f;
  font-weight: 500;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.usuario {
  font-size: 1rem;
  margin-bottom: 2rem;
  color: #444;
}

.acciones {
  display: flex;
  gap: 1rem;
  justify-items: center;
  justify-content: center;
  align-items: center;
  margin-top: 2rem;
  flex-wrap: wrap;
}
@media (max-width: 600px) {
  .acciones {
    grid-template-columns: 1fr;
  }
}

.accion-btn {
  width: 10rem;
  height: 10rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 1rem;
  font-weight: bold;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
  text-align: center;
}
.accion-btn:hover {
  background: #145ca0;
}
</style>
