import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'src/mypandoc.ts',
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      output: {
        entryFileNames: 'mypandoc.js',
        chunkFileNames: 'assets/[name]-[hash].js',

        banner: '#!/usr/bin/env node',
      },
    },
  },
});