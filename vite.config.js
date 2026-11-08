import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The backend's CORS only allows FRONTEND_ORIGIN (http://localhost:5173): fail loudly instead
  // of silently moving to another port that CORS would reject.
  server: { port: 5173, strictPort: true },
})
