/* eslint-disable no-console */

import { register } from "register-service-worker";

// Register our custom service worker for both development and production
const swUrl =
  process.env.NODE_ENV === "production"
    ? `${process.env.BASE_URL}sw.js` // Our custom SW will be built to dist/sw.js
    : "/sw.js"; // In dev, serve from src/sw.js

register(swUrl, {
  ready() {
    console.log(
      "🔄 Inventory Management PWA is ready with background sync.\n" +
        "The app is being served from cache by a service worker."
    );
  },
  registered(registration) {
    console.log("✅ Service worker has been registered.");

    // Store registration for later use
    window.swRegistration = registration;

    // Register background sync if supported
    if ("sync" in registration) {
      console.log("🔄 Background Sync is supported");
    }

    // Register periodic sync if supported (Chrome only)
    if ("periodicSync" in registration) {
      registration.periodicSync
        .register("check-pending-requests", {
          minInterval: 30 * 60 * 1000, // 30 minutes
        })
        .then(() => {
          console.log("📅 Periodic Background Sync registered");
        })
        .catch((error) => {
          console.log("📅 Periodic sync not supported:", error);
        });
    }
  },
  cached() {
    console.log("💾 Content has been cached for offline use.");
  },
  updatefound() {
    console.log("⬇️ New content is downloading.");
  },
  updated(registration) {
    console.log("🔄 New content is available; please refresh.");

    // Skip update prompts entirely in development mode
    if (process.env.NODE_ENV === "development") {
      console.log("🚫 Development mode: skipping update prompt");
      return;
    }

    // Production: Check if we should show the prompt
    const lastUpdatePrompt = localStorage.getItem("lastUpdatePrompt");
    const lastUserDeclined = localStorage.getItem("updateDeclined");
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Don't show prompt if user declined recently (within 1 hour)
    if (lastUserDeclined && now - parseInt(lastUserDeclined) < oneHour) {
      console.log("🔄 User recently declined update, skipping prompt");
      return;
    }

    // Don't show prompt if one was shown recently (within 10 minutes)
    if (lastUpdatePrompt && now - parseInt(lastUpdatePrompt) < 10 * 60 * 1000) {
      console.log("🔄 Update prompt recently shown, skipping");
      return;
    }

    // Store the current time
    localStorage.setItem("lastUpdatePrompt", now.toString());

    // Show user-friendly update notification
    const shouldUpdate = window.confirm(
      "Nueva versión disponible! ¿Actualizar ahora?"
    );

    if (shouldUpdate) {
      // Clear the declined flag
      localStorage.removeItem("updateDeclined");

      // Skip waiting and activate the new service worker immediately
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        // Listen for controlling change and reload
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    } else {
      // User declined, remember this
      localStorage.setItem("updateDeclined", now.toString());
      console.log("🔄 User declined update, won't prompt again for 1 hour");
    }
  },
  offline() {
    console.log(
      "📱 No internet connection found. App is running in offline mode.\n" +
        "Operations will be queued and synced when connection returns."
    );
  },
  error(error) {
    console.error("❌ Error during service worker registration:", error);
  },
});
