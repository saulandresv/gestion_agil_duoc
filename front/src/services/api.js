class ApiService {
  constructor(baseURL = "http://localhost:3000") {
    this.baseURL = baseURL;
    this.dbName = "inventario_cache";
    this.dbVersion = 1;
    this.storeName = "api_cache";
    this.db = null;
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: "endpoint",
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.initDB();
    }
  }

  async saveToCache(endpoint, data) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const cacheData = {
        endpoint,
        data,
        timestamp: Date.now(),
      };

      const request = store.put(cacheData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFromCache(endpoint) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(endpoint);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  getAuthHeaders() {
    const token = localStorage.getItem("auth_token");
    const tokenType = localStorage.getItem("token_type") || "Bearer";

    if (token) {
      return {
        Authorization: `${tokenType} ${token}`,
        "Content-Type": "application/json",
      };
    }
    return {
      "Content-Type": "application/json",
    };
  }

  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Guardar en IndexedDB
      await this.saveToCache(endpoint, data);

      // Emit sync event for UI updates
      this.emitSyncEvent(endpoint);

      return data;
    } catch (error) {
      console.warn("Network request failed, checking cache:", error);

      // Si no hay internet, obtener de IndexedDB
      const cachedData = await this.getFromCache(endpoint);
      if (cachedData) {
        console.log("Returning cached data for:", endpoint);
        return cachedData;
      }

      throw new Error(
        `No data available for ${endpoint} - network failed and no cache found`
      );
    }
  }

  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("POST request failed:", error);
      throw error;
    }
  }

  async put(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("PUT request failed:", error);
      throw error;
    }
  }

  async patch(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("PUT request failed:", error);
      throw error;
    }
  }

  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("DELETE request failed:", error);
      throw error;
    }
  }

  async clearCache(endpoint) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(endpoint);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllCache() {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async hasCache(endpoint) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(endpoint);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCacheInfo(endpoint) {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(endpoint);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            hasCache: true,
            timestamp: result.timestamp,
            age: Date.now() - result.timestamp,
          });
        } else {
          resolve({ hasCache: false });
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Event system for sync notifications
  emitSyncEvent(endpoint) {
    const event = new CustomEvent("api-sync", {
      detail: { endpoint, timestamp: Date.now() },
    });
    window.dispatchEvent(event);
  }

  // Get the most recent sync timestamp across all endpoints
  async getLastSyncTime() {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("timestamp");

      // Get all records sorted by timestamp (descending)
      const request = index.openCursor(null, "prev");

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          // Return the most recent timestamp
          resolve(cursor.value.timestamp);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Exportar instancia singleton
const baseURL = process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
const api = new ApiService(baseURL);
export default api;
