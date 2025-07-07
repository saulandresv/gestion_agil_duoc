<template>
  <v-container class="requests-pendientes">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">Solicitudes Pendientes</h1>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Solicitudes en cola esperando sincronización con el servidor
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

    <!-- Connection Status and Sync All Button -->
    <v-row>
      <v-col cols="12" class="d-flex justify-space-between align-center">
        <v-chip
          :color="connectionStatus.online ? 'success' : 'warning'"
          variant="flat"
          class="mb-4"
        >
          {{ connectionStatus.online ? "🌐 En línea" : "📱 Sin conexión" }}
        </v-chip>

        <div class="d-flex ga-3">
          <v-btn
            v-if="connectionStatus.online && totalPendingCount > 0"
            @click="syncAll"
            :loading="syncing"
            color="primary"
            size="large"
            prepend-icon="mdi-sync"
            class="mb-4"
          >
            Sincronizar Todas ({{ totalPendingCount }})
          </v-btn>

          <v-btn
            v-if="totalPendingCount > 0"
            @click="clearAllData"
            :loading="clearing"
            color="error"
            size="large"
            prepend-icon="mdi-delete-sweep"
            variant="outlined"
            class="mb-4"
          >
            Limpiar Todos los Datos
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Loading -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
        ></v-progress-circular>
        <p class="mt-2">Cargando solicitudes pendientes...</p>
      </v-col>
    </v-row>

    <!-- No pending requests -->
    <v-row v-else-if="!loading && pendingRequests.length === 0">
      <v-col cols="12" class="text-center">
        <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
        <h3 class="text-h6 mb-2">No hay solicitudes pendientes</h3>
        <p class="text-body-2">
          Todas las solicitudes han sido sincronizadas con el servidor.
        </p>
      </v-col>
    </v-row>

    <!-- Pending requests list -->
    <v-row v-else>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <span>Solicitudes en Cola ({{ pendingRequests.length }})</span>
          </v-card-title>

          <v-list>
            <v-list-item
              v-for="request in pendingRequests"
              :key="request.id"
              class="border-b"
            >
              <template v-slot:prepend>
                <v-avatar :color="getOperationColor(request.type)">
                  <v-icon>{{ getOperationIcon(request.type) }}</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title>
                {{ getOperationTitle(request) }}
              </v-list-item-title>

              <v-list-item-subtitle class="mt-1">
                <div>
                  <strong>Tipo:</strong> {{ getOperationType(request.type) }}
                </div>
                <div v-if="request.requestId">
                  <strong>ID Solicitud:</strong> {{ request.requestId }}
                </div>
                <div>
                  <strong>Creado:</strong> {{ formatDate(request.timestamp) }}
                </div>
                <div v-if="request.data?.observaciones">
                  <strong>Observaciones:</strong>
                  {{ request.data.observaciones }}
                </div>
              </v-list-item-subtitle>

              <template v-slot:append>
                <div class="d-flex flex-column ga-2">
                  <v-btn
                    v-if="connectionStatus.online"
                    @click="syncSingle(request)"
                    :loading="request.syncing"
                    size="small"
                    color="primary"
                    variant="outlined"
                  >
                    Sincronizar
                  </v-btn>

                  <v-btn
                    @click="deletePending(request)"
                    size="small"
                    color="error"
                    variant="outlined"
                  >
                    Eliminar
                  </v-btn>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <!-- Batch movements section -->
    <v-row v-if="pendingMovements.length > 0" class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            Movimientos Pendientes ({{ pendingMovements.length }})
          </v-card-title>

          <v-list>
            <v-list-item
              v-for="movement in pendingMovements"
              :key="movement.id"
              class="border-b"
            >
              <template v-slot:prepend>
                <v-avatar color="orange">
                  <v-icon>mdi-swap-horizontal</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title>
                Lote de {{ movement.movements?.length || 0 }} movimientos
              </v-list-item-title>

              <v-list-item-subtitle class="mt-1">
                <div><strong>Bodeguero:</strong> {{ movement.bodeguero }}</div>
                <div>
                  <strong>Creado:</strong> {{ formatDate(movement.timestamp) }}
                </div>
              </v-list-item-subtitle>

              <template v-slot:append>
                <div class="d-flex flex-column ga-2">
                  <v-btn
                    v-if="connectionStatus.online"
                    @click="syncMovement(movement)"
                    :loading="movement.syncing"
                    size="small"
                    color="primary"
                    variant="outlined"
                  >
                    Sincronizar
                  </v-btn>

                  <v-btn
                    @click="deleteMovement(movement)"
                    size="small"
                    color="error"
                    variant="outlined"
                  >
                    Eliminar
                  </v-btn>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import backgroundSync from "@/services/backgroundSync";

