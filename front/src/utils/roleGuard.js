// Role-based access control utilities
import auth from "@/services/auth";

// Role permissions mapping
const ROLE_PERMISSIONS = {
  admin: [
    "users.create",
    "users.manage",
    "users.view",
    "system.access",
    "all.access",
  ],
  supervisor: [
    "inventory.view",
    "inventory.search",
    "inventory.register",
    "products.create",
    "products.edit",
    "movements.create",
    "movements.view",
    "movements.register_in",
    "movements.register_out",
    "dashboard.view",
  ],
  storekeeper: [
    "inventory.view",
    "inventory.search",
    "movements.create",
    "movements.view",
    "movements.register_in",
    "movements.register_out",
    "dashboard.view",
  ],
  operador: [
    "inventory.view",
    "requests.view",
    "requests.create",
    "dashboard.view",
  ],
};

// Route to permission mapping
const ROUTE_PERMISSIONS = {
  "/": ["dashboard.view"],
  "/dashboard": ["dashboard.view"],
  "/inventario": ["inventory.view"],
  "/movimientos": ["movements.view"],
  "/movimiento-crear": ["movements.create"],
  "/producto/editar": ["products.create"],
  "/producto/:id/editar": ["products.edit"],
  "/buscar-solicitud": ["inventory.search"],
  "/requests-pendientes": ["requests.view"],
  "/users/create": ["users.create"],
  "/users": ["users.view"],
  "/users/:id/edit": ["users.manage"],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(permission) {
  const user = auth.getCurrentUser();
  if (!user || !user.role) return false;

  const userRole = user.role.toLowerCase();
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

  // Admin has all permissions
  if (userRole === "admin") return true;

  // Check specific permission
  return (
    rolePermissions.includes(permission) ||
    rolePermissions.includes("all.access")
  );
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(permissions) {
  return permissions.some((permission) => hasPermission(permission));
}

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(routePath) {
  const user = auth.getCurrentUser();
  if (!user || !user.role) return false;

  // Admin can access everything
  if (user.role.toLowerCase() === "admin") return true;

  // Get required permissions for this route
  const requiredPermissions = ROUTE_PERMISSIONS[routePath] || [];

  // If no specific permissions required, allow access
  if (requiredPermissions.length === 0) return true;

  // Check if user has any of the required permissions
  return hasAnyPermission(requiredPermissions);
}

/**
 * Get user role
 */
export function getUserRole() {
  const user = auth.getCurrentUser();
  return user?.role?.toLowerCase() || null;
}

/**
 * Check if user is admin
 */
export function isAdmin() {
  return getUserRole() === "admin";
}

/**
 * Check if user is supervisor
 */
export function isSupervisor() {
  return getUserRole() === "supervisor";
}

/**
 * Check if user is storekeeper
 */
export function isStorekeeper() {
  return getUserRole() === "storekeeper";
}

/**
 * Check if user is operador
 */
export function isOperador() {
  return getUserRole() === "operador";
}

/**
 * Get accessible routes for current user
 */
export function getAccessibleRoutes() {
  const user = auth.getCurrentUser();
  if (!user || !user.role) return [];

  const userRole = user.role.toLowerCase();

  // Admin can access all routes
  if (userRole === "admin") {
    return Object.keys(ROUTE_PERMISSIONS);
  }

  // Filter routes based on permissions
  return Object.keys(ROUTE_PERMISSIONS).filter((route) => {
    const requiredPermissions = ROUTE_PERMISSIONS[route];
    return hasAnyPermission(requiredPermissions);
  });
}

/**
 * Navigation menu items based on user role
 */
export function getMenuItems() {
  const user = auth.getCurrentUser();
  if (!user || !user.role) return [];

  const userRole = user.role.toLowerCase();

  const menuItems = [];

  // Common items for all authenticated users
  menuItems.push({
    name: "Dashboard",
    path: "/dashboard",
    icon: "📊",
    permission: "dashboard.view",
  });

  // Role-specific menu items
  switch (userRole) {
    case "admin":
      menuItems.push(
        {
          name: "Inventario",
          path: "/inventario",
          icon: "📦",
          permission: "inventory.view",
        },
        {
          name: "Movimientos",
          path: "/movimientos",
          icon: "🔄",
          permission: "movements.view",
        },
        {
          name: "Usuarios",
          path: "/users",
          icon: "👥",
          permission: "users.view",
        },
        {
          name: "Crear Usuario",
          path: "/users/create",
          icon: "👤",
          permission: "users.create",
        }
      );
      break;

    case "supervisor":
      menuItems.push(
        {
          name: "Inventario",
          path: "/inventario",
          icon: "📦",
          permission: "inventory.view",
        },
        {
          name: "Movimientos",
          path: "/movimientos",
          icon: "🔄",
          permission: "movements.view",
        },
        {
          name: "Crear Movimiento",
          path: "/movimiento-crear",
          icon: "➕",
          permission: "movements.create",
        },
        {
          name: "Buscar Solicitud",
          path: "/buscar-solicitud",
          icon: "🔍",
          permission: "inventory.search",
        }
      );
      break;

    case "storekeeper":
      menuItems.push(
        {
          name: "Inventario",
          path: "/inventario",
          icon: "📦",
          permission: "inventory.view",
        },
        {
          name: "Movimientos",
          path: "/movimientos",
          icon: "🔄",
          permission: "movements.view",
        },
        {
          name: "Crear Movimiento",
          path: "/movimiento-crear",
          icon: "➕",
          permission: "movements.create",
        },
        {
          name: "Buscar Solicitud",
          path: "/buscar-solicitud",
          icon: "🔍",
          permission: "inventory.search",
        }
      );
      break;

    case "operador":
      menuItems.push(
        {
          name: "Inventario",
          path: "/inventario",
          icon: "📦",
          permission: "inventory.view",
        },
        {
          name: "Solicitudes Pendientes",
          path: "/requests-pendientes",
          icon: "⏳",
          permission: "requests.view",
        }
      );
      break;
  }

  // Filter menu items based on permissions
  return menuItems.filter((item) => hasPermission(item.permission));
}

export default {
  hasPermission,
  hasAnyPermission,
  canAccessRoute,
  getUserRole,
  isAdmin,
  isSupervisor,
  isStorekeeper,
  isOperador,
  getAccessibleRoutes,
  getMenuItems,
};
