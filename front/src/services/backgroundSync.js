// Background Sync Service for PWA
// Handles offline operations and background synchronization

class BackgroundSyncService {
  constructor() {
    this.dbName = "InventarioDB";
    this.dbVersion = 2; // Increased version to trigger schema update
    this.isOnline = navigator.onLine;
    this.apiUrl = process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
    this.healthCheckInterval = null;
    this.isDBAvailable = false;

    // Listen for online/offline events as fallback
    window.addEventListener("online", () => {
      this.checkAPIConnectivity();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });

    // Start periodic health checks
    this.startHealthChecks();
  }

  // Check API connectivity using health endpoint
  async checkAPIConnectivity() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.apiUrl}/health`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      const previousState = this.isOnline;
      this.isOnline = response.ok && response.status === 200;

      // If connectivity changed, log and trigger sync if now online
      if (this.isOnline !== previousState) {
        console.log(
          `🌐 API connectivity changed: ${this.isOnline ? "ONLINE" : "OFFLINE"}`
        );
        if (this.isOnline) {
          this.triggerSync();
        }
      }

      return this.isOnline;
    } catch (error) {
      console.log(`📱 API connectivity check failed: ${error.message}`);
      this.isOnline = false;
      return false;
    }
  }

  // Start periodic health checks
  startHealthChecks() {
    // Initial check
    this.checkAPIConnectivity();

    // Check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkAPIConnectivity();
    }, 30000);

    console.log("🔄 Started periodic API health checks (every 30s)");
  }

  // Stop health checks (for cleanup)
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log("⏹️ Stopped periodic API health checks");
    }
  }

  // Initialize the service - simplified without custom SW
  async init() {
    try {
      await this.initializeDB();
      console.log("✅ Background sync service initialized");
      this.isDBAvailable = true;
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize background sync service:", error);
      console.warn(
        "⚠️ Background sync will operate in degraded mode (no offline storage)"
      );
      this.isDBAvailable = false;
      return false;
    }
  }

  // Request notification permission (must be called from user interaction)
  async requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      console.log("🔔 Notification permission:", permission);
      return permission;
    }
    return Notification.permission;
  }

  // Initialize database with proper schema
  async initializeDB() {
    // Check if database is already being initialized
    if (this._initPromise) {
      console.log("🔄 Database initialization already in progress, waiting...");
      return this._initPromise;
    }

    // eslint-disable-next-line no-async-promise-executor
    this._initPromise = new Promise(async (resolve, reject) => {
      console.log(
        `🗄️ Initializing IndexedDB: ${this.dbName} v${this.dbVersion}`
      );

      // Try shorter timeout first, then fallback
      let timeoutDuration = 5000; // Start with 5 seconds
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`📡 Attempt ${attempts}/${maxAttempts} to open database`);

        try {
          const db = await this._openDatabase(timeoutDuration);
          console.log("✅ IndexedDB opened successfully");
          this._initPromise = null; // Clear the promise
          resolve(db);
          return;
        } catch (error) {
          console.warn(`⚠️ Attempt ${attempts} failed:`, error.message);

          if (attempts === maxAttempts) {
            console.error("❌ All database initialization attempts failed");
            // Try to clear corrupted database as last resort
            try {
              console.log(
                "🗑️ Attempting to clear potentially corrupted database..."
              );
              await this._forceDeleteDatabase();
              // Try one more time after clearing
              const db = await this._openDatabase(10000);
              console.log("✅ Database recovered after clearing");
              this._initPromise = null;
              resolve(db);
              return;
            } catch (clearError) {
              console.error("❌ Failed to recover database:", clearError);
              this._initPromise = null;
              reject(
                new Error(
                  `Database initialization failed after ${maxAttempts} attempts: ${error.message}`
                )
              );
              return;
            }
          }

          // Wait before next attempt
          await new Promise((r) => setTimeout(r, 1000));
          timeoutDuration += 2000; // Increase timeout for next attempt
        }
      }
    });

    return this._initPromise;
  }

  // Helper method to open database with timeout
  async _openDatabase(timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Database open timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        clearTimeout(timeoutId);
        reject(
          new Error(
            `IndexedDB open error: ${
              event.target.error?.message || "Unknown error"
            }`
          )
        );
      };

      request.onsuccess = (event) => {
        clearTimeout(timeoutId);
        resolve(event.target.result);
      };

      request.onblocked = () => {
        console.warn("⚠️ IndexedDB open blocked - other tabs may be open");
        // Don't reject immediately, let timeout handle it
      };

      request.onupgradeneeded = (event) => {
        console.log("🔄 IndexedDB upgrade needed, creating object stores...");
        const db = event.target.result;

        try {
          // Create stores for different operation types
          if (!db.objectStoreNames.contains("request_operations")) {
            console.log("📦 Creating request_operations store");
            db.createObjectStore("request_operations", {
              keyPath: "id",
              autoIncrement: true,
            });
          }

          if (!db.objectStoreNames.contains("stock_updates")) {
            console.log("📦 Creating stock_updates store");
            db.createObjectStore("stock_updates", {
              keyPath: "id",
              autoIncrement: true,
            });
          }

          if (!db.objectStoreNames.contains("pending_movements")) {
            console.log("📦 Creating pending_movements store");
            db.createObjectStore("pending_movements", {
              keyPath: "id",
              autoIncrement: true,
            });
          }

          console.log("✅ All object stores created");
        } catch (upgradeError) {
          console.error("❌ Error during database upgrade:", upgradeError);
          clearTimeout(timeoutId);
          reject(upgradeError);
        }
      };
    });
  }

  // Force delete database (recovery method)
  async _forceDeleteDatabase() {
    return new Promise((resolve) => {
      const deleteReq = indexedDB.deleteDatabase(this.dbName);

      // Always resolve after timeout, even if blocked
      const timeoutId = setTimeout(() => {
        console.log("🕐 Database deletion timeout, continuing anyway");
        resolve();
      }, 3000);

      deleteReq.onsuccess = () => {
        clearTimeout(timeoutId);
        console.log("✅ Database deleted successfully");
        resolve();
      };

      deleteReq.onerror = () => {
        clearTimeout(timeoutId);
        console.warn("⚠️ Database deletion failed, continuing anyway");
        resolve();
      };

      deleteReq.onblocked = () => {
        console.warn("⚠️ Database deletion blocked");
        // Timeout will handle this
      };
    });
  }

  // Store operation for background sync when offline
  async queueOperation(storeName, operation) {
    // Ensure database is initialized first
    await this.initializeDB();

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;

        // Check if store exists before using it
        if (!db.objectStoreNames.contains(storeName)) {
          reject(new Error(`Store ${storeName} does not exist`));
          return;
        }

        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);

        const addRequest = store.add({
          ...operation,
          timestamp: Date.now(),
          synced: false,
        });

        addRequest.onsuccess = () => {
          console.log(
            `✅ Operation queued for sync: ${
              operation.type || "batch_movements"
            }`
          );
          resolve(addRequest.result);
        };

        addRequest.onerror = () => reject(addRequest.error);
      };
    });
  }

  // Trigger background sync via service worker
  async triggerSync() {
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;

        // Register sync events for different operation types
        await registration.sync.register("sync-pending-requests");
        await registration.sync.register("sync-stock-updates");
        await registration.sync.register("sync-movements");

        console.log("🔄 Background sync registered via service worker");
      } catch (error) {
        console.error("Background sync registration failed:", error);

        // Fallback: manual sync if background sync not supported
        const isAPIOnline = await this.checkAPIConnectivity();
        if (isAPIOnline) {
          console.log("🔄 Fallback: Manual sync for queued operations...");
          await this.manualSync();
        }
      }
    } else {
      // Fallback for browsers without background sync support
      const isAPIOnline = await this.checkAPIConnectivity();
      if (isAPIOnline) {
        console.log("🔄 Manual sync (no background sync support)...");
        await this.manualSync();
      }
    }
  }

  // Manual sync fallback for browsers without background sync
  async manualSync() {
    try {
      // Sync pending requests
      const pendingRequests = await this.getPendingOperations(
        "request_operations"
      );
      for (const operation of pendingRequests) {
        try {
          await this.processRequestOperation(operation);
          await this.removePendingOperation("request_operations", operation.id);
          console.log(
            `✅ Manually synced ${operation.type} for request ${operation.requestId}`
          );
        } catch (error) {
          console.error(`❌ Failed to manually sync operation:`, error);
        }
      }

      // Sync pending movements
      const pendingMovements = await this.getPendingOperations(
        "pending_movements"
      );
      for (const movement of pendingMovements) {
        try {
          await this.processBatchMovements(movement);
          await this.removePendingOperation("pending_movements", movement.id);
          console.log(
            `✅ Manually synced batch movements: ${movement.movements.length} items`
          );
        } catch (error) {
          console.error(`❌ Failed to manually sync movements:`, error);
        }
      }
    } catch (error) {
      console.error("Error in manual sync:", error);
    }
  }

  // Queue request approval for background sync
  async queueRequestApproval(requestId, data) {
    const operation = {
      type: "approve",
      requestId: requestId,
      data: data,
    };

    if (this.isOnline) {
      // If online, process immediately
      return this.processRequestOperation(operation);
    } else {
      // If offline, queue for later
      await this.queueOperation("request_operations", operation);
      await this.triggerSync();
      return {
        queued: true,
        message: "Operación guardada para procesar cuando haya conexión",
      };
    }
  }

  // Queue request rejection for background sync
  async queueRequestRejection(requestId, data) {
    const operation = {
      type: "reject",
      requestId: requestId,
      data: data,
    };

    if (this.isOnline) {
      return this.processRequestOperation(operation);
    } else {
      await this.queueOperation("request_operations", operation);
      await this.triggerSync();
      return {
        queued: true,
        message: "Operación guardada para procesar cuando haya conexión",
      };
    }
  }

  // Process request operation immediately
  async processRequestOperation(operation) {
    const apiUrl = process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
    const endpoint = operation.type === "approve" ? "approve" : "reject";

    try {
      const response = await fetch(
        `${apiUrl}/solicitudes/${operation.requestId}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(operation.data),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error processing request operation:", error);
      throw error;
    }
  }

  // Queue batch movements for background sync
  async queueBatchMovements(movements, bodeguero) {
    const operation = {
      movements: movements,
      bodeguero: bodeguero,
      type: "batch_movements",
    };

    // Check current API connectivity
    const isAPIOnline = await this.checkAPIConnectivity();

    if (isAPIOnline) {
      try {
        return await this.processBatchMovements(operation);
      } catch (error) {
        console.log(
          "🔄 API call failed, queueing for later sync:",
          error.message
        );
        // If processing fails, queue it
        await this.queueOperation("pending_movements", operation);
        await this.triggerSync();
        return {
          queued: true,
          message:
            "Error en API. Movimientos guardados para procesar cuando esté disponible",
        };
      }
    } else {
      await this.queueOperation("pending_movements", operation);
      await this.triggerSync();
      return {
        queued: true,
        message: "Movimientos guardados para procesar cuando haya conexión",
      };
    }
  }

  // Process batch movements immediately
  async processBatchMovements(operation) {
    const apiUrl = process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";

    try {
      // Transform the movements data to match API expectations
      const movimientos = operation.movements.map((data) => ({
        producto_id: data.movimiento.producto,
        accion: data.movimiento.accion,
        cantidad: data.movimiento.cantidad,
        solicitante: data.movimiento.solicitante?.nombre || "N/A",
        ubicacion: data.movimiento.ubicacion,
        observaciones: data.movimiento.observaciones || "",
        fecha: data.movimiento.fecha,
      }));

      const response = await fetch(`${apiUrl}/movimientos/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          movimientos: movimientos,
          bodeguero: operation.bodeguero,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error processing batch movements:", error);
      throw error;
    }
  }

  // Setup periodic checks (simplified with regular intervals)
  setupPeriodicSync() {
    // Use regular JavaScript intervals instead of service worker periodic sync
    setInterval(async () => {
      const isAPIOnline = await this.checkAPIConnectivity();
      if (isAPIOnline) {
        console.log("📅 Periodic check: Processing any queued operations...");
        this.triggerSync();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    console.log("📅 Periodic sync setup with 5-minute intervals");
  }

  // Get connection status
  getConnectionStatus() {
    return {
      online: this.isOnline,
      type: navigator.connection?.effectiveType || "unknown",
      downlink: navigator.connection?.downlink || null,
    };
  }

  // Get queued operations count
  async getQueuedOperationsCount() {
    const stores = ["request_operations", "stock_updates", "pending_movements"];
    let totalCount = 0;

    for (const storeName of stores) {
      try {
        const operations = await this.getPendingOperations(storeName);
        totalCount += operations.length;
      } catch (error) {
        console.error(`Error counting operations in ${storeName}:`, error);
      }
    }

    return totalCount;
  }

  // Public method to get pending operations (for the UI)
  async getPendingOperations(storeName) {
    try {
      // Check if database is available
      if (!this.isDBAvailable) {
        console.log("📋 Database not available, returning empty array");
        return [];
      }

      // Ensure database is initialized first
      await this.initializeDB();

      return new Promise((resolve, reject) => {
        // Add timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout loading ${storeName} after 10 seconds`));
        }, 10000);

        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => {
          clearTimeout(timeoutId);
          reject(request.error);
        };

        request.onsuccess = () => {
          try {
            const db = request.result;

            if (!db.objectStoreNames.contains(storeName)) {
              clearTimeout(timeoutId);
              console.log(
                `📋 Store ${storeName} doesn't exist, returning empty array`
              );
              resolve([]);
              return;
            }

            const transaction = db.transaction([storeName], "readonly");
            const store = transaction.objectStore(storeName);
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
              clearTimeout(timeoutId);
              console.log(
                `📋 Loaded ${getAllRequest.result.length} items from ${storeName}`
              );
              resolve(getAllRequest.result);
            };

            getAllRequest.onerror = () => {
              clearTimeout(timeoutId);
              reject(getAllRequest.error);
            };
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        };
      });
    } catch (error) {
      console.error(`Error in getPendingOperations(${storeName}):`, error);
      throw error;
    }
  }

  // Public method to remove pending operation (for the UI)
  async removePendingOperation(storeName, id) {
    // Ensure database is initialized first
    await this.initializeDB();

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(storeName)) {
          resolve();
          return;
        }

        const transaction = db.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const deleteRequest = store.delete(id);

        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
    });
  }

  // Clear all pending operations and reset database
  async clearAllData() {
    try {
      console.log("🗑️ Clearing all IndexedDB data...");

      // Stop health checks temporarily
      this.stopHealthChecks();

      // Close any existing connections and delete the database
      return new Promise((resolve, reject) => {
        const deleteReq = indexedDB.deleteDatabase(this.dbName);

        deleteReq.onerror = () => {
          console.error("❌ Failed to delete database:", deleteReq.error);
          reject(deleteReq.error);
        };

        deleteReq.onsuccess = () => {
          console.log("✅ Database deleted successfully");
          resolve();
        };

        deleteReq.onblocked = () => {
          console.warn(
            "⚠️ Database deletion blocked - close other tabs/windows"
          );
          // Still resolve after a timeout if blocked
          setTimeout(() => resolve(), 2000);
        };
      }).then(async () => {
        // Reinitialize the database with empty stores
        await this.initializeDB();

        // Restart health checks
        this.startHealthChecks();

        console.log("✅ All data cleared and database reinitialized");
        return true;
      });
    } catch (error) {
      console.error("❌ Error clearing database:", error);
      // Restart health checks even if clearing failed
      this.startHealthChecks();
      throw error;
    }
  }
}

// Create singleton instance
const backgroundSync = new BackgroundSyncService();

// Initialize the database when the service is imported
backgroundSync.init().catch((error) => {
  console.error("Failed to initialize IndexedDB:", error);
});

export default backgroundSync;
