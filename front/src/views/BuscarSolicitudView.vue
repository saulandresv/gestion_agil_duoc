<template>
  <div class="buscar-solicitud">
    <h1>Buscar Solicitud</h1>

    <!-- Alert component -->
    <v-alert
      v-if="alert.show"
      :type="alert.type"
      :text="alert.message"
      closable
      @click:close="alert.show = false"
      class="mb-4"
    ></v-alert>

    <form @submit.prevent="buscarSolicitud(solicitudId)" class="buscador">
      <input
        v-model="solicitudId"
        type="text"
        @input="encontrada = false"
        placeholder="🔎 Ingresar ID de solicitud"
      />
      <button>Buscar</button>
    </form>

    <div v-if="error" class="mensaje-error">
      ❌ No se encontró ninguna solicitud con ese ID.
    </div>

    <div v-if="encontrada">
      <h2>Solicitud #{{ solicitudId }}</h2>

      <div class="info-solicitud">
        <p><strong>Solicitante:</strong> {{ solicitud.solicitante }}</p>
        <p><strong>Lugar:</strong> {{ solicitud.lugar }}</p>
        <p><strong>Fecha/Hora:</strong> {{ solicitud.fecha }}</p>
        <p>
          <strong>Estado:</strong>
          <span :class="['estado-badge', solicitud?.estado?.toLowerCase()]">
            {{ solicitud?.estado }}
          </span>
        </p>
        <p v-if="solicitudIncompleta">
          <br />
          <strong class="text-error">SOLICITUD INCOMPLETA</strong>
        </p>
      </div>

      <table class="tabla">
        <thead>
          <tr>
            <th>ID Producto</th>
            <th>Nombre</th>
            <th>Cantidad</th>
            <th>Observación</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(producto, index) in solicitud.productos" :key="index">
            <td>{{ producto.id }}</td>
            <td>{{ producto.nombre }}</td>
            <td>{{ producto.cantidad }}</td>
            <td>
              <span v-if="producto.stockActual < producto.cantidad">
                ❗ Solo hay {{ producto.stockActual }} disponibles
              </span>
              <span v-else>✔️ OK</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="acciones">
        <button
          v-if="solicitud?.estado?.toLowerCase() === 'pendiente'"
          class="rechazar"
          @click="rechazar"
        >
          ❌ Rechazar
        </button>
        <button
          v-if="
            solicitud?.estado?.toLowerCase() === 'pendiente' &&
            !solicitudIncompleta
          "
          class="aprobar"
          @click="aprobar"
        >
          ✅ Aprobar
        </button>
        <button
          v-if="
            solicitud?.estado?.toLowerCase() === 'pendiente' &&
            solicitudIncompleta
          "
          class="parcial"
          @click="aprobar"
        >
          ☑️ Aprobar con stock existente
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import api from "../services/api.js";
import backgroundSync from "../services/backgroundSync.js";

