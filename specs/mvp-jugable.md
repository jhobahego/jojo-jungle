# MVP jugable

## Contexto
- Qué existe hoy: scaffold Vite + Phaser 4.2.1 con `src/main.js` mínimo (`BootScene` con texto "boot ok", canvas fijo 960x540 sin `ScaleManager`, sin `pixelArt`). Stack: Node 24 + pnpm 12.6.0 + Phaser 4 + Vite + JS (ver `AGENTS.md`, `specs/setup-phaser.md`, `package.json`).
- Carpetas a respetar (NO mover ni renombrar ni convertir in-place): `SpriteSheets/player/` (~53 PNG de John: idle, run, jump, crouch, shoot, hagging, hit, dead), `SpriteSheets/enemy/` (grunt + torreta), `SpriteSheets/background/` (jungla/cueva, nubes, `jungle_paralax_bg1/2.png`), `SpriteSheets/props/`, `SpriteSheets/fx/`, `SpriteSheets/titlescreen/` (título, press start, game over), `SpriteSheets/boss/`, `SpriteSheets/ui/`, tiles sueltos en raíz, `GIFs/` y `Mockups/` solo consulta. Si Vite exige servirlos, copiar a `public/` dejando el original intacto.
- Patrones a seguir: `.agents/skills/game-setup-and-config/SKILL.md` (config `pixelArt`, FIT + CENTER_BOTH), `.agents/skills/scale-and-responsive/SKILL.md` (no estilar el canvas a mano, padre con dimensiones), `.agents/skills/loading-assets/SKILL.md` (cargar en `preload`, usar en `create`), `.agents/skills/phaser-core/SKILL.md` (ciclo init/preload/create/update, `launch` para HUD), `.agents/skills/phaser-arcade-physics/SKILL.md` (mover por body, `collider` vs `overlap`), `.agents/skills/input-keyboard-mouse-touch/SKILL.md`, `.agents/skills/animations/SKILL.md`, `.agents/skills/sprites-and-images/SKILL.md` (Image si no anima, Sprite si anima).
- Decisiones ya tomadas (no re-discutir): siempre Phaser v4, nunca v3; canvas responsive que cubre y centra, HUD dentro del canvas (decisión turno anterior: sin sidebar DOM informativo, letterboxing temático); reportes en español; tareas pequeñas de una por sesión (< ~3 archivos); sin dependencias nuevas salvo `phaser` + `vite`.
- Hallazgo sprites borrosos: el equivalente a Unity `Filter Mode: Point (no filter)` en Phaser 4 es `pixelArt: true` en `GameConfig`, que pone automáticamente `antialias: false`, `antialiasGL: false` y `roundPixels: true` (interpolación nearest-neighbor). Verificado en `.agents/skills/game-setup-and-config/SKILL.md` y doc oficial Phaser 4 Pixel Art Guide vía Context7. NO usar `smoothPixelArt` (es lo contrario: suaviza bordes, solo WebGL). Complementos obligatorios: zoom entero (`ZOOM_2X` o `MAX_ZOOM`), posiciones enteras (`roundPixels`), evitar escalas fraccionarias/rotaciones en sprites pixel-art. Filtros `Blocky/Pixelate` de cámara son para simular píxel grande, no hacen falta para 1:1.

## Objetivo
Un nivel de jungla jugable con John (correr, saltar, agachar, disparar), un grunt + una torreta, HUD in-canvas y flujo press-start → jugar → game-over/reintento, con píxel nítido y canvas responsive.

## Flujo
SECUENCIA (orden temporal ↓) — versión comprimida:
```
SECUENCIA (orden temporal ↓)
1. Jugador → Navegador: abre página (Vite sirve index + canvas FIT centrado, pixelArt nítido)
2. Juego → BootScene: muestra press-start (asset titlescreen)
3. Jugador → Juego: pulsa tecla/clic para empezar
4. PlayScene → Loader: carga player/bg/tiles/enemy/ui con barra de progreso
5. PlayScene → Mundo: crea suelo/plataformas, parallax jungla, John, grunt + torreta, cámara follow, lanza HUD
6. Jugador → PlayScene (loop): input correr/saltar/agachar/disparar
7. PlayScene → Arcade: integra velocidad/gravedad, colliders suelo, overlaps bala↔enemigo y enemigo↔John
8. PlayScene → HUD: actualiza vidas/ammo/score in-canvas
9. PlayScene → Jugador: HP 0 o caída → game-over (asset titlescreen) → reintento reinicia run
```

Diagrama de FLUJO (decisiones y ramas — acá viven los casos borde):
```
 abrir página
    │
    ▼
 ¿WebGL disponible? ──no──▶ AUTO cae a Canvas (sigue nítido, sin smoothPixelArt)
    │ sí
    ▼
 press-start ──▶ ¿input empezar? ──no──▶ espera
    │ sí                        │
    ▼                           │
 carga preload ──▶ ¿falla asset? ──sí──▶ muestra error + reintento (no arranca nivel roto)
    │ no                        │
    ▼                           │
 jugar loop ◀──────────────────┘
    │
    ▼
 ¿resize ventana? ──sí──▶ FIT re-centra (letterbox), input se re-mapea solo
    │ no
    ▼
 ¿bala toca enemigo/torreta? ──sí──▶ daño/muerte enemigo, suma score
    │ no
    ▼
 ¿enemigo/bala toca a John o cae al vacío? ──sí──▶ pierde vida, hit + knockback breve
    │ no                              │
    ▼                                 ▼
 ¿HP <= 0? ──sí──▶ game-over ──▶ ¿reintento? ──sí──▶ reset en init() y replay
    │ no              │ no                 │ no
    ▼                 ▼                    ▼
 sigue jugando   queda en game-over   queda en press-start
```

