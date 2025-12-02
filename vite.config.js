import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import lessonManagerPlugin from './vite-plugin-lesson-manager'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), lessonManagerPlugin()],
})
