// auth.js
import { ref } from "vue";

// Initialize from localStorage
const isAuthenticated = ref(!!localStorage.getItem("auth_token"));

async function login(username, password) {
  try {
    const baseURL = process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";

    const clientId = "inventario-app";
    const clientSecret = "your-super-secret-client-secret";
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch(`${baseURL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "password",
        username: username,
        password: password,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.access_token) {
      localStorage.setItem("auth_token", data.access_token);
      localStorage.setItem("token_type", data.token_type || "Bearer");
      localStorage.setItem("current_username", username);

      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }

      // Fetch user profile after successful login
      try {
        await fetchAndStoreUserProfile();
      } catch (error) {
        console.warn("Failed to fetch user profile during login:", error);
      }

      isAuthenticated.value = true;
      return true;
    } else {
      isAuthenticated.value = false;
      return false;
    }
  } catch (error) {
    console.error("Login error:", error);
    isAuthenticated.value = false;
    return false;
  }
}

async function fetchAndStoreUserProfile() {
  try {
    const baseURL = process.env.VUE_APP_API_BASE_URL || "http://localhost:3000";
    const token = localStorage.getItem("auth_token");
    const tokenType = localStorage.getItem("token_type") || "Bearer";

    if (!token) {
      throw new Error("No authentication token available");
    }

    const response = await fetch(`${baseURL}/api/user/profile`, {
      method: "GET",
      headers: {
        Authorization: `${tokenType} ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const userProfile = await response.json();

    // Store user profile information
    localStorage.setItem("current_user_id", userProfile.id);
    localStorage.setItem("current_user_full_name", userProfile.fullName);
    localStorage.setItem("current_user_role", userProfile.role || "");
    localStorage.setItem("current_user_shift_id", userProfile.shift_id || "");

    console.log("✅ User profile stored:", userProfile.fullName);
    return userProfile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

function getCurrentUser() {
  return {
    id: localStorage.getItem("current_user_id"),
    username: localStorage.getItem("current_username"),
    fullName: localStorage.getItem("current_user_full_name"),
    role: localStorage.getItem("current_user_role"),
    shiftId: localStorage.getItem("current_user_shift_id"),
  };
}

function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("token_type");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("current_username");
  localStorage.removeItem("current_user_id");
  localStorage.removeItem("current_user_full_name");
  localStorage.removeItem("current_user_role");
  localStorage.removeItem("current_user_shift_id");
  isAuthenticated.value = false;
}

export default {
  login,
  logout,
  fetchAndStoreUserProfile,
  getCurrentUser,
  isAuthenticated, // export the ref
  isLogged: () => isAuthenticated.value,
};
