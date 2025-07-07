<template>
  <div class="login-container">
    <h1>Inventario <span>Minero</span></h1>
    <p class="subtext">
      <strong>DUOC</strong>
    </p>
    <div class="rfid-section">
      <p class="rfid-label">
        <strong>Acerca tarjeta RFID al sensor</strong>
      </p>
      <div class="emoji-conexion">📶</div>
      <p class="rfid-status">O usa tus credenciales</p>
    </div>

    <form @submit.prevent="handleLogin" class="form-login">
      <input v-model="username" type="text" placeholder="Usuario" />
      <input v-model="password" type="password" placeholder="Contraseña" />
      <button type="submit">INICIAR SESIÓN</button>
    </form>
  </div>
</template>

<script>
import auth from "@/services/auth";
export default {
  name: "LoginView",
  data() {
    return {
      username: "",
      password: "",
    };
  },
  methods: {
    async handleLogin() {
      try {
        const isValid = await auth.login(this.username, this.password);
        if (isValid) {
          this.$router.push({ name: "home" });
          return;
        }
        throw new Error("credenciales invalidas");
      } catch (error) {
        console.error("Login error:", error);
        // handle/display error as needed
      }
    },
  },
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: auto;
  padding: 2rem;
  text-align: center;
  font-family: "Segoe UI", sans-serif;
}

h1 {
  font-size: 2rem;
  margin-bottom: 0.2rem;
}

h1 span {
  font-weight: bold;
  color: #1a1a1a;
}

.subtext {
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 1rem;
}

.icon-card {
  width: 60px;
  height: 40px;
  margin: 1rem auto;
  /* background: url('/card-icon.svg') no-repeat center;
  background-size: contain; */
}

.form-login {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

input {
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
}

button {
  background: #ffd600;
  border: none;
  padding: 0.75rem;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
}

.rfid-section {
  margin-top: 2rem;
  font-size: 0.9rem;
  color: #444;
}

.rfid-icon {
  margin: 0.5rem auto;
  width: 36px;
  height: 36px;
  /* background: url('/rfid-icon.svg') no-repeat center;
  background-size: contain; */
}

.rfid-status {
  font-style: italic;
  color: #777;
}

/* Responsivo */
@media (max-width: 480px) {
  .login-container {
    padding: 1rem;
  }

  h1 {
    font-size: 1.5rem;
  }
}

.emoji-conexion {
  font-size: 3rem;
  animation: pulso 1.5s infinite ease-in-out;
}

@keyframes pulso {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.6;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
