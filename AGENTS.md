# AGENTS.md — jojo-assets (juego Phaser)

## Stack
- Runtime: Node 24 (verificado v24.15.0) + pnpm 12.6.0 (verificado 12.6.0).
- Juego: Phaser 4 + Vite + JavaScript (no TypeScript).
- Versión pineada exacta: `phaser 4.2.1` (verificado con `pnpm view phaser version`; decisión del usuario: siempre v4, nunca v3).
- Referencia oficial: https://phaser.io/

## Estructura de assets (NO mover ni renombrar)
- `SpriteSheets/player/` — sprites de John (~53 PNG: idle, run, jump, crouch, shoot, hagging, hit, dead…)
- `SpriteSheets/background/` — fondos jungla/cueva, nubes, parallax (`jungle_paralax_bg1/2.png`, …)
- `SpriteSheets/props/` — ammo, barrel, red_barrel, crate, bigcrate, plant, shelter, skullpanel
- `SpriteSheets/fx/` — explosiones, partículas, impactos, sombras
- `SpriteSheets/titlescreen/` — título, press start, game over, créditos
- `SpriteSheets/enemy/` — grunt + torreta
- `SpriteSheets/boss/` — sprites del boss
- `SpriteSheets/ui/` — elementos de interfaz
- `SpriteSheets/tiles_spritesheet.png`, `SpriteSheets/tileset.png`, `SpriteSheets/cave_tileset.png` — tiles sueltos en raíz
- `GIFs/` — referencias animadas (solo consulta, no importar al juego)
- `Mockups/` — `jjmockups.png`, `level_jungle_tiles_02_preview.png`, `eneminss1.png` (solo consulta)
- `specs/` — specs del proyecto (`setup-phaser.md`, futuro `mvp-*.md`)

## Convenciones
- Assets originales NUNCA se borran ni se convierten in-place; si Vite exige servirlos, se copian a `public/` y el original queda intacto.
- Skills de agente viven en `.agents/skills/` (existentes: `audit`, `exec`, `scope`, `prove`, `ship`, `trace`); las nuevas no sobrescriben a las existentes.
- Specs en `specs/<slug>.md` con las 7 secciones (ver `.agents/skills/scope/SKILL.md`).
- Tareas pequeñas (< ~3 archivos), una por sesión (ver `.agents/skills/exec/SKILL.md`).
- Idioma de reportes: español.
- Sin dependencias nuevas salvo `phaser` + `vite` (más `@vitejs/plugin-*` si el template lo pide), justificando el resto.

## Comandos
- `pnpm install` — instalar dependencias
- `pnpm dev` — servidor de desarrollo (verificar boot Phaser + "boot ok")
- `pnpm build` — build de producción (debe pasar sin errores)
