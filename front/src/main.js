import { createApp } from "vue";

import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import backgroundSync from "./services/backgroundSync";

// Vuetify
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";

const vuetify = createVuetify({
  components,
  directives,
});

// Initialize simplified background sync service
backgroundSync.init().then(() => {
  // Setup periodic sync with regular intervals
  backgroundSync.setupPeriodicSync();
});

createApp(App).use(router).use(vuetify).mount("#app");
