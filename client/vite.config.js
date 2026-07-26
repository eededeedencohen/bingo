import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Tailwind v4 is a Vite plugin — no tailwind.config.js and no PostCSS file needed.
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Bind on 0.0.0.0 so 60 people on the same Wi-Fi can open the game on their phones.
    host: true,
  },
});
