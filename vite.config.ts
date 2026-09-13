import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    /* The dev server has no serverless functions, so every /api route 404s
       locally. That is not only an inconvenience for testing the flows that need
       them — it means /delete cannot complete, so a local probe physically
       cannot clean up the anonymous account it created, which is where several
       batches of orphaned rows came from.
       
       Both point at the same Supabase project already; the proxy does not widen
       what a local run can touch, it just lets it finish. */
    proxy: {
      '/api': {
        target: 'https://www.sovrn.online',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
