<template>
  <div class="movimientos">
    <h1>Listado de Movimientos</h1>
    <p class="subtitulo">Registro detallado de cambios en inventario</p>

    <!-- Leyenda -->
    <div class="leyenda">
      <h3>Leyenda de movimientos:</h3>
      <div class="leyenda-items">
        <div class="leyenda-item">
          <span class="flecha entrada">↑</span>
          <span>Entrada - Ingreso de productos al inventario</span>
        </div>
        <div class="leyenda-item">
          <span class="flecha salida">↓</span>
          <span>Salida - Retiro de productos del inventario</span>
        </div>
        <div class="leyenda-item">
          <span class="flecha ajuste">↕</span>
          <span>Ajuste - Corrección de cantidad en inventario</span>
        </div>
      </div>
    </div>

    <!-- Buscador -->
    <input
      type="text"
      v-model="filtro"
      placeholder="🔍 Buscar movimiento..."
      class="buscador"
    />

    <!-- Tabla -->
    <table class="tabla-movimientos">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Supervisor</th>
          <th>Solicitante</th>
          <th>Bodeguero</th>
          <th>Ubicación</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="mov in movimientosFiltrados" :key="mov.id">
          <td>{{ mov.producto }}</td>
          <td class="cantidad-movimiento">
            <span :class="getTipoMovimientoClass(mov.accion)">
              {{ getTipoMovimientoFlecha(mov.accion) }}
            </span>
            {{ mov.cantidad }}
          </td>
          <td>{{ mov.supervisor }}</td>
          <td>{{ mov.solicitante }}</td>
          <td>{{ mov.bodeguero }}</td>
          <td>{{ mov.ubicacion }}</td>
          <td>{{ new Date(mov.fecha).toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import api from "../services/api.js";

export default {
  name: "MovimientosView",
  data() {
    return {
      movimientos: [],
      filtro: "",
    };
  },
  async mounted() {
    try {
      this.movimientos = await api.get("/movimientos");
    } catch (error) {
      console.error("Error cargando movimientos:", error);
    }
  },
  computed: {
    movimientosFiltrados() {
      if (!this.filtro) return this.movimientos;
      const filtro = this.filtro.toLowerCase();
      return this.movimientos.filter(
        (mov) =>
          mov.producto?.toLowerCase().includes(filtro) ||
          mov.solicitante?.toLowerCase().includes(filtro) ||
          mov.bodeguero?.toLowerCase().includes(filtro) ||
          mov.accion?.toLowerCase().includes(filtro)
      );
    },
  },
  methods: {
    getTipoMovimientoFlecha(accion) {
      if (!accion) return "•";

      const accionLower = accion.toLowerCase();
      switch (accionLower) {
        case "entrada":
          return "↑";
        case "salida":
          return "↓";
        case "ajuste":
          return "↕";
        default:
          return "•";
      }
    },
    getTipoMovimientoClass(accion) {
      if (!accion) return "flecha";

      const accionLower = accion.toLowerCase();
      switch (accionLower) {
        case "entrada":
          return "flecha entrada";
        case "salida":
          return "flecha salida";
        case "ajuste":
          return "flecha ajuste";
        default:
          return "flecha";
      }
    },
  },
};
</script>

<style scoped>
.movimientos {
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
  margin-bottom: 1rem;
}

/* Estilos para la leyenda */
.leyenda {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.leyenda h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #495057;
}

.leyenda-items {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.leyenda-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #495057;
}

.buscador {
  padding: 0.6rem;
  margin-bottom: 1.2rem;
  width: 100%;
  max-width: 400px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
}

.tabla-movimientos {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.tabla-movimientos th,
.tabla-movimientos td {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  text-align: left;
}

.tabla-movimientos th {
  background-color: #f4f4f4;
  font-weight: bold;
}

.tabla-movimientos tr:hover {
  background-color: #f9f9f9;
}

/* Estilos para las flechas */
.flecha {
  display: inline-block;
  font-size: 1.2rem;
  font-weight: bold;
  min-width: 20px;
  text-align: center;
  border-radius: 3px;
  padding: 2px 4px;
  margin-right: 0.5rem;
}

.flecha.entrada {
  color: #28a745;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.flecha.salida {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

.flecha.ajuste {
  color: #ffc107;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
}

/* Estilos para la columna cantidad */
.cantidad-movimiento {
  display: flex;
  align-items: center;
  font-weight: 500;
}

/* Responsividad */
@media (max-width: 768px) {
  .tabla-movimientos {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }

  .leyenda-items {
    flex-direction: column;
    gap: 0.75rem;
  }

  .cantidad-movimiento {
    min-width: 100px;
  }

  .flecha {
    font-size: 1rem;
    min-width: 16px;
    padding: 1px 3px;
  }
}
</style>
