/**
 * Central API base URL.
 * In development: falls back to http://localhost:4000
 * In production: set VITE_API_URL in .env before building the Docker image.
 */
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
