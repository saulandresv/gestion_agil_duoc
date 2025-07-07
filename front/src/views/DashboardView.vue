<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p class="subtitulo">Acceso a tareas diarias</p>

    <div class="acciones">
      <button class="accion-btn" @click="irAInventario">📦 Inventario</button>
      <button class="accion-btn" @click="irAMovimientos">🔄 Movimientos</button>
      <button class="accion-btn" @click="crearMovimiento">
        ➕ Crear Movimiento
      </button>
      <button class="accion-btn" @click="buscarSolicitud">
        🔍 Buscar Solicitud
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "DashboardView",
  methods: {
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
