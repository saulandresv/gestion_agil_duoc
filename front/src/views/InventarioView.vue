<template>
  <div class="inventario">
    <div class="header">
      <h1>Listado de Inventario</h1>
      <p class="subtitulo">Consulta y filtrado existencias</p>
    </div>

    <div class="filtros">
      <input v-model="busqueda" type="text" placeholder="🔍 Buscar..." />
      <select v-model="categoriaFiltro">
        <option value="">Filtrar por categoría</option>
        <option v-for="c in categorias" :key="c">{{ c }}</option>
      </select>
      <select v-model="estadoFiltro">
        <option value="">Filtrar por estado</option>
        <option>Activo</option>
        <option>Inactivo</option>
      </select>
    </div>

    <table class="tabla-inventario">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre</th>
          <th>Categoría</th>
          <th>Ubicación</th>
          <th>Stock</th>
          <th>Estado</th>
          <th>Editar</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in inventarioFiltrado" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.descripcion }}</td>
          <td>{{ item.categoria }}</td>
          <td>{{ item.ubicacion }}</td>
          <td>{{ item.stock }}</td>
          <td>{{ item.estado }}</td>
          <td>
            <button @click="irAEditar(item.id)">✏️</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import api from "../services/api.js";

export default {
  name: "InventarioView",
  data() {
    return {
      inventario: [],
      busqueda: "",
      categoriaFiltro: "",
      estadoFiltro: "",
    };
  },
  async mounted() {
    try {
      this.inventario = await api.get("/productos");
    } catch (error) {
      console.error("Error al cargar datos:", error);
    }
  },
  computed: {
    categorias() {
      return [...new Set(this.inventario.map((item) => item.categoria))];
    },
    inventarioFiltrado() {
      return this.inventario.filter((item) => {
        const matchBusqueda =
          item.descripcion
            .toLowerCase()
            .includes(this.busqueda.toLowerCase()) ||
          item.id.toLowerCase().includes(this.busqueda.toLowerCase());

        const matchCategoria =
          this.categoriaFiltro === "" ||
          item.categoria === this.categoriaFiltro;

        const matchEstado =
          this.estadoFiltro === "" || item.estado === this.estadoFiltro;

        return matchBusqueda && matchCategoria && matchEstado;
      });
    },
  },
  methods: {
    irAEditar(id) {
      this.$router.push(`/producto/${id}/editar`);
    },
  },
};
</script>

<style scoped>
.inventario {
  padding: 2rem;
  font-family: "Segoe UI", sans-serif;
  color: #333;
}

.header h1 {
  font-size: 1.8rem;
  margin-bottom: 0.2rem;
}

.subtitulo {
  color: #666;
  margin-bottom: 0.5rem;
}

.sincronizacion {
  font-size: 0.85rem;
  color: #007acc;
  margin-bottom: 1rem;
}

.filtros {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.filtros input,
.filtros select {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.tabla-inventario {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.tabla-inventario th,
.tabla-inventario td {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  text-align: left;
}

.tabla-inventario th {
  background-color: #f4f4f4;
  font-weight: bold;
}

.tabla-inventario tr:hover {
  background-color: #f9f9f9;
}

/* Responsividad */
@media (max-width: 768px) {
  .tabla-inventario {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}
button {
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  cursor: pointer;
}
</style>
