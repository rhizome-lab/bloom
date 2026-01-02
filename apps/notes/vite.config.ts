import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  base: "/viwo/notes/",
  build: {
    target: "esnext",
  },
  plugins: [solidPlugin()],
  server: {
    port: 3004,
  },
});
