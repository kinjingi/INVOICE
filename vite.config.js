import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8080,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
