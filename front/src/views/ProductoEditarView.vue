<template>
  <div class="editar-producto">
    <h1>Editar Producto</h1>

    <!-- Alert component -->
    <v-alert
      v-if="alert.show"
      :type="alert.type"
      :text="alert.message"
      closable
      @click:close="alert.show = false"
      class="mb-4"
    ></v-alert>

    <form v-if="producto" @submit.prevent="guardarCambios">
      <div class="campo">
        <label>Descripción</label>
        <input v-model="producto.descripcion" type="text" />
      </div>

      <div class="campo">
        <label>Categoría</label>
        <input v-model="producto.categoria" type="text" />
      </div>

      <div class="campo">
        <label>Unidad</label>
        <input v-model="producto.unidad" type="text" />
      </div>

      <div class="campo">
        <label>Precio</label>
        <input v-model.number="producto.precio_unitario" type="number" />
      </div>

      <div class="campo">
        <label>Stock</label>
        <input v-model.number="producto.stock" type="number" />
      </div>

      <div class="campo">
        <label>Ubicación</label>
        <input v-model="producto.ubicacion" type="text" />
      </div>

      <div class="campo">
        <label>Estado</label>
        <select v-model="producto.estado">
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
      </div>

      <div class="campo">
        <label>Observaciones</label>
        <textarea v-model="producto.observaciones"></textarea>
      </div>

      <div class="acciones">
        <button type="submit">💾 Guardar Cambios</button>
        <button type="button" @click="cancelar">↩️ Cancelar</button>
      </div>
    </form>

    <div v-else>
      <p>Producto no encontrado.</p>
    </div>
  </div>
</template>

<script>
import api from "../services/api.js";

export default {
  name: "ProductoEditarView",
  data() {
    return {
      producto: null,
      esNuevo: false,
      alert: {
        show: false,
        type: "success",
        message: "",
      },
    };
  },
  mounted() {
    const id = this.$route.params.id;

    if (id) {
      // Si hay ID, intentamos obtener el producto
      this.cargarProducto(id);
    } else {
      // Si no hay ID, estamos creando un producto nuevo
      this.producto = {
        descripcion: "",
        categoria: "",
        unidad: "",
        precio_unitario: 0,
        stock: 0,
        ubicacion: "",
        estado: "Activo",
        observaciones: "",
      };
      this.esNuevo = true;
    }
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
    async cargarProducto(id) {
      try {
        // Intentar obtener el producto específico
        const data = await api.get(`/productos/${id}`);
        this.producto = data;
        this.esNuevo = false;
      } catch (error) {
        console.warn(
          `Endpoint /productos/${id} failed, trying fallback from cached products list:`,
          error
        );

        try {
          // Fallback: buscar en la lista completa de productos cacheada
          const productos = await api.get("/productos");
          const producto = productos.find(
            (p) => p.id.toString() === id.toString()
          );

          if (producto) {
            this.producto = producto;
            this.esNuevo = false;
            console.log("✅ Product found in cached products list");
          } else {
            throw new Error("Product not found in cached list");
          }
        } catch (fallbackError) {
          console.error(
            "Both specific endpoint and cached list failed:",
            fallbackError
          );
          // Si no existe en ningún lado, dejamos null y mostramos mensaje
          this.producto = null;
        }
      }
    },
    guardarCambios() {
      const apiCall = this.esNuevo
        ? api.post("/productos", this.producto)
        : api.patch(`/productos/${this.$route.params.id}`, this.producto);

      apiCall
        .then(() => {
          this.showAlert(
            this.esNuevo ? "Producto creado" : "Producto actualizado",
            "success"
          );
          setTimeout(() => {
            this.$router.push("/inventario");
          }, 2000);
        })
        .catch((error) => {
          console.error("Error al guardar:", error);
          this.showAlert("Hubo un error al guardar", "error");
        });
    },
    cancelar() {
      this.$router.push("/inventario");
    },
  },
};
</script>

<style scoped>
.editar-producto {
  padding: 2rem;
  max-width: 600px;
  margin: auto;
  font-family: "Segoe UI", sans-serif;
}

h1 {
  font-size: 1.6rem;
  margin-bottom: 1.5rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.campo label {
  font-weight: bold;
  display: block;
  margin-bottom: 0.25rem;
}

input,
select,
textarea {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
}

textarea {
  min-height: 80px;
  resize: vertical;
}

.acciones {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

button[type="submit"] {
  background-color: #1976d2;
  color: white;
}

button[type="button"] {
  background-color: #888;
  color: white;
}
</style>
