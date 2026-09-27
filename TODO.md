# TODO — warning chunk >500kB (Phaser bundle)

## Estado actual (T2, verificado)
- `pnpm build` pasa; aviso: `dist/assets/index-*.js` ≈ 1.375 kB (gzip ≈ 358 kB) con Phaser 4.2.1.
- Causa: se importa `phaser` completo en un solo bundle (`import Phaser from 'phaser'` en `src/main.js`).

## Consideraciones (a decidir en la spec del MVP, no aquí)
1. **Medir antes de optimizar:** gzip 358 kB suele ser aceptable en banda ancha desktop; si el objetivo incluye móvil/redes lentas, sí partir el bundle.
2. **`import()` dinámico + code-splitting:** cargar primero una pantalla boot ligera y el chunk del juego después (inicio percibido más rápido). Es la vía recomendada por el propio warning de Vite.
3. **Separar chunk vendor:** `build.rollupOptions.output.manualChunks` (o `build.rolldownOptions` en Vite 8) para aislar `phaser` en su propio chunk con caché larga.
4. **Import parcial de Phaser:** importar desde `phaser/src/...` o build custom para tree-shaking. Riesgo: frágil entre versiones, se rompe fácil al actualizar; solo si el tamaño es bloqueante y se pinea la versión (hoy `4.2.1` exacto).
5. **Subir `build.chunkSizeWarningLimit`:** solo silencia el aviso, no reduce peso. Aceptable únicamente si se mide y el tiempo de carga es OK.
6. **No hacer ahora:** el scaffold de T2 queda en un bundle; esta optimización pertenece a `specs/mvp-*.md`.

## Verify (cuando se aborde)
- `pnpm build` sin warning de chunk, o con límite justificado + medición de carga documentada.

---

# Deuda de combate MVP (T4, verificado jugable)

## Estado actual
- Balas de John, grunt y torreta vuelan, hacen daño/matan y el flujo muerte → game-over → reintento funciona (verificado con screenshots).
- Comportamiento provisorio aceptado para el MVP: sin restricción de visión ni de alcance, torreta con frame fijo.

## Pendiente (post-MVP, no es alcance de T5)
1. **Daño fuera de pantalla:** John, grunt y torreta pueden dispararse y dañarse sin verse (p. ej. matar al grunt desde el spawn, o recibir balas enemigas desde fuera de cámara). Dirección a decidir: activar patrulla/disparo solo si atacante y objetivo están en cámara (± margen), o rango de agro por distancia; ignorar overlaps fuera de vista.
2. **Torreta sin animación / apunta a un solo lado:** `turret.png` es una tira de 8 frames de 18x18 (hoy se usa solo el frame 0, que mira a la izquierda) pero dispara al lado donde esté John. Dirección a decidir: elegir frame (o `flipX`) según el signo de `john.x - turret.x`; antes verificar qué orientación representa cada frame de la tira.
3. **Alcance "infinito" de balas:** las balas solo mueren al salir del nivel (margen ±30px), lo que agrava el punto 1. Dirección a decidir: rango máximo por distancia recorrida o tiempo de vida (p. ej. desactivar tras ~300px o ~1s), coherente con el rango de agro del punto 1.

## Verify (cuando se aborde)
- Manual `pnpm dev`: fuera de cámara no hay disparos ni daño en ningún sentido; la torreta mira al lado al que dispara; las balas desaparecen a medio camino del nivel.
