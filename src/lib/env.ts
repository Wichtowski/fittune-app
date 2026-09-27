const configured = typeof import.meta.env.VITE_API_BASE_URL === "string" ? import.meta.env.VITE_API_BASE_URL.trim() : "";

export const API_BASE_URL = (configured || "http://localhost:4733").replace(/\/+$/, "");
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION || "dev";
