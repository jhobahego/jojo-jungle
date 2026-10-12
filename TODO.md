# TODO — warning chunk >500kB (Phaser bundle) — CERRADO (specs/bundle-chunk-500kb.md T1–T3)

## Estado actual (cerrado 2026-10-01)
- `pnpm build` pasa SIN warning: `chunkSizeWarningLimit: 1500` justificado en `vite.config.js`.
- Medición por chunk (`pnpm build`): `phaser-*.js` ≈ 1.375 kB (gzip ≈ 357 kB) + `index-*.js` ≈ 12,9 kB (gzip ≈ 4,1 kB), con Phaser 4.2.1.
- Estrategia elegida: vendor chunk `phaser` separado con caché larga vía `build.rolldownOptions.output.codeSplitting.groups` (en Vite 8 `manualChunks` de Rollup está deprecado). T2 (`import()` dinámico boot-primero) SALTADA: tras T1 el chunk inicial quedó en 12,9 kB < 500 kB y el flujo aprobado acepta el cierre con límite justificado; el split no ahorraría ni un byte de descarga inicial.
- Import parcial `phaser/src`: descartado (frágil entre versiones).
- Nota histórica: `specs/mvp-jugable.md` (Fuera de alcance) dejó esta optimización para después del MVP; se resolvió en `specs/bundle-chunk-500kb.md`.

## Consideraciones (a decidir en la spec del MVP, no aquí)
1. **Medir antes de optimizar:** gzip 358 kB suele ser aceptable en banda ancha desktop; si el objetivo incluye móvil/redes lentas, sí partir el bundle.
2. **`import()` dinámico + code-splitting:** cargar primero una pantalla boot ligera y el chunk del juego después (inicio percibido más rápido). Es la vía recomendada por el propio warning de Vite.
3. **Separar chunk vendor:** `build.rollupOptions.output.manualChunks` (o `build.rolldownOptions` en Vite 8) para aislar `phaser` en su propio chunk con caché larga.
4. **Import parcial de Phaser:** importar desde `phaser/src/...` o build custom para tree-shaking. Riesgo: frágil entre versiones, se rompe fácil al actualizar; solo si el tamaño es bloqueante y se pinea la versión (hoy `4.2.1` exacto).
5. **Subir `build.chunkSizeWarningLimit`:** solo silencia el aviso, no reduce peso. Aceptable únicamente si se mide y el tiempo de carga es OK.
6. **No hacer ahora:** el scaffold de T2 queda en un bundle; esta optimización pertenece a `specs/mvp-*.md`.

## Verify (cumplido 2026-10-01)
- `pnpm build` sin warning con límite justificado (1500 kB) + medición documentada arriba. Check manual `pnpm preview` OK (2026-10-01): boot ok → jugar → game-over → reintento sin regresión.

---

# Deuda de combate MVP — CERRADO (specs/deuda-combate-mvp.md T1–T4)

## Estado actual (cerrado 2026-10-01)
- Balas de John, grunt y torreta vuelan, hacen daño/matan y el flujo muerte → game-over → reintento funciona (verificado con screenshots).
- Comportamiento provisorio superado: gate de visión + alcance, torreta orientada y orden de overlaps corregido (T1–T4 debajo).

## Resuelto (era pendiente post-MVP, no alcance de T5)
1. **Daño fuera de pantalla:** cerrado en T2 — `gruntFire`/`turretFire` abortan si atacante o John están fuera de cámara (+48px) o a más de 200px (`AGRO_RANGE`); los 3 overlaps ignoran el daño fuera de cámara (+48px). Patrulla del grunt sigue activa fuera de cámara (decisión aprobada).
2. **Torreta sin animación / apuntaba a un solo lado:** cerrado en T3 — verificada la tira `turret.png` (8 ángulos: 0 = izquierda … 4 = derecha) y se fija `setFrame(dx > 0 ? 4 : 0)` antes de disparar (frame, no `flipX`, para respetar el arte).
3. **Alcance "infinito" de balas:** cerrado en T1 — `BULLET_RANGE = 200` por distancia recorrida (`spawnX`), coherente con el agro de 200; `refundAmmo` de John se mantiene al reciclar por rango.
4. **Orden de params en overlaps (hallado al verificar T3, fix T4):** Arcade entrega (sprite, hijo-del-grupo), no el orden de registro; `onJohnBulletVsGrunt/Turret` resuelven bala/víctima por pertenencia al pool. Sin esto la torreta se deshabilitaba al primer roce (sin HP ni score) y el grunt fugaba su `fireTimer`.

## Verify (cumplido 2026-10-01)
- `pnpm build` limpio + headless Chrome/CDP (`t2-s*`, `t2c-*`, `t2b-s*`, `done-*` en `/tmp/opencode/`): quieto en el spawn, 12 disparos sin matar al grunt ni perder hp (`HP:3 SCORE:0 AMMO:12`); de cerca hay disparos y daño en ambos sentidos (`HP:3→2→1`, luego `SCORE:10` al matar al grunt).
- Manual `pnpm dev` (usuario, 2026-10-01): rango 200 confirmado tras bajarlo de 320; torreta mira al lado al que dispara OK; post-fix: grunt 1 tiro (+10), torreta 2 tiros (+10), `SCORE:20` y `AMMO:12` finales.
