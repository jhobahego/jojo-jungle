# Bundle chunk >500kB (Phaser vendor split)

## Contexto
- Qué existe hoy: MVP jugable T1–T5 completo (`src/main.js` con `BootScene`, `PreloadScene`, `PlayScene`, `GameOverScene`, `HUDScene`; `physics arcade` con `debug: false`; `pixelArt: true`, `Scale.FIT + CENTER_BOTH`). Stack: Node 24 + pnpm 12.6.0 + Phaser **4.2.1** pineado + Vite **8.3.0** (usa Rolldown, no Rollup) + JS (ver `AGENTS.md`, `package.json`).
- Medición vigente (`pnpm build`, 2026-09-30): `dist/assets/index-*.js` ≈ **1.387 kB** (gzip ≈ **361 kB**) → warning `Some chunks are larger than 500 kB`. Causa: `import Phaser from 'phaser'` completo en un solo bundle (`src/main.js:1`). No existe ningún `vite.config.*`.
- Deuda registrada en `TODO.md` ("warning chunk >500kB"), cuyo Verify acepta dos salidas: `pnpm build` sin warning, **o** con límite justificado + medición de carga documentada.
- Patrones a seguir: `src/main.js` (config actual del juego, punto de entrada a no romper); doc oficial Vite 8 vía Context7 — en Vite 8 `build.rollupOptions.output.manualChunks` está deprecado, la vía es `build.rolldownOptions.output.codeSplitting.groups` (`{ name, test }` con string o RegExp); `build.chunkSizeWarningLimit` está en kB (default 500).
- Decisiones ya tomadas (no re-discutir, aprobadas con el flujo): estrategia = vendor chunk `phaser` separado con caché larga (con o sin `import()` dinámico); import parcial `phaser/src/...` DESCARTADO salvo bloqueo total (frágil entre versiones, se rompe al actualizar); si el warning persiste solo en el chunk de `phaser` (él solo ya supera 500 kB) el resultado válido es límite justificado (~1500 kB) + medición documentada; reportes en español; tareas pequeñas de una por sesión (< ~3 archivos); sin dependencias nuevas.

## Objetivo
`pnpm build` sin warning de chunk, o con límite justificado + medición documentada, sin regresión jugable ni dependencias nuevas.

## Flujo
Diagrama de SECUENCIA. Versión **comprimida** (aprobada por el usuario):
```
SECUENCIA (orden temporal ↓)
1. Dev → Terminal: `pnpm build` (Vite 8 + Rolldown mide chunks y gzip)
2. Build → Dev: chunk `index-*.js` ≈1.387 MB > 500 kB → warning (gzip ≈361 kB)
3. Dev → Repo: crea `vite.config.js` (vendor `phaser` aparte vía rolldownOptions; opcional boot ligero con `import()` dinámico)
4. Dev → Terminal: `pnpm build` re-mide chunks
5. Build → Dev: sin warning, o warning residual en chunk `phaser` con límite justificado + medición documentada
6. Dev → Navegador (`pnpm dev` + preview del build): boot ok → press-start → jugar sin regresión
7. Dev → TODO.md: actualiza cifras, estrategia elegida y cierre
```

Diagrama de FLUJO (decisiones y ramas — acá viven los casos borde):
```
pnpm build
   │
   ▼
¿warning >500kB? ──no──▶ actualizar TODO.md y cerrar (nada que hacer)
   │ sí
   ▼
¿el peso es solo `phaser` (código propio liviano)? ──no──▶ recortar peso propio primero (assets/imports)
   │ sí
   ▼
¿import parcial `phaser/src` (tree-shaking)? ──sí──▶ DESCARTADO salvo bloqueo total (frágil entre versiones, se rompe al actualizar)
   │ no
   ▼
¿vendor chunk `phaser` separado (caché larga)? ──sí──▶ `vite.config.js` + rebuild
   │ no (bundle único)
   ▼
¿boot ligero + `import()` dinámico del juego? ──sí──▶ partir boot/juego + rebuild
   │ no
   ▼
subir `chunkSizeWarningLimit` con justificación + medición (solo silencia, no reduce peso)
   │
   ▼
¿warning persiste solo en el chunk `phaser`? ──sí──▶ ESPERADO: límite justificado (~1500 kB) + documentar gzip/tiempo de carga
   │ no
   ▼
¿`pnpm dev`/preview arranca y se juega igual? ──no──▶ revertir config (no romper el MVP)
   │ sí
   ▼
actualizar TODO.md y cerrar
```

