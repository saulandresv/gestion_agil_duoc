<template>
  <nav v-if="isLogged">
    <span class="user-display">👤 {{ currentUser }} ({{ userRole }})</span>
    <template v-for="(item, index) in menuItems" :key="item.path">
      <router-link :to="item.path">{{ item.name }}</router-link>
      <span v-if="index < menuItems.length - 1"> | </span>
    </template>
    <span v-if="menuItems.length > 0"> | </span>
    <span @click="logout()" class="logout-btn">Logout</span>
    <span
      v-if="showNotificationButton"
      @click="enableNotifications"
      class="notification-enable"
      title="Habilitar notificaciones"
      >🔔</span
    >
    <span :class="['connection-status', online ? '' : 'offline']">🛜</span>
    <span class="sync-status">🔄 {{ lastSyncText }}</span>
  </nav>
  <router-view />
</template>
<script>
import auth from "@/services/auth";
import api from "@/services/api";
import backgroundSync from "@/services/backgroundSync";
import roleGuard from "@/utils/roleGuard";
export default {
  data() {
    return {
      online: navigator.onLine,
      lastSyncTime: null,
      syncInterval: null,
      currentUser: "Usuario",
      userRole: "guest",
      notificationPermission: "default",
    };
  },
  mounted() {
    window.addEventListener("online", this.updateOnline);
    window.addEventListener("offline", this.updateOnline);
    window.addEventListener("api-sync", this.handleSyncEvent);
    this.initSyncStatus();

    // Load user profile when logged in
    if (this.isLogged) {
      this.loadUserProfile();
    }

    // Check notification permission status
    if ("Notification" in window) {
      this.notificationPermission = Notification.permission;
    }

    // Update sync status every minute
    this.syncInterval = setInterval(() => {
      this.updateLastSyncTime();
    }, 60000);
  },
  beforeUnmount() {
    window.removeEventListener("online", this.updateOnline);
    window.removeEventListener("offline", this.updateOnline);
    window.removeEventListener("api-sync", this.handleSyncEvent);
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  },
  methods: {
    logout() {
      auth.logout();
      this.userRole = "guest";
      this.$router.push({ name: "login" });
    },
    updateOnline() {
      this.online = navigator.onLine;
    },
    async initSyncStatus() {
      // Get the most recent sync time across all endpoints
      try {
        this.lastSyncTime = await api.getLastSyncTime();
      } catch (error) {
        console.warn("Could not get sync status:", error);
      }
    },
    handleSyncEvent(event) {
      // Update sync time when any API call completes successfully
      this.lastSyncTime = event.detail.timestamp;
      console.log(`🔄 Sync updated: ${event.detail.endpoint}`);
    },
    updateLastSyncTime() {
      // Force reactivity update
      this.$forceUpdate();
    },
    updateSyncTime() {
      this.lastSyncTime = Date.now();
    },
    loadUserProfile() {
      const currentUser = auth.getCurrentUser();
      this.currentUser = currentUser.fullName || "Usuario";
      this.userRole = currentUser.role || "guest";
    },
    async enableNotifications() {
      try {
        const permission = await backgroundSync.requestNotificationPermission();
        this.notificationPermission = permission;

        if (permission === "granted") {
          console.log("✅ Notifications enabled");
        } else {
          console.log("❌ Notifications denied");
        }
      } catch (error) {
        console.error("Error enabling notifications:", error);
      }
    },
  },
  computed: {
    isLogged() {
      return auth.isAuthenticated.value;
    },
    menuItems() {
      if (!this.isLogged) return [];
      return roleGuard.getMenuItems();
    },
    showNotificationButton() {
      return (
        "Notification" in window &&
        this.notificationPermission === "default" &&
        this.isLogged
      );
    },
    lastSyncText() {
      if (!this.lastSyncTime) {
        return "Última sincronización: nunca";
      }

      const syncDate = new Date(this.lastSyncTime);
      const timeString = syncDate.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const now = Date.now();
      const diffMs = now - this.lastSyncTime;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) {
        return `Última sincronización: ahora (${timeString})`;
      } else if (diffMinutes < 60) {
        return `Última sincronización: hace ${diffMinutes} min (${timeString})`;
      } else if (diffHours < 24) {
        return `Última sincronización: hace ${diffHours}h (${timeString})`;
      } else {
        return `Última sincronización: hace ${diffDays}d (${timeString})`;
      }
    },
  },
};
</script>
<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}
.connection-status {
  position: absolute;
  top: 15px;
  right: 15px;
  font-weight: bold;
}

.sync-status {
  position: absolute;
  top: 15px;
  right: 60px;
  font-size: 0.8rem;
  color: #666;
  font-weight: normal;
}

.user-display {
  position: absolute;
  top: 15px;
  left: 15px;
  font-size: 0.9rem;
  color: #2c3e50;
  font-weight: bold;
}

.logout-btn {
  cursor: pointer;
  color: #d32f2f;
  font-weight: bold;
  transition: color 0.3s;
}

.logout-btn:hover {
  color: #b71c1c;
}

.notification-enable {
  position: absolute;
  top: 15px;
  right: 100px;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
  transition: color 0.3s;
}

.notification-enable:hover {
  color: #42b983;
}

.connection-status.offline::after {
  content: "";
  width: 32px;
  height: 3px;
  display: block;
  background-color: red;
  transform: rotate(-45deg);
  bottom: 10px;
  position: absolute;
  right: -6px;
}

.connection-status.offline::before {
  content: "";
  width: 20px;
  height: 20px;
  display: block;
  position: absolute;
  border: 3px solid red;
  border-radius: 100%;
  right: -3px;
  bottom: -1px;
}
</style>
