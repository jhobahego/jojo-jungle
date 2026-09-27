# Setup proyecto Phaser + AGENTS.md + skills

## Contexto
- Qué existe hoy: repo solo-assets, sin `package.json`, sin `AGENTS.md`/`CLAUDE.md`. Verificado con `ls -la` el 2026-09-27. Stack a imponer: Node v24.15.0 + pnpm 12.6.0, Phaser 4 + Vite + JS (no TS). Nota 2026-09-27: la spec se ejecutó primero con Phaser 3.90.0 y el usuario ordenó migrar a v4 (siempre v4); `package.json` hoy pinea `phaser 4.2.1`.
- Carpetas a respetar (NO mover ni renombrar): `SpriteSheets/player/`, `SpriteSheets/background/`, `SpriteSheets/props/`, `SpriteSheets/fx/`, `SpriteSheets/titlescreen/`, `SpriteSheets/tiles_spritesheet.png`, `GIFs/`, `Mockups/`, `.agents/skills/` (contiene `audit`, `exec`, `scope`, `prove`, `ship`, `trace`).
- Patrones a seguir: `.agents/skills/scope/SKILL.md` (estructura por secciones, decisiones explícitas, sin código).
- Decisiones ya tomadas (flujo aprobado por el usuario, no re-discutir): Phaser 4 + Vite + JS; assets quedan donde están; skills nuevas van a `.agents/skills/` sin borrar las 6 existentes; `pnpm dlx autoskills` se corre 1 vez con 1 reintento; si falla o no propone nada la spec igual cierra como válida; usar `AGENTS.md` sin punto en raíz (el usuario pidió `.AGENTS.md`, se normaliza al estándar que leen Claude/OpenCode); esta spec no incluye gameplay del MVP.

## Objetivo
Dejar el repo con `AGENTS.md` válido, scaffold Vite+Phaser que compila y skills de ayuda instaladas vía autoskills.

## Flujo
SECUENCIA (orden temporal ↓) — versión comprimida:
```
SECUENCIA (orden temporal ↓)
1. Agente → Repo: inspeccionar assets (SpriteSheets/, GIFs/, Mockups/) y .agents/skills/ existentes
2. Agente → Repo: detectar stack (¿hay package.json? ¿Vite? ¿versión Phaser?)
3. Agente → Repo: crear/sobrescribir AGENTS.md con stack, rutas assets, convenciones
4. Agente → Registro npm: ejecutar `pnpm dlx autoskills` para escanear contexto del proyecto
5. autoskills → Agente: proponer lista de skills relevantes (phaser, gamedev, assets)
6. Agente → Usuario: mostrar skills propuestas para aprobación (si hay)
7. Agente → Repo: instalar skills aprobadas en .agents/skills/
8. Agente → Usuario: reportar AGENTS.md + skills instaladas + siguiente paso (spec MVP)
```
Diagrama de FLUJO (decisiones y ramas — acá viven los casos borde):
```
 inicio: repo solo-assets, sin package.json ni AGENTS.md
    │
    ▼
 ¿existe package.json con phaser? ──no──▶ crear proyecto Vite+Phaser (pin versión estable)
    │ sí                                    │ (rama: scaffolding mínimo, assets quedan donde están)
    ▼                                       ▼
 ¿existe AGENTS.md? ──sí──▶ merge/sobrescribir solo sección stack+assets
    │ no                         (no borrar skills locales: audit/exec/scope/prove/ship/trace)
    ▼
 crear AGENTS.md nuevo
    │
    ▼
 ejecutar `pnpm dlx autoskills`
    │
    ├──falla (sin red / error dlx)──▶ reintento 1x ──sigue fallando──▶ documentar en spec + seguir sin skills nuevas
    │
    ▼
 ¿autoskills propone skills? ──no──▶ cerrar con AGENTS.md solo (Done parcial explícito)
    │ sí
    ▼
 ¿skill choca con skill local existente? ──sí──▶ no sobrescribir, anotar conflicto en reporte
    │ no
    ▼
 instalar en .agents/skills/ ──▶ verificar (AGENTS.md existe + skills listadas) ──▶ resultado
```

## Restricciones
- NO mover, renombrar ni convertir assets en `SpriteSheets/`, `GIFs/`, `Mockups/`; referenciarlos desde el scaffold (copia a `public/` solo si Vite lo exige, nunca borrar originales).
- NO borrar ni sobrescribir skills existentes en `.agents/skills/` (`audit`, `exec`, `scope`, `prove`, `ship`, `trace`).
- NO tocar contratos de gameplay, física ni input (aún no existen; no diseñarlos aquí).
- Sin dependencias nuevas salvo `phaser` + `vite` (+ `@vitejs/plugin-*` si el template lo pide); cualquier otra debe justificarse en el reporte de la tarea.

## Fuera de alcance
- Gameplay, niveles, HUD, sonido, menús del MVP (irá en `specs/mvp-*.md` posterior).
- Conversión/atlas de sprites, tilemaps, optimización de assets.
- CI/CD, deploy, tests E2E, lint/format global.
- Migración a TypeScript.

## Tareas
### T1: Crear AGENTS.md raíz
- **Hacer:** Crear `AGENTS.md` en raíz con secciones: Stack (Node 24, pnpm, Phaser 4 pineado, Vite, JS), Estructura de assets (lista exacta de rutas `SpriteSheets/*`, `GIFs/`, `Mockups/`), Convenciones (no mover assets, skills en `.agents/skills/`, idioma reportes: español), Comandos (`pnpm install`, `pnpm dev`, `pnpm build`). Si ya existiera, solo actualizar esas secciones.
- **Archivos:** `AGENTS.md` (único archivo tocado)
- **Verify:** `test -f AGENTS.md && grep -E -c "Phaser|SpriteSheets|pnpm (dev|build)" AGENTS.md`

### T2: Scaffold Vite + Phaser mínimo que compila
- **Hacer:** Si no hay `package.json`: `pnpm create vite@latest . -- --template vanilla` (o en subcarpeta temporal y mover solo lo generado), luego `pnpm add phaser` pineando la versión exacta instalada, y boot mínimo en `src/main.js` que instancia `new Phaser.Game` con una escena vacía + texto "boot ok". No importar assets reales todavía.
- **Archivos:** `package.json`, `src/main.js` (el resto autogenerado por Vite no cuenta como edición manual; `index.html`/`vite.config.js` solo tocar si el template lo exige para resolver el entry)
- **Verify:** `pnpm install && pnpm build`

### T3: Correr pnpm dlx autoskills e instalar skills aprobadas
- **Hacer:** Con T1+T2 commiteados/descriptibles, ejecutar `pnpm dlx autoskills` (1 reintento si falla por red), listar skills propuestas, pedir aprobación al usuario si hay candidatas, e instalar solo las aprobadas en `.agents/skills/` sin sobrescribir existentes. Si falla o propone cero skills, dejar constancia en el reporte y cerrar igual.
- **Archivos:** `.agents/skills/<nueva-skill>/SKILL.md` (1-2 skills, resto autogenerado por el instalador)
- **Verify:** `ls -la .agents/skills/ && test -f AGENTS.md`

## Done (validación final)
- [ ] `pnpm build` pasa sin errores
- [ ] `test -f AGENTS.md && ls .agents/skills/` muestra AGENTS.md + skills previas intactas
- [ ] Manual: `pnpm dev`, abrir URL local, se ve canvas Phaser con "boot ok" sin errores en consola