export default {
  name: "BuscarSolicitudView",
  data() {
    return {
      solicitudId: "",
      encontrada: false,
      error: false,
      solicitud: null,
      alert: {
        show: false,
        type: "success",
        message: "",
      },
    };
  },
  computed: {
    solicitudIncompleta() {
      // if no solicitud loaded or productos missing, it's not incomplete
      if (!this.solicitud || !Array.isArray(this.solicitud.productos))
        return false;
      // return true if any product's requested quantity exceeds available stock
      return this.solicitud.productos.some(
        (producto) => producto.stockActual < producto.cantidad
      );
    },
  },
  methods: {
    showAlert(message, type = "info") {
      this.alert.message = message;
      this.alert.type = type;
      this.alert.show = true;

      // Auto-hide after 5 seconds for success/info alerts
      if (type !== "error") {
        setTimeout(() => {
          this.alert.show = false;
        }, 5000);
      }
    },
    async aprobar() {
      try {
        // Use background sync service for better offline support
        const response = await backgroundSync.queueRequestApproval(
          this.solicitud.id,
          {
            bodeguero: "Juan Pérez",
            observaciones: "Aprobación desde interfaz web",
          }
        );

        if (response.queued) {
          // Operation queued for background sync
          this.showAlert(`🔄 ${response.message}`, "info");
          this.solicitud.estado = "procesando";
        } else if (response.success) {
          // Operation completed immediately
          this.solicitud.estado = response.estado;

          const message = response.approval_partial
            ? `✅ ${response.message}\n\nMovimientos creados: ${response.movimientos_creados}\nVerifica el detalle en el historial de movimientos.`
            : `✅ ${response.message}\n\nMovimientos creados: ${response.movimientos_creados}`;

          this.showAlert(message, "success");
          await this.buscarSolicitud(this.solicitud.id);
        }
      } catch (error) {
        console.error("Error en aprobar():", error);
        const errorMsg =
          error?.response?.data?.error || "Error al aprobar solicitud";
        this.showAlert(`❌ Error: ${errorMsg}`, "error");
        this.error = true;
      }
    },
    buscarSolicitud(id) {
      this.error = false;
      this.encontrada = false;
      if (!id) return 1;
      api
        .get(`/solicitudes/${id}`)
        .then((data) => {
          this.solicitud = data;
          this.encontrada = true;
        })
        .catch(() => {
          // Si no existe, dejamos null y mostramos mensaje
          this.solicitud = null;
          this.error = true;
        });
    },
    async rechazar() {
      try {
        const motivo = prompt("Motivo del rechazo (opcional):") || "";

        // Use background sync service for better offline support
        const response = await backgroundSync.queueRequestRejection(
          this.solicitud.id,
          {
            motivo: motivo,
            bodeguero: "Juan Pérez",
          }
        );

        if (response.queued) {
          this.showAlert(`🔄 ${response.message}`, "info");
          this.solicitud.estado = "procesando";
        } else if (response.success) {
          this.solicitud.estado = response.estado;
          this.showAlert(`✅ ${response.message}`, "success");
          await this.buscarSolicitud(this.solicitud.id);
        }
      } catch (error) {
        console.error("Error en rechazar():", error);
        const errorMsg =
          error?.response?.data?.error || "Error al rechazar solicitud";
        this.showAlert(`❌ Error: ${errorMsg}`, "error");
        this.error = true;
      }
    },
    aprobarExistente() {
      this.showAlert(
        "☑️ Aprobado solo con productos disponibles (simulado)",
        "success"
      );
      this.reset();
    },
    reset() {
      this.solicitudId = "";
      this.encontrada = false;
      this.error = false;
      this.solicitud = null;
    },
  },
};
</script>

<style scoped>
.buscar-solicitud {
  max-width: 800px;
  margin: auto;
  padding: 2rem;
  font-family: "Segoe UI", sans-serif;
}

h1 {
  font-size: 1.6rem;
  margin-bottom: 1rem;
}

.buscador {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

input {
  padding: 0.6rem;
  flex: 1;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}

button {
  padding: 0.6rem 1rem;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.mensaje-error {
  color: red;
  margin-bottom: 1rem;
}

.info-solicitud {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.info-solicitud p {
  margin: 0.3rem 0;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.tabla th,
.tabla td {
  border: 1px solid #ccc;
  padding: 0.6rem;
  text-align: left;
}

.tabla th {
  background-color: #f4f4f4;
}

.acciones {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.rechazar {
  background-color: #c62828;
  color: white;
}

.aprobar {
  background-color: #2e7d32;
  color: white;
}

.parcial {
  background-color: #1976d2;
  color: white;
}

.estado-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  color: white;
  font-weight: bold;
}

.estado-badge.aprobada {
  background-color: green;
}

.estado-badge.rechazada {
  background-color: red;
}

.estado-badge.pendiente {
  background-color: yellow;
  color: black;
}

.estado-badge.parcialmente_aprobada {
  background-color: orange;
}

.text-error {
  color: red;
  font-weight: bold;
}
</style>
