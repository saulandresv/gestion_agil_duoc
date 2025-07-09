<template>
  <div class="create-user">
    <div class="header">
      <h1>Crear Usuario</h1>
      <p class="subtitulo">Registro de nuevo usuario en el sistema</p>
    </div>

    <div class="form-container">
      <form @submit.prevent="createUser" class="user-form">
        <div class="form-group">
          <label for="username">Nombre de Usuario *</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            required
            placeholder="Ingrese nombre de usuario"
            :disabled="loading"
          />
          <small v-if="errors.username" class="error">{{
            errors.username
          }}</small>
        </div>

        <div class="form-group">
          <label for="fullName">Nombre Completo *</label>
          <input
            id="fullName"
            v-model="form.fullName"
            type="text"
            required
            placeholder="Ingrese nombre completo"
            :disabled="loading"
          />
          <small v-if="errors.fullName" class="error">{{
            errors.fullName
          }}</small>
        </div>

        <div class="form-group">
          <label for="password">Contraseña *</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            placeholder="Ingrese contraseña (mínimo 6 caracteres)"
            :disabled="loading"
          />
          <small v-if="errors.password" class="error">{{
            errors.password
          }}</small>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirmar Contraseña *</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            required
            placeholder="Confirme la contraseña"
            :disabled="loading"
          />
          <small v-if="errors.confirmPassword" class="error">{{
            errors.confirmPassword
          }}</small>
        </div>

        <div class="form-group">
          <label for="role">Rol *</label>
          <select id="role" v-model="form.role" required :disabled="loading">
            <option value="">Seleccione un rol</option>
            <option value="admin">Administrador</option>
            <option value="supervisor">Supervisor</option>
            <option value="storekeeper">Bodeguero</option>
            <option value="operador">Operador</option>
          </select>
          <small v-if="errors.role" class="error">{{ errors.role }}</small>
        </div>

        <div class="form-group">
          <label for="shift">Turno (Opcional)</label>
          <select id="shift" v-model="form.shiftId" :disabled="loading">
            <option value="">Sin turno asignado</option>
            <option v-for="shift in shifts" :key="shift.id" :value="shift.id">
              {{ shift.code }} ({{ shift.start_time }} - {{ shift.end_time }})
            </option>
          </select>
        </div>

        <div class="form-actions">
          <button
            type="button"
            @click="goBack"
            class="btn-secondary"
            :disabled="loading"
          >
            Cancelar
          </button>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? "Creando..." : "Crear Usuario" }}
          </button>
        </div>
      </form>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="message" :class="messageClass" class="message">
      {{ message }}
    </div>
  </div>
</template>

<script>
import api from "../services/api.js";

export default {
  name: "CreateUserView",
  data() {
    return {
      form: {
        username: "",
        fullName: "",
        password: "",
        confirmPassword: "",
        role: "",
        shiftId: null,
      },
      shifts: [],
      errors: {},
      loading: false,
      message: "",
      messageType: "success",
    };
  },
  computed: {
    messageClass() {
      return {
        "message-success": this.messageType === "success",
        "message-error": this.messageType === "error",
      };
    },
  },
  async mounted() {
    await this.loadShifts();
  },
  methods: {
    async loadShifts() {
      try {
        this.shifts = await api.get("/shifts");
      } catch (error) {
        console.error("Error loading shifts:", error);
        // Fallback to empty array if API fails
        this.shifts = [];
      }
    },

    validateForm() {
      this.errors = {};
      let isValid = true;

      // Username validation
      if (!this.form.username.trim()) {
        this.errors.username = "El nombre de usuario es requerido";
        isValid = false;
      } else if (this.form.username.length < 3) {
        this.errors.username =
          "El nombre de usuario debe tener al menos 3 caracteres";
        isValid = false;
      }

      // Full name validation
      if (!this.form.fullName.trim()) {
        this.errors.fullName = "El nombre completo es requerido";
        isValid = false;
      }

      // Password validation
      if (!this.form.password) {
        this.errors.password = "La contraseña es requerida";
        isValid = false;
      } else if (this.form.password.length < 6) {
        this.errors.password = "La contraseña debe tener al menos 6 caracteres";
        isValid = false;
      }

      // Confirm password validation
      if (!this.form.confirmPassword) {
        this.errors.confirmPassword = "Debe confirmar la contraseña";
        isValid = false;
      } else if (this.form.password !== this.form.confirmPassword) {
        this.errors.confirmPassword = "Las contraseñas no coinciden";
        isValid = false;
      }

      // Role validation
      if (!this.form.role) {
        this.errors.role = "Debe seleccionar un rol";
        isValid = false;
      }

      return isValid;
    },

    async createUser() {
      if (!this.validateForm()) {
        return;
      }

      this.loading = true;
      this.message = "";

      try {
        const userData = {
          username: this.form.username.trim(),
          fullName: this.form.fullName.trim(),
          password: this.form.password,
          role: this.form.role,
          shiftId: this.form.shiftId || null,
        };

        // Call API to create user
        await api.post("/users", userData);

        this.message = `Usuario '${userData.username}' creado exitosamente`;
        this.messageType = "success";

        // Reset form after successful creation
        setTimeout(() => {
          this.resetForm();
          this.goBack();
        }, 2000);
      } catch (error) {
        console.error("Error creating user:", error);
        this.messageType = "error";

        if (
          error.response &&
          error.response.data &&
          error.response.data.error
        ) {
          this.message = error.response.data.error;
        } else {
          this.message = "Error al crear el usuario. Intente nuevamente.";
        }
      } finally {
        this.loading = false;
      }
    },

    resetForm() {
      this.form = {
        username: "",
        fullName: "",
        password: "",
        confirmPassword: "",
        role: "",
        shiftId: null,
      };
      this.errors = {};
      this.message = "";
    },

    goBack() {
      this.$router.push("/dashboard"); // Go back to dashboard
    },
  },
};
</script>

<style scoped>
.create-user {
  padding: 2rem;
  font-family: "Segoe UI", sans-serif;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
}

.header h1 {
  font-size: 1.8rem;
  margin-bottom: 0.2rem;
  color: #1976d2;
}

.subtitulo {
  color: #666;
  margin-bottom: 2rem;
}

.form-container {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.user-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #1976d2;
}

.form-group input:disabled,
.form-group select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.error {
  color: #d32f2f;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  min-width: 120px;
}

.btn-primary {
  background-color: #1976d2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1565c0;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #757575;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #616161;
}

.btn-secondary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.message {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
}

.message-success {
  background-color: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.message-error {
  background-color: #ffeaea;
  color: #d32f2f;
  border: 1px solid #ffcdd2;
}

/* Responsive design */
@media (max-width: 768px) {
  .create-user {
    padding: 1rem;
  }

  .form-container {
    padding: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
