import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/shipping-label-prepper/',
  plugins: [react()],
})