## Restricciones
- NO mover, renombrar ni convertir assets originales; solo copiar a `public/` si Vite lo exige.
- NO tocar fuera del MVP: boss, cueva, props destructibles complejos (barril/crate solo como sólido estático si hace falta), fx elaborados, audio (ver Fuera de alcance).
- Config render obligatoria: `pixelArt: true`, sin `smoothPixelArt`, zoom entero, `Scale.FIT + CENTER_BOTH` con padre dimensionado; no estilar el canvas a mano.
- Física solo Arcade (`physics: { default: 'arcade' }`); mover por `setVelocity`, nunca por `x/y` directo; `collider` una vez en `create`, no en `update`; `debug: true` mientras se construye, `false` al cerrar.
- Escenas: estado de run se resetea en `init()`, no en constructor; HUD como escena en paralelo con `launch`, no con `start`.
- Sin dependencias nuevas salvo `phaser` + `vite` (más `@vitejs/plugin-*` si el template lo pide), justificando el resto.

## Fuera de alcance
- Boss (`SpriteSheets/boss/`), nivel cueva, tilemaps completos con Tiled, parallax multicapa complejo más allá de 2 fondos jungla.
- Audio/música/SFX, partículas/fx (`SpriteSheets/fx/`), sombras, guardado/highscore persistente, móvil táctil completo (solo teclado + clic empezar), pantalla completa y bloqueo de orientación, multijugador, CI/CD y deploy.
- Optimización del bundle >500kB (`TODO.md`): queda para después del MVP jugable.
- Migración a TypeScript.

## Tareas
### T1: Base render nítido + responsive
- **Hacer:** Pasar `src/main.js` a config con `pixelArt: true`, `roundPixels`, `Scale.FIT + CENTER_BOTH`, resolución base 16:9 baja (p. ej. 480x270 con zoom entero) y fondo `#1a1a2e`; dar dimensiones al padre en `index.html`/CSS sin tocar el canvas a mano.
- **Archivos:** `src/main.js`, `index.html` (+ CSS existente si lo hay)
- **Verify:** `pnpm install && pnpm build` + manual `pnpm dev`: canvas centrado que llena sin sidebar, al redimensionar mantiene aspecto con letterbox, sprite de prueba se ve con borde duro (sin blur).

### T2: Boot + Preload con barra mínima
- **Hacer:** Escenas `Boot` (press-start con asset de `titlescreen/`) y `Preload` (carga solo lo MVP: 5-6 frames de John, grunt + torreta, 2 fondos jungla, tileset jungla, 1 tireta `ui/` si existe; si Vite lo exige, copiar de `SpriteSheets/` a `public/` sin borrar originales) con barra de progreso vía eventos `progress/complete` y rama de error con reintento.
- **Archivos:** `src/scenes/BootScene.js`, `src/scenes/PreloadScene.js`
- **Verify:** `pnpm build` + manual `pnpm dev`: se ve press-start, al pulsar entra a preload con barra 0→100%, sin 404 en Network.

### T3: Nivel jungla + John + cámara
- **Hacer:** `PlayScene` con suelo/plataformas estáticas (tileset jungla o rectángulos temporales), parallax 2 capas con `tileSprite`/`scrollFactor`, John como `physics.add.sprite` con Arcade + gravedad, input cursores + Z/X (o WASD+espacio) para correr/saltar/agachar, anims idle/run/jump/crouch desde PNGs sueltos, cámara `setBounds + startFollow` con lerp, `debug: true` provisional.
- **Archivos:** `src/scenes/PlayScene.js`, `src/player.js` (o equivalente)
- **Verify:** `pnpm build` + manual: John corre/salta/agacha sin atravesar suelo, cámara sigue suave, `body.blocked.down` permite salto solo en suelo.

### T4: Disparo + enemigos + muerte/reintento
- **Hacer:** Balas en `physics.add.group` con pool (`maxSize`), grunt (patrulla + disparo simple) y torreta estática (`staticGroup` o sprite con body inmóvil), `collider` John↔suelo, `overlap` bala↔enemigo (score+10) y enemigo↔John (hit, knockback, `JustDown` para disparo único), caída al vacío = daño, HP 0 → escena `GameOver` (asset `titlescreen/`) con reintento que resetea en `init()`.
- **Archivos:** `src/enemies.js`, `src/scenes/GameOverScene.js` (+ toques en `PlayScene.js`)
- **Verify:** `pnpm build` + manual: disparar mata/toca, recibir toque quita vida, morir muestra game-over y reintentar reinicia limpio sin estado filtrado.

### T5: HUD in-canvas
- **Hacer:** Escena `HUD` lanzada con `launch` (texto vidas/ammo/score con `setScrollFactor(0)`), suscrita a `registry` (`changedata-*`) o eventos de `PlayScene`, sin DOM lateral.
- **Archivos:** `src/scenes/HUDScene.js` (+ toques mínimos en `PlayScene.js` para emitir cambios)
- **Verify:** `pnpm build` + manual: al disparar/matar/recibir daño el HUD actualiza en el mismo frame visible, al reintentar vuelve a valores iniciales.

## Done (validación final)
- [ ] `pnpm build` pasa sin errores
- [ ] Manual `pnpm dev`: press-start → jugar (correr/saltar/agachar/disparar) → grunt + torreta responden → HUD actualiza → muerte → game-over → reintento limpio
- [ ] Manual resize: canvas FIT centrado con letterbox, sin scroll ni sidebar, píxel con borde duro en 100% y 200% (foto comparativa si hay duda)
- [ ] `ls public/` muestra solo copias necesarias; `SpriteSheets/`, `GIFs/`, `Mockups/` intactos; sin dependencias nuevas en `package.json`
