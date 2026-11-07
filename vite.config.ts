import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Eden server (indexer + API + live updates) runs on :8790; the dev server proxies to it.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:8790", rewrite: (p) => p.replace(/^\/api/, "") },
      "/ws": { target: "ws://127.0.0.1:8790", ws: true },
    },
  },
});
