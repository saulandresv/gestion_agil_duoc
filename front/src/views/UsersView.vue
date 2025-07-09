<template>
  <div class="users">
    <h1>Lista de Usuarios</h1>
    <p class="subtitulo">Gestión de usuarios del sistema</p>

    <!-- Actions -->
    <div class="actions">
      <button
        v-if="roleGuard.hasPermission('users.create')"
        @click="goToCreateUser"
        class="btn-primary"
      >
        ➕ Crear Usuario
      </button>
      <button @click="loadUsers" class="btn-secondary">
        🔄 Actualizar Lista
      </button>
    </div>

    <!-- Search -->
    <input
      type="text"
      v-model="searchFilter"
      placeholder="🔍 Buscar usuario..."
      class="search-input"
    />

    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <p>Cargando usuarios...</p>
    </div>

    <!-- Error state -->
    <div v-if="error" class="error-message">
      <p>❌ {{ error }}</p>
      <button @click="loadUsers" class="btn-retry">Reintentar</button>
    </div>

    <!-- Users table -->
    <div v-if="!loading && !error" class="table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Usuario</th>
            <th>Nombre Completo</th>
            <th>Rol</th>
            <th>Turno</th>
            <th>Fecha Creación</th>
            <th v-if="roleGuard.hasPermission('users.manage')">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.full_name }}</td>
            <td>
              <span :class="getRoleClass(user.role)">
                {{ getRoleLabel(user.role) }}
              </span>
            </td>
            <td>{{ getShiftLabel(user.shift_id) }}</td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td
              v-if="roleGuard.hasPermission('users.manage')"
              class="actions-cell"
            >
              <button @click="editUser(user)" class="btn-edit" title="Editar">
                ✏️
              </button>
              <button
                @click="deleteUser(user)"
                class="btn-delete"
                title="Eliminar"
                v-if="user.id !== currentUser.id"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state -->
      <div v-if="filteredUsers.length === 0" class="empty-state">
        <p>No se encontraron usuarios</p>
      </div>
    </div>
  </div>
</template>

<script>
import api from "../services/api.js";
import auth from "../services/auth.js";
import roleGuard from "../utils/roleGuard.js";

export default {
  name: "UsersView",
  data() {
    return {
      users: [],
      shifts: [],
      searchFilter: "",
      loading: false,
      error: null,
      roleGuard: roleGuard,
    };
  },
  async mounted() {
    await this.loadUsers();
    await this.loadShifts();
  },
  computed: {
    currentUser() {
      return auth.getCurrentUser();
    },
    filteredUsers() {
      if (!this.searchFilter) return this.users;

      const filter = this.searchFilter.toLowerCase();
      return this.users.filter(
        (user) =>
          user.username.toLowerCase().includes(filter) ||
          user.full_name.toLowerCase().includes(filter) ||
          user.role.toLowerCase().includes(filter)
      );
    },
  },
  methods: {
    async loadUsers() {
      this.loading = true;
      this.error = null;

      try {
        this.users = await api.get("/api/users");
        console.log("✅ Users loaded:", this.users.length);
      } catch (error) {
        console.error("Error loading users:", error);
        this.error = "Error al cargar la lista de usuarios";
      } finally {
        this.loading = false;
      }
    },

    async loadShifts() {
      try {
        this.shifts = await api.get("/shifts");
      } catch (error) {
        console.error("Error loading shifts:", error);
      }
    },

    goToCreateUser() {
      this.$router.push({ name: "CreateUser" });
    },

    editUser(user) {
      // TODO: Implement edit user functionality
      console.log("Edit user:", user);
      alert("Funcionalidad de edición en desarrollo");
    },

    async deleteUser(user) {
      if (
        !confirm(
          `¿Estás seguro de que quieres eliminar al usuario "${user.username}"?`
        )
      ) {
        return;
      }

      try {
        // TODO: Implement delete user API endpoint
        console.log("Delete user:", user);
        alert("Funcionalidad de eliminación en desarrollo");
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Error al eliminar usuario");
      }
    },

    getRoleClass(role) {
      const roleClasses = {
        admin: "role-admin",
        supervisor: "role-supervisor",
        storekeeper: "role-storekeeper",
        operador: "role-operador",
      };
      return roleClasses[role] || "role-default";
    },

    getRoleLabel(role) {
      const roleLabels = {
        admin: "Administrador",
        supervisor: "Supervisor",
        storekeeper: "Bodeguero",
        operador: "Operador",
      };
      return roleLabels[role] || role;
    },

    getShiftLabel(shiftId) {
      const shift = this.shifts.find((s) => s.id === shiftId);
      return shift ? shift.code : "Sin turno";
    },

    formatDate(dateString) {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
};
</script>

<style scoped>
.users {
  padding: 2rem;
  font-family: "Segoe UI", sans-serif;
  color: #333;
}

h1 {
  font-size: 1.8rem;
  margin-bottom: 0.3rem;
}

.subtitulo {
  font-size: 0.95rem;
  color: #666;
  margin-bottom: 1.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn-primary {
  background-color: #1976d2;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.btn-primary:hover {
  background-color: #145ca0;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.search-input {
  width: 100%;
  max-width: 400px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 1.5rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error-message {
  text-align: center;
  padding: 2rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.btn-retry {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.table-container {
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.users-table th,
.users-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.users-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.users-table tr:hover {
  background-color: #f8f9fa;
}

.actions-cell {
  text-align: center;
}

.btn-edit,
.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  margin: 0 0.25rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.btn-edit:hover {
  background-color: #e3f2fd;
}

.btn-delete:hover {
  background-color: #ffebee;
}

/* Role badges */
.role-admin {
  background-color: #dc3545;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.role-supervisor {
  background-color: #ffc107;
  color: #212529;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.role-storekeeper {
  background-color: #28a745;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.role-operador {
  background-color: #6c757d;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.role-default {
  background-color: #e9ecef;
  color: #495057;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}

/* Responsive */
@media (max-width: 768px) {
  .users-table {
    font-size: 0.8rem;
  }

  .users-table th,
  .users-table td {
    padding: 0.5rem;
  }

  .actions {
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
