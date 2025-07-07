<template>
  <div class="pantalla-espera">
    <div class="clock">{{ horaActual }}</div>

    <h2 class="mensaje">Acerque su tarjeta</h2>
    <p class="submensaje">Activa login instantáneo con RFID</p>

    <div class="emoji-conexion">📶</div>
  </div>
</template>

<script>
export default {
  name: "PantallaEsperaView",
  data() {
    return {
      horaActual: "",
    };
  },
  mounted() {
    this.actualizarHora();
    setInterval(this.actualizarHora, 1000);
  },
  methods: {
    actualizarHora() {
      const ahora = new Date();
      this.horaActual = ahora.toLocaleTimeString();
    },
  },
};
</script>

<style scoped src="../assets/styles/pantalla-espera.css"></style>
