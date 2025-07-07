<template>
  <v-container class="movimiento">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">Registrar Movimiento</h1>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Producto | Entradas / Salidas / Ajustes
        </p>
      </v-col>
    </v-row>

    <!-- Alert component -->
    <v-row v-if="alert.show">
      <v-col cols="12">
        <v-alert
          :type="alert.type"
          :text="alert.message"
          closable
          @click:close="alert.show = false"
        ></v-alert>
      </v-col>
    </v-row>

    <v-form @submit.prevent="agregarMovimiento">
      <v-row>
        <v-col cols="12">
          <v-combobox
            v-model="form.producto"
            :items="productos"
            item-title="descripcion"
            item-value="id"
            label="Seleccione producto"
            variant="outlined"
            return-object
            clearable
          >
            <template v-slot:selection="{ item }">
              <div>
                {{ item.raw.descripcion }}
                <v-chip color="green" variant="flat"
                  >STOCK: {{ item.raw.stock }}</v-chip
                >
              </div>
            </template>
          </v-combobox>
        </v-col>
        <v-col cols="6">
          <v-number-input
            v-model="form.cantidad"
            :max="form.producto?.stock || 0"
            :min="0"
            control-variant="split"
          ></v-number-input>
        </v-col>
        <v-col cols="6">
          <v-select
            v-model="form.accion"
            :items="['Entrada', 'Salida', 'Ajuste']"
            label="Acción"
            variant="outlined"
            clearable
          ></v-select>
        </v-col>
        <v-col cols="6">
          <v-combobox
            v-model="form.supervisor"
            :items="supervisores"
            item-title="nombre"
            item-value="id"
            label="Selecciona supervisor"
            variant="outlined"
            return-object
            clearable
          ></v-combobox>
        </v-col>
        <v-col cols="6">
          <v-combobox
            v-model="form.solicitante"
            :items="solicitantes"
            item-title="nombre"
            item-value="id"
            label="Selecciona solicitante"
            variant="outlined"
            return-object
            clearable
          ></v-combobox>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-textarea
            v-model="form.observaciones"
            label="Observaciones (opcional)"
            variant="outlined"
            rows="3"
          ></v-textarea>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-btn type="submit" color="primary" prepend-icon="mdi-plus">
            Agregar a la tabla
          </v-btn>
        </v-col>
      </v-row>
    </v-form>

    <v-row class="mt-6">
      <v-col cols="12">
        <h2 class="text-h5 mb-4">Movimientos Pendientes</h2>
      </v-col>
    </v-row>
    <v-table v-if="movimientos.length" class="tabla">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Acción</th>
          <th>Cantidad</th>
          <th>Solicitante</th>
          <th>Supervisor</th>
          <th>Observaciones</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(mov, index) in movimientos" :key="index">
          <td>{{ mov.producto.descripcion }}</td>
          <td>{{ mov.accion }}</td>
          <td>{{ mov.cantidad }}</td>
          <td>{{ mov.solicitante.nombre }}</td>
          <td>{{ mov.supervisor.nombre }}</td>
          <td>{{ mov.observaciones }}</td>
          <td>
            <v-btn
              @click="eliminar(index)"
              color="error"
              icon="mdi-delete"
              size="small"
              variant="text"
            ></v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-row v-if="movimientos.length">
      <v-col cols="12">
        <v-btn
          @click="confirmarTodo"
          color="success"
          prepend-icon="mdi-check-all"
          class="mt-4"
        >
          Confirmar Todos los Movimientos
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import api from "../services/api.js";
import backgroundSync from "../services/backgroundSync.js";
import auth from "../services/auth.js";

