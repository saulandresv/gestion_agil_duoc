import { createRouter, createWebHistory } from "vue-router";
import auth from "@/services/auth";
import roleGuard from "@/utils/roleGuard";
import LoginView from "../views/LoginView.vue";
import PantallaEsperaView from "../views/PantallaEsperaView.vue";
import DashboardView from "../views/DashboardView.vue";
import InventarioView from "../views/InventarioView.vue";
import MovimientosView from "../views/MovimientosView.vue";
import ProductoEditarView from "../views/ProductoEditarView.vue";
import MovimientoView from "../views/MovimientoView.vue";
import BuscarSolicitudView from "../views/BuscarSolicitudView.vue";
import RequestsPendientesView from "../views/RequestsPendientesView.vue";
import CreateUserView from "../views/CreateUserView.vue";
import UsersView from "../views/UsersView.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: DashboardView,
    meta: {
      requiresAuth: true,
      roles: ["admin", "supervisor", "storekeeper", "operador"],
    },
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
    meta: {
      requiresAuth: true,
      roles: ["admin", "supervisor", "storekeeper", "operador"],
    },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: DashboardView,
    meta: {
      requiresAuth: true,
      roles: ["admin", "supervisor", "storekeeper", "operador"],
    },
  },
  {
    path: "/inventario",
    name: "Inventario",
    component: InventarioView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "storekeeper"] },
  },
  {
    path: "/movimientos",
    name: "Movimientos",
    component: MovimientosView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "storekeeper"] },
  },
  {
    path: "/producto/:id/editar",
    name: "producto-editar",
    component: ProductoEditarView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  {
    path: "/producto/editar",
    name: "producto-crear",
    component: ProductoEditarView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor"] },
  },
  {
    path: "/movimiento-crear",
    name: "CrearMovimiento",
    component: MovimientoView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "storekeeper"] },
  },
  {
    path: "/buscar-solicitud",
    name: "BuscarSolicitud",
    component: BuscarSolicitudView,
    meta: { requiresAuth: true, roles: ["admin", "supervisor", "storekeeper"] },
  },
  {
    path: "/requests-pendientes",
    name: "RequestsPendientes",
    component: RequestsPendientesView,
    meta: { requiresAuth: true, roles: ["admin", "operador"] },
  },
  {
    path: "/users/create",
    name: "CreateUser",
    component: CreateUserView,
    meta: { requiresAuth: true, roles: ["admin"] },
  },
  {
    path: "/users",
    name: "Users",
    component: UsersView,
    meta: { requiresAuth: true, roles: ["admin"] },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, from, next) => {
  // Check if the route requires authentication
  if (to.meta.requiresAuth) {
    const isLoggedIn = auth.isLogged?.() ?? false;
    if (!isLoggedIn) {
      // Redirect to login if not authenticated
      return next({ name: "login" });
    }

    // Ensure user profile is loaded
    let userRole = roleGuard.getUserRole();
    if (!userRole && isLoggedIn) {
      try {
        // Try to fetch user profile if not available
        await auth.fetchAndStoreUserProfile();
        userRole = roleGuard.getUserRole();
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        // If profile fetch fails, redirect to login
        return next({ name: "login" });
      }
    }

    // Check role-based access
    if (to.meta.roles && to.meta.roles.length > 0) {
      if (!userRole || !to.meta.roles.includes(userRole)) {
        // Prevent infinite redirect - if already going to dashboard, allow it
        if (to.name === "dashboard" || to.name === "home") {
          return next();
        }

        // If user has no role but is authenticated, logout and redirect to login
        if (!userRole) {
          console.warn("User authenticated but has no role, logging out");
          auth.logout();
          return next({ name: "login" });
        }

        // User doesn't have required role, redirect to dashboard with error
        console.warn(
          `Access denied: User role '${userRole}' not authorized for route '${to.path}'`
        );
        return next({
          name: "dashboard",
          query: {
            error: "access_denied",
            message: "No tienes permisos para acceder a esta página",
          },
        });
      }
    }
  }
  next();
});

export default router;
