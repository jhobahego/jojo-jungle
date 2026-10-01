import { defineConfig } from 'vite';

// T1 (specs/bundle-chunk-500kb.md): aislar `phaser` en su propio chunk
// con caché larga. Vite 8 usa Rolldown: la vía es
// `build.rolldownOptions.output.codeSplitting.groups`
// (`manualChunks` de Rollup está deprecado).
export default defineConfig({
  build: {
    // T3 (specs/bundle-chunk-500kb.md): límite justificado a 1500 kB.
    // El chunk `phaser` 4.2.1 es indivisible por sí solo (≈1.375 kB;
    // gzip ≈357 kB, aceptable en desktop) y ya vive en su propio chunk
    // con caché larga, así que el aviso genérico de 500 kB no aplica.
    // Esto solo silencia el aviso, no reduce peso (ver TODO.md).
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'phaser',
              test: /node_modules\/phaser/,
            },
          ],
        },
      },
    },
  },
});
