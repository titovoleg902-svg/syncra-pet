import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Относительные пути — сборка работает и локально, и на GitHub Pages (/syncra-pet/).
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    // Разрешаем открывать dev-сервер через HTTPS-туннель (адрес меняется при каждом запуске).
    allowedHosts: true,
  },
  // Собранная версия (npm run phone): несколько файлов вместо десятков — быстро грузится через туннель.
  preview: {
    port: 5173,
    strictPort: true,
    host: true,
    allowedHosts: true,
  },
});