## Restricciones
- NO tocar `SpriteSheets/`, `GIFs/`, `Mockups/` (solo consulta); NO mover ni renombrar assets; `public/` solo con copias si Vite lo exige.
- NO cambiar gameplay ni escenas: flujo Boot → Preload → Play → GameOver/HUD debe seguir idéntico; `arcade.debug` se mantiene en `false`.
- Phaser **4.2.1** pineado, nunca v3; JS, no TypeScript; config de build solo vía `vite.config.js` (archivo nuevo permitido, es config de Vite, no dependencia).
- Sin dependencias nuevas salvo `phaser` + `vite` (más `@vitejs/plugin-*` si el template lo pide), justificando el resto.
- Física y render intactos: `pixelArt: true`, `Scale.FIT + CENTER_BOTH`, zoom entero; no estilar el canvas a mano.

## Fuera de alcance
- Import parcial de Phaser (`phaser/src/...`) o build custom con tree-shaking (descartado en el flujo salvo bloqueo total).
- Optimización de imágenes/audio, lazy-load de assets del juego, compresión extra (brotli) o CDN/deploy.
- Cambios de gameplay, HUD, niveles, tilemaps, audio, partículas, migración a TypeScript, CI/CD.
- Deuda de combate MVP (`TODO.md` segunda sección: daño fuera de pantalla, torreta, alcance de balas).

## Tareas
### T1: Vendor chunk `phaser` separado + medición
- **Hacer:** Crear `vite.config.js` con `defineConfig` que aisle `phaser` en su propio chunk vía `build.rolldownOptions.output.codeSplitting.groups` (grupo `name: 'phaser'`, `test` que case `node_modules/phaser`); correr `pnpm build` y anotar tamaños (bruto + gzip) del chunk `phaser-*.js` y del chunk de la app por separado.
- **Archivos:** `vite.config.js` (nuevo, único archivo)
- **Verify:** `pnpm build` muestra `dist/assets/phaser-*.js` separado de `dist/assets/index-*.js` con sus cifras de gzip; el juego no se toca todavía.

### T2: Boot ligero con `import()` dinámico (solo si T1 no basta)
- **Hacer:** SOLO si tras T1 el chunk inicial sigue >500 kB y no se quiere cerrar con límite justificado: partir el arranque para que el boot/press-start cargue primero y el resto del juego (`PlayScene` y dependencias pesadas) entre por `import()` dinámico; re-medir con `pnpm build`. Si T1 + T3 ya cumplen el Verify, esta tarea SE SALTA y se documenta el salto en `TODO.md`.
- **Archivos:** `src/main.js` (+ toques mínimos en `src/scenes/BootScene.js` si el split lo exige)
- **Verify:** `pnpm build` muestra chunk inicial pequeño + chunk del juego diferido; manual `pnpm dev`: se ve press-start igual que antes y al pulsar se juega sin regresión (correr/saltar/disparar/HUD).

### T3: Límite justificado + documentar y cerrar
- **Hacer:** Ajustar `build.chunkSizeWarningLimit` en `vite.config.js` al valor medido redondeado hacia arriba (~1500 kB) con comentario de justificación (chunk `phaser` 4.2.1 indivisible, gzip ≈361 kB aceptable en desktop); actualizar `TODO.md`: cifras nuevas por chunk, estrategia elegida (y si T2 se saltó o no), medición de carga; marcar la sección como cerrada.
- **Archivos:** `vite.config.js`, `TODO.md`
- **Verify:** `pnpm build` pasa sin warning injustificado + manual `pnpm preview`: boot ok → press-start → jugar → game-over → reintento sin regresión.

## Done (validación final)
- [ ] `pnpm build` pasa sin errores y sin warning, o con warning residual solo en el chunk `phaser` cubierto por límite justificado + medición documentada
- [ ] Manual `pnpm dev` + `pnpm preview`: press-start → jugar (correr/saltar/agachar/disparar) → grunt + torreta responden → HUD actualiza → muerte → game-over → reintento limpio, idéntico al MVP
- [ ] `git diff` solo toca `vite.config.js` (+ `src/main.js`/`BootScene.js` si T2 se hizo, + `TODO.md`); `SpriteSheets/`, `GIFs/`, `Mockups/` intactos; sin dependencias nuevas en `package.json`
- [ ] `TODO.md` actualizado con cifras por chunk, estrategia elegida y cierre de la sección
