import { createRouter, createWebHistory } from "vue-router";
import auth from "@/services/auth";
import LoginView from "../views/LoginView.vue";
import PantallaEsperaView from "../views/PantallaEsperaView.vue";
import DashboardView from "../views/DashboardView.vue";
import InventarioView from "../views/InventarioView.vue";
import MovimientosView from "../views/MovimientosView.vue";
import ProductoEditarView from "../views/ProductoEditarView.vue";
import MovimientoView from "../views/MovimientoView.vue";
import BuscarSolicitudView from "../views/BuscarSolicitudView.vue";
import RequestsPendientesView from "../views/RequestsPendientesView.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: DashboardView,
    meta: { requiresAuth: true },
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
  },
  {
    path: "/espera",
    name: "pantalla-espera",
    component: PantallaEsperaView,
    meta: { requiresAuth: true },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: DashboardView,
    meta: { requiresAuth: true },
  },
  {
    path: "/inventario",
    name: "Inventario",
    component: InventarioView,
    meta: { requiresAuth: true },
  },
  {
    path: "/movimientos",
    name: "Movimientos",
    component: MovimientosView,
    meta: { requiresAuth: true },
  },
  {
    path: "/producto/:id/editar",
    name: "producto-editar",
    component: ProductoEditarView,
    meta: { requiresAuth: true },
  },
  {
    path: "/producto/editar",
    name: "producto-crear",
    component: ProductoEditarView,
  },
  {
    path: "/movimiento-crear",
    name: "CrearMovimiento",
    component: MovimientoView,
    meta: { requiresAuth: true },
  },
  {
    path: "/buscar-solicitud",
    name: "BuscarSolicitud",
    component: BuscarSolicitudView,
    meta: { requiresAuth: true },
  },
  {
    path: "/requests-pendientes",
    name: "RequestsPendientes",
    component: RequestsPendientesView,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  // check if the route we're heading to needs auth
  if (to.meta.requiresAuth) {
    console.log(to.meta.requiresAuth);
    const isLoggedIn = auth.isLogged?.() ?? false;
    if (!isLoggedIn) {
      // redirect to login
      return next({ name: "login" });
    }
  }
  next();
});

export default router;
