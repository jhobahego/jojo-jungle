# Skills Phaser desde skills.sh

## Contexto
- Qué existe hoy: Phaser 4.2.1 pineado exacto + Vite 8.3.1 + JS (`package.json`, `src/main.js` con boot "boot ok"); `AGENTS.md` con stack, assets y convenciones; `TODO.md` con el plan del warning de chunk; `.agents/skills/` con 10 skills (`audit`, `exec`, `scope`, `prove`, `ship`, `trace` locales + `vite`, `frontend-design`, `accessibility`, `nodejs-best-practices` vía autoskills en T3 de `setup-phaser.md`).
- Patrones a seguir: `specs/setup-phaser.md` T3 (instalar skills con herramienta externa en `.agents/skills/` sin sobrescribir, archivos generados por el instalador no cuentan como edición manual).
- Decisiones ya tomadas (flujo aprobado, no re-discutir): instalar 15 de las 17 skills del ranking skills.sh?q=Phaser; excluir la oficial `physics-arcade` (el usuario prefiere la community `phaser-arcade-physics`) y `phaser-best-practices` (repo `ormax/nuxt-skills` inexistente, 404 verificado el 2026-09-27 tras 2 intentos; el usuario aprobó dejarla fuera); decisión 2026-09-27: siempre Phaser v4, por eso `v4-new-features` SÍ se instala; patrón de instalación VERIFICADO por el usuario: `pnpm dlx skills add <repo-url> --skill <nombre>` (equivale a `pnpx skills add …`; ejemplo: `pnpm dlx skills add https://github.com/gamedev-skills/awesome-gamedev-agent-skills --skill phaser-core); repos fuente: `https://github.com/phaserjs/phaser` (12 oficiales, incl. `v4-new-features`), `https://github.com/gamedev-skills/awesome-gamedev-agent-skills` (phaser-core, phaser-arcade-physics), `https://github.com/playableintelligence/game-creator` (phaser), `https://github.com/ormax/nuxt-skills` (phaser-best-practices); destino `.agents/skills/<nombre>/SKILL.md`; T1 piloto confirma el directorio destino antes de los lotes.

## Objetivo
Dejar 15 skills Phaser instaladas en `.agents/skills/` con su `SKILL.md` verificable, sin tocar las 10 existentes.

## Flujo
SECUENCIA (orden temporal ↓) — versión comprimida:
```
SECUENCIA (orden temporal ↓)
1. Agente → Repo: instalar skill PILOTO (game-setup-and-config) con el patrón verificado y confirmar directorio destino
2. Agente → Repo: verificar que quedó en .agents/skills/<nombre>/SKILL.md (mover a mano si el CLI usa otro dir)
3. Agente → Repo: instalar lotes restantes con el mismo patrón
4. Agente → Repo: verificar (ls + 1 SKILL.md por skill instalada, 10 previas intactas)
5. Agente → Usuario: reportar instaladas + excluidas con motivo
```
Diagrama de FLUJO (decisiones y ramas — acá viven los casos borde):
```
 inicio: 10 skills en .agents/skills/, 0 de phaser
    │
    ▼
 ¿destino fuera de .agents/skills/? ──sí──▶ mover a mano al layout del repo (y reusar en lotes)
    │ no
    ▼
 instalar piloto game-setup-and-config (`pnpm dlx skills add https://github.com/phaserjs/phaser --skill game-setup-and-config`)
    │
    ├──falla red──▶ reintento 1x──▶ sigue fallando──▶ cierre parcial documentado
    │
    ▼
 ¿quedó en .agents/skills/<nombre>/SKILL.md? ──no──▶ mover a mano al layout del repo
    │ sí
    ▼
 ¿dir destino ya existía (colisión)? ──sí──▶ NO sobrescribir, saltar + anotar
    │ no
    ▼
 instalar lotes restantes ──▶ verificar (ls + SKILL.md por skill) ──▶ resultado
```

## Restricciones
- NO sobrescribir ni borrar ninguna de las 10 skills existentes en `.agents/skills/`; ante colisión de nombre, saltar y anotar.
- NO instalar la oficial `physics-arcade` (el usuario prefiere la community `phaser-arcade-physics`) ni `phaser-best-practices` (repo inexistente, decisión de dejarla fuera aprobada); cualquier otro cambio a la selección de 15 requiere aprobación del usuario.
- Si el CLI instala en otro directorio (p. ej. `~/.agents`, `.opencode/`), mover los resultados a `.agents/skills/<nombre>/` y no dejar duplicados.
- Sin dependencias nuevas de runtime; el CLI se corre con `pnpm dlx` (sin `pnpm add`).
- Revisar por encima cada `SKILL.md` instalado: el proyecto es Phaser v4; si alguna skill apunta a Phaser 3 como API principal, anotarlo en el reporte (no borrar).

## Fuera de alcance
- Usar las skills para escribir gameplay (eso es `specs/mvp-*.md`).
- El warning de chunk >500kB (`TODO.md`, spec MVP).
- Actualizar `AGENTS.md` con la lista de skills (tarea aparte si se quiere).
- Auditar a fondo el contenido de cada skill (solo lectura superficial anti-v4).

## Tareas
### T1: Piloto game-setup-and-config (confirma destino)
- **Hacer:** Instalar `game-setup-and-config` con el patrón verificado: `pnpm dlx skills add https://github.com/phaserjs/phaser --skill game-setup-and-config` (1 reintento si falla por red). Dejarla en `.agents/skills/game-setup-and-config/SKILL.md` (mover a mano si el CLI usa otro dir) y anotar en el reporte el destino real para T2-T5.
- **Archivos:** `.agents/skills/game-setup-and-config/SKILL.md` (resto generado por el instalador)
- **Verify:** `test -f .agents/skills/game-setup-and-config/SKILL.md && head -20 .agents/skills/game-setup-and-config/SKILL.md`

### T2: Lote boot (scenes, loading-assets, scale-and-responsive)
- **Hacer:** Con el patrón verificado (`pnpm dlx skills add https://github.com/phaserjs/phaser --skill <nombre>`, destino según T1), instalar las 3 oficiales en `.agents/skills/<nombre>/`. Ante colisión, no sobrescribir.
- **Archivos:** `.agents/skills/scenes/SKILL.md`, `.agents/skills/loading-assets/SKILL.md`, `.agents/skills/scale-and-responsive/SKILL.md` (nombres según cree el instalador; si difieren, anotar el mapeo)
- **Verify:** `for s in scenes loading-assets scale-and-responsive; do test -f .agents/skills/$s/SKILL.md && echo "$s OK"; done`

### T3: Lote visual (sprites-and-images, animations, tilemaps)
- **Hacer:** Con el patrón verificado (`pnpm dlx skills add https://github.com/phaserjs/phaser --skill <nombre>`, destino según T1), instalar las 3 oficiales en `.agents/skills/<nombre>/`. Clave para el MVP (sprites de John, animaciones, tiles jungla).
- **Archivos:** `.agents/skills/sprites-and-images/SKILL.md`, `.agents/skills/animations/SKILL.md`, `.agents/skills/tilemaps/SKILL.md`
- **Verify:** `for s in sprites-and-images animations tilemaps; do test -f .agents/skills/$s/SKILL.md && echo "$s OK"; done`

### T4: Lote gameplay (phaser-arcade-physics, input-keyboard-mouse-touch, tweens, particles)
- **Hacer:** Instalar `phaser-arcade-physics` (`pnpm dlx skills add https://github.com/gamedev-skills/awesome-gamedev-agent-skills --skill phaser-arcade-physics`) y las 3 oficiales (`pnpm dlx skills add https://github.com/phaserjs/phaser --skill <nombre>`, destino según T1) en `.agents/skills/<nombre>/`.
- **Archivos:** `.agents/skills/phaser-arcade-physics/SKILL.md`, `.agents/skills/input-keyboard-mouse-touch/SKILL.md`, `.agents/skills/tweens/SKILL.md`, `.agents/skills/particles/SKILL.md`
- **Verify:** `for s in phaser-arcade-physics input-keyboard-mouse-touch tweens particles; do test -f .agents/skills/$s/SKILL.md && echo "$s OK"; done`

### T5: Lote soporte (audio-and-sound, v4-new-features, phaser-core, phaser)
- **Hacer:** Con el patrón verificado y destino según T1, instalar `audio-and-sound` (`pnpm dlx skills add https://github.com/phaserjs/phaser --skill audio-and-sound`), `v4-new-features` (`pnpm dlx skills add https://github.com/phaserjs/phaser --skill v4-new-features`), `phaser-core` (`pnpm dlx skills add https://github.com/gamedev-skills/awesome-gamedev-agent-skills --skill phaser-core`) y `phaser` (`pnpm dlx skills add https://github.com/playableintelligence/game-creator --skill phaser`) en `.agents/skills/<nombre>/`. (`phaser-best-practices` queda fuera: repo inexistente.)
- **Archivos:** `.agents/skills/audio-and-sound/SKILL.md`, `.agents/skills/v4-new-features/SKILL.md`, `.agents/skills/phaser-core/SKILL.md`, `.agents/skills/phaser/SKILL.md`
- **Verify:** `for s in audio-and-sound v4-new-features phaser-core phaser; do test -f .agents/skills/$s/SKILL.md && echo "$s OK"; done`

## Done (validación final)
- [ ] `ls .agents/skills/` muestra las 10 previas + 15 nuevas (25 total), sin `physics-arcade` ni `phaser-best-practices`
- [ ] `find .agents/skills -maxdepth 2 -name SKILL.md | wc -l` devuelve 25
- [ ] `pnpm build` sigue pasando sin errores (las skills no tocan el juego)
- [ ] Manual: abrir 2-3 `SKILL.md` nuevos y confirmar que hablan de Phaser 4 (no v3)
