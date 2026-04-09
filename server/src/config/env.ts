// Centralised environment configuration
// All env-var reads happen here; the rest of the app imports from this module.

export const ENV = {
  // ── Server ──────────────────────────────────────────────────
  PORT: Number(process.env.PORT) || 4500,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ── Database ─────────────────────────────────────────────────
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_3UeVGMk6lDEF@ep-delicate-water-ahwvsfhl-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',

  // ── Auth ─────────────────────────────────────────────────────
  JWT_SECRET: process.env.JWT_SECRET || 'payroll-system-secret-key-2026',
  REFRESH_SECRET: process.env.REFRESH_SECRET || 'payroll-refresh-secret-key-2026',
  ACCESS_TOKEN_EXPIRY: '1d',
  REFRESH_TOKEN_EXPIRY: '7d',

  // ── File paths ───────────────────────────────────────────────
  OUTPUT_DIR: process.env.OUTPUT_DIR || '',    // resolved at runtime in app.ts
  TEMP_DIR: process.env.TEMP_DIR || '',        // resolved at runtime in relevant services
  CLIENT_PATH: process.env.CLIENT_PATH || '',  // resolved at runtime in app.ts

  // ── CORS ─────────────────────────────────────────────────────
  ALLOWED_ORIGINS: [
    'http://localhost:5173',
    'http://localhost:3000',
  ],
} as const;
