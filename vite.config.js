import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/examen-app/' // IMPORTANTE: Cambia esto por el nombre de tu repo en GitHub
})