export default {
  name: "MovimientoView",
  data() {
    return {
      form: {
        producto: null, // ahora almacenaremos el objeto producto completo
        cantidad: 0,
        accion: "",
        solicitante: null,
        observaciones: null,
        supervisor: null,
      },
      movimientos: [],
      productos: [],
      solicitantes: [],
      supervisores: [],
      alert: {
        show: false,
        type: "success",
        message: "",
      },
    };
  },
  mounted() {
    // Cargar productos activos
    api
      .get("/productos")
      .then((data) => {
        this.productos = data.filter(
          (p) => p.estado === "Activo" && p.stock >= 0
        );
      })
      .catch((error) => console.error("Error cargando productos:", error));

    // Cargar personas con rol solicitante
    api
      .get("/personas")
      .then((data) => {
        this.solicitantes = data.filter((p) => p.rol !== "storekeeper");
        this.supervisores = this.solicitantes.filter(
          (p) => p.rol === "supervisor"
        );
      })
      .catch((error) => console.error("Error cargando personas:", error));
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
    agregarMovimiento() {
      if (!this.form.producto || !this.form.accion || !this.form.cantidad) {
        this.showAlert("Completa los campos obligatorios", "warning");
        return;
      }
      this.movimientos.push({ ...this.form });
      this.form = {
        producto: null,
        cantidad: 1,
        accion: "",
        solicitante: "",
        observaciones: "",
      };
    },
    eliminar(index) {
      this.movimientos.splice(index, 1);
    },
    async confirmarTodo() {
      // Get current user from stored auth information
      const currentUser = auth.getCurrentUser();

      if (!currentUser.id || !currentUser.fullName) {
        this.showAlert(
          "Error: No hay información del usuario. Por favor, inicia sesión nuevamente.",
          "error"
        );
        return;
      }

      const currentUserId = currentUser.id;
      const currentUserName = currentUser.fullName;

      // Prepare movements data for batch processing
      const movimientosData = this.movimientos
        .map((mov) => {
          const producto = this.productos.find((p) => p.id === mov.producto.id);
          if (!producto) return null;

          let nuevoStock = producto.stock;
          if (mov.accion === "Entrada") {
            nuevoStock += mov.cantidad;
          } else if (mov.accion === "Salida") {
            nuevoStock -= mov.cantidad;
          } else if (mov.accion === "Ajuste") {
            nuevoStock = mov.cantidad;
          }

          return {
            movimiento: {
              producto: mov.producto.id,
              accion: mov.accion,
              cantidad: mov.cantidad,
              supervisor: {
                id: mov.supervisor?.id,
                nombre: mov.supervisor?.nombre,
              },
              solicitante: {
                id: mov.solicitante?.id,
                nombre: mov.solicitante?.nombre,
              },
              bodeguero: { id: currentUserId },
              ubicacion: producto.ubicacion,
              observaciones: mov.observaciones || "",
              fecha: new Date().toISOString(),
            },
            stockUpdate: {
              productId: producto.id,
              newStock: nuevoStock,
            },
          };
        })
        .filter(Boolean);

      // Check if online and try direct API call first
      const connectionStatus = backgroundSync.getConnectionStatus();

      if (connectionStatus.online) {
        try {
          // Try processing immediately via API
          const promesas = movimientosData.map((data) => {
            const movimientoPromesa = api.post("/movimientos", data.movimiento);
            const actualizarStock = api.patch(
              `/productos/${data.stockUpdate.productId}`,
              {
                stock: data.stockUpdate.newStock,
              }
            );
            return Promise.all([movimientoPromesa, actualizarStock]);
          });

          await Promise.all(promesas);

          this.showAlert(
            "Movimientos registrados y stock actualizado",
            "success"
          );
          this.movimientos = [];
        } catch (error) {
          console.error(
            "API call failed, queueing for background sync:",
            error
          );

          // If API call fails, queue for background sync
          try {
            await backgroundSync.queueBatchMovements(
              movimientosData,
              currentUserName
            );
            this.showAlert(
              "Conexión fallida. Movimientos guardados para sincronizar más tarde",
              "warning"
            );
            this.movimientos = [];
          } catch (queueError) {
            console.error("Error queueing movements:", queueError);
            this.showAlert(
              "Error al guardar movimientos para sincronización",
              "error"
            );
          }
        }
      } else {
        // Offline - queue for background sync
        try {
          await backgroundSync.queueBatchMovements(
            movimientosData,
            currentUserName
          );
          this.showAlert(
            "Sin conexión. Movimientos guardados para sincronizar cuando haya internet",
            "info"
          );
          this.movimientos = [];
        } catch (error) {
          console.error("Error queueing movements for offline sync:", error);
          this.showAlert(
            "Error al guardar movimientos para sincronización",
            "error"
          );
        }
      }
    },
  }, // ✅ cierre correcto de `methods`
};
</script>

<style scoped>
.movimiento {
  max-width: 800px;
  margin: auto;
  padding: 2rem;
  font-family: "Segoe UI", sans-serif;
}

h1 {
  font-size: 1.6rem;
  margin-bottom: 0.3rem;
}

.subtitulo {
  margin-bottom: 1.5rem;
  color: #666;
  font-size: 0.95rem;
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.fila {
  display: flex;
  gap: 1rem;
}

input,
select,
textarea {
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
  width: 100%;
}

textarea {
  min-height: 60px;
  resize: vertical;
}

button {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  background-color: #1976d2;
  color: white;
}

button.confirmar {
  margin-top: 1rem;
  background-color: #2e7d32;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.tabla th,
.tabla td {
  border: 1px solid #ddd;
  padding: 0.6rem;
  text-align: left;
}

.tabla th {
  background-color: #f4f4f4;
}

.tabla button {
  background: transparent;
  color: red;
  font-size: 1rem;
  cursor: pointer;
}
</style>