export default {
  name: "RequestsPendientesView",
  data() {
    return {
      loading: true,
      syncing: false,
      clearing: false,
      pendingRequests: [],
      pendingMovements: [],
      connectionStatus: {
        online: navigator.onLine,
      },
      alert: {
        show: false,
        type: "success",
        message: "",
      },
    };
  },
  async mounted() {
    // Listen for online/offline events
    window.addEventListener("online", this.updateConnectionStatus);
    window.addEventListener("offline", this.updateConnectionStatus);

    await this.loadPendingRequests();
  },
  beforeUnmount() {
    window.removeEventListener("online", this.updateConnectionStatus);
    window.removeEventListener("offline", this.updateConnectionStatus);
  },
  computed: {
    totalPendingCount() {
      return this.pendingRequests.length + this.pendingMovements.length;
    },
  },
  methods: {
    showAlert(message, type = "info") {
      this.alert.message = message;
      this.alert.type = type;
      this.alert.show = true;

      if (type !== "error") {
        setTimeout(() => {
          this.alert.show = false;
        }, 5000);
      }
    },

    updateConnectionStatus() {
      this.connectionStatus = backgroundSync.getConnectionStatus();
    },

    async loadPendingRequests() {
      this.loading = true;
      try {
        console.log("🔄 Loading pending requests...");

        // Ensure backgroundSync is initialized before loading
        await backgroundSync.init();

        // Load pending request operations
        console.log("📋 Loading request operations...");
        this.pendingRequests = await backgroundSync.getPendingOperations(
          "request_operations"
        );

        // Load pending movements
        console.log("📋 Loading pending movements...");
        this.pendingMovements = await backgroundSync.getPendingOperations(
          "pending_movements"
        );

        console.log(
          `📋 Loaded ${this.pendingRequests.length} pending requests and ${this.pendingMovements.length} pending movements`
        );
      } catch (error) {
        console.error("Error loading pending requests:", error);

        // Check if it's a database timeout error
        if (
          error.message.includes("Database initialization") ||
          error.message.includes("timeout")
        ) {
          this.showAlert(
            "⚠️ Base de datos local no disponible. La aplicación funcionará sin capacidades offline.",
            "warning"
          );
          // Set empty arrays to show no pending items
          this.pendingRequests = [];
          this.pendingMovements = [];
        } else {
          this.showAlert(
            `Error al cargar solicitudes pendientes: ${error.message}`,
            "error"
          );
        }
      } finally {
        this.loading = false;
      }
    },

    async syncSingle(request) {
      if (!this.connectionStatus.online) {
        this.showAlert("Sin conexión a internet", "warning");
        return;
      }

      request.syncing = true;
      try {
        await backgroundSync.processRequestOperation(request);
        await backgroundSync.removePendingOperation(
          "request_operations",
          request.id
        );

        this.showAlert(
          `Solicitud ${request.requestId} sincronizada exitosamente`,
          "success"
        );
        await this.loadPendingRequests();
      } catch (error) {
        console.error("Error syncing request:", error);
        this.showAlert(
          `Error al sincronizar solicitud: ${error.message}`,
          "error"
        );
      } finally {
        request.syncing = false;
      }
    },

    async syncMovement(movement) {
      if (!this.connectionStatus.online) {
        this.showAlert("Sin conexión a internet", "warning");
        return;
      }

      movement.syncing = true;
      try {
        await backgroundSync.processBatchMovements(movement);
        await backgroundSync.removePendingOperation(
          "pending_movements",
          movement.id
        );

        this.showAlert(
          `Lote de movimientos sincronizado exitosamente`,
          "success"
        );
        await this.loadPendingRequests();
      } catch (error) {
        console.error("Error syncing movements:", error);
        this.showAlert(
          `Error al sincronizar movimientos: ${error.message}`,
          "error"
        );
      } finally {
        movement.syncing = false;
      }
    },

    async syncAll() {
      if (!this.connectionStatus.online) {
        this.showAlert("Sin conexión a internet", "warning");
        return;
      }

      this.syncing = true;
      try {
        let successCount = 0;
        let errorCount = 0;

        // Sync all pending requests
        for (const request of this.pendingRequests) {
          try {
            await backgroundSync.processRequestOperation(request);
            await backgroundSync.removePendingOperation(
              "request_operations",
              request.id
            );
            successCount++;
          } catch (error) {
            console.error(`Error syncing request ${request.id}:`, error);
            errorCount++;
          }
        }

        // Sync all pending movements
        for (const movement of this.pendingMovements) {
          try {
            await backgroundSync.processBatchMovements(movement);
            await backgroundSync.removePendingOperation(
              "pending_movements",
              movement.id
            );
            successCount++;
          } catch (error) {
            console.error(`Error syncing movement ${movement.id}:`, error);
            errorCount++;
          }
        }

        if (errorCount === 0) {
          this.showAlert(
            `${successCount} operaciones sincronizadas exitosamente`,
            "success"
          );
        } else {
          this.showAlert(
            `${successCount} exitosas, ${errorCount} errores`,
            "warning"
          );
        }

        await this.loadPendingRequests();
      } catch (error) {
        console.error("Error in batch sync:", error);
        this.showAlert("Error en sincronización masiva", "error");
      } finally {
        this.syncing = false;
      }
    },

    async deletePending(request) {
      if (confirm("¿Estás seguro de eliminar esta solicitud pendiente?")) {
        try {
          await backgroundSync.removePendingOperation(
            "request_operations",
            request.id
          );
          this.showAlert("Solicitud eliminada", "info");
          await this.loadPendingRequests();
        } catch (error) {
          console.error("Error deleting pending request:", error);
          this.showAlert("Error al eliminar solicitud", "error");
        }
      }
    },

    async deleteMovement(movement) {
      if (confirm("¿Estás seguro de eliminar este lote de movimientos?")) {
        try {
          await backgroundSync.removePendingOperation(
            "pending_movements",
            movement.id
          );
          this.showAlert("Movimientos eliminados", "info");
          await this.loadPendingRequests();
        } catch (error) {
          console.error("Error deleting pending movement:", error);
          this.showAlert("Error al eliminar movimientos", "error");
        }
      }
    },

    getOperationColor(type) {
      switch (type) {
        case "approve":
          return "success";
        case "reject":
          return "error";
        default:
          return "primary";
      }
    },

    getOperationIcon(type) {
      switch (type) {
        case "approve":
          return "mdi-check-circle";
        case "reject":
          return "mdi-close-circle";
        default:
          return "mdi-help-circle";
      }
    },

    getOperationType(type) {
      switch (type) {
        case "approve":
          return "Aprobación";
        case "reject":
          return "Rechazo";
        default:
          return "Desconocido";
      }
    },

    getOperationTitle(request) {
      const type = this.getOperationType(request.type);
      return `${type} de Solicitud #${request.requestId}`;
    },

    async clearAllData() {
      // Show confirmation dialog
      const confirmed = confirm(
        "⚠️ ¿Estás seguro de que quieres eliminar TODOS los datos pendientes?\n\n" +
          "Esta acción:\n" +
          "• Eliminará todas las solicitudes pendientes\n" +
          "• Eliminará todos los movimientos pendientes\n" +
          "• Limpiará completamente la base de datos local\n" +
          "• NO se puede deshacer\n\n" +
          "¿Continuar?"
      );

      if (!confirmed) return;

      this.clearing = true;
      try {
        await backgroundSync.clearAllData();

        this.showAlert(
          "✅ Todos los datos han sido eliminados exitosamente",
          "success"
        );

        // Reload the view to show empty state
        await this.loadPendingRequests();
      } catch (error) {
        console.error("Error clearing all data:", error);
        this.showAlert(`❌ Error al eliminar datos: ${error.message}`, "error");
      } finally {
        this.clearing = false;
      }
    },

    formatDate(timestamp) {
      if (!timestamp) return "Fecha desconocida";

      const date = new Date(timestamp);
      return date.toLocaleString("es-ES", {
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
.requests-pendientes {
  max-width: 1000px;
  margin: auto;
  padding: 2rem;
}

.border-b {
  border-bottom: 1px solid #e0e0e0;
}

.border-b:last-child {
  border-bottom: none;
}
</style>
