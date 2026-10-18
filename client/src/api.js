import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Add the login token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server rejects a logged-in request, the token is bad or expired,
// so log the user out. A wrong password on the login page sends no token,
// so it does not trigger this.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const sentToken = Boolean(err.config?.headers?.Authorization);
    if (err.response?.status === 401 && sentToken) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// Turn any error into a message you can show on screen
export function getErrorMessage(err) {
  return (
    err.response?.data?.message ||
    (err.request ? "Cannot reach the server. Is it running?" : "Something went wrong")
  );
}

export default api;