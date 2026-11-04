/**
 * api.js — Central API URL configuration.
 * Dev: Vite proxies /api → Express :43141, so relative '/api' works.
 * Prod: relative '/api' (Vercel/Render) or VITE_API_URL override.
 */
export const API_BASE = import.meta.env.VITE_API_URL || '/api';
