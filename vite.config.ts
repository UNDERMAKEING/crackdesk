import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: {
      "/groq": {
        target: "https://api.groq.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/groq/, ""),
        headers: {
          "Accept-Encoding": "identity",
        },
      },
    },
  },
});

