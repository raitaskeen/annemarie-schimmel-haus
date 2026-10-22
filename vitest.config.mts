import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside the React server runtime; unit tests import server modules directly.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Synthetic values only — the unit tests never touch a real database or provider.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgres://test:test@127.0.0.1:1/test",
      AUTH_SECRET: "test-secret-that-is-at-least-thirty-two-characters-long",
      APP_URL: "http://localhost:4000",
      WHATSAPP_APP_SECRET: "whatsapp-app-secret-for-tests",
    },
    testTimeout: 20_000,
  },
});
