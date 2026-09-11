import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use APP_ instead of the default VITE_ prefix. Same browser exposure,
  // but avoids Vercel's "public framework prefix" warning — these values
  // (Supabase URL + anon key) are public-by-design and protected by RLS.
  envPrefix: 'APP_',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})
