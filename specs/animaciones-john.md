# Animaciones de John (corto plazo)

## Contexto
- Qué existe hoy: John animado con `idle` (5f 26x22), `run` (10f 26x22), `jump` (9f 26x22), `crouch` (2f 26x26) en `src/player.js` (`ensureAnims` + `createJohn` + `updateJohn`). Disparo en `PlayScene.fireJohn()` sin feedback visual (spawnea bala, no cambia sprite). Daño en `PlayScene.damageJohn()/hitJohn()`: knockback + tween alpha + invuln 1s, sin anim de hit. Muerte: `HP <= 0 → scene.start('GameOver')` directo, sin anim. Caída al vacío = daño + respawn directo.
- Assets medidos en `SpriteSheets/player/` (solo lectura, PIL): `john_stand_shooting.png` 52x22 (2f 26x22), `john_run_shoot.png` 260x22 (10f 26x22), `john_crouch_shoot.png` 52x26 (2f 26x26), `john_hithurt.png` 52x22 (2f 26x22), `john_defeated.png` 260x22 (10f 26x22), `john_dead.png` 52x22 (2f 26x22), `john_landing.png` 78x22 (3f 26x22). Copias actuales en `public/assets/player/`: solo `john_idle/run/jump/crouch/stand_shooting/static + weapon_bullet` (faltan el resto).
- Patrones a seguir: `src/player.js` (`ensureAnims` con `anims.exists` + `generateFrameNumbers`, `BODY_STAND`/`BODY_CROUCH` + `setBody`, `play(key, true)`), `src/enemies.js` (`ensureEnemyAnims`, muerte con `body.enable = false` + `once('animationcomplete-...')` + `destroy`), `src/scenes/PlayScene.js` (spritesheets `*-anim` en `preload` con `frameWidth/frameHeight` exactos, overlaps una vez en `create`, `registry` hp/score/ammo).
- Decisiones ya tomadas (no re-discutir): flujo aprobado 2026-10-12 — corto = shoot en 3 posturas + hit + muerte + landing, sin mecánicas nuevas; apuntar 8-dir, hagging, arma lvl2/break y `dead_soul` van a mediano plazo; respawn por caída NO anima muerte; siempre Phaser v4.2.1, nunca v3; assets originales en `SpriteSheets/` NUNCA se mueven/renombran/convierten, solo copiar a `public/`; tareas pequeñas (< ~3 archivos, una por sesión); reportes en español.

## Objetivo
Dar feedback visual de combate a John en el nivel jungla: disparo visible parado/corriendo/agachado, golpe, muerte y aterrizaje, sin cambiar mecánicas ni inputs.

## Flujo
SECUENCIA (orden temporal ↓) — versión comprimida (aprobada 2026-10-12):
```
SECUENCIA (orden temporal ↓)
1. PreloadScene / PlayScene → Loader: precarga nuevos spritesheets John (stand-shoot, run-shoot, crouch-shoot, hithurt, defeated/dead, landing).
2. PlayScene → AnimationManager: registra anims globales ('john-stand-shoot', 'john-run-shoot', 'john-crouch-shoot', 'john-hit', 'john-dead', 'john-land').
3. Input disparo → John: si corre dispara con 'john-run-shoot', si agachado con 'john-crouch-shoot', si quieto con 'john-stand-shoot'; la bala sale igual que hoy.
4. Bala/plataforma → John: al aterrizar reproduce 'john-land' (3f, no loop).
5. Bala enemiga → John: reproduce 'john-hit' + knockback + invuln 1s existentes.
6. HP 0 → John: reproduce 'john-dead', al completar va a GameOver (hoy va directo).
```

Diagrama de FLUJO (decisiones y ramas — casos borde):
```
 John activo
    │
    ▼
 ¿dispara (C/clic)? ──sí──▶ ¿corre? ──sí──▶ 'run-shoot' + bala
    │ no                       │ no
    │                          ▼
    │                     ¿agachado? ──sí──▶ 'crouch-shoot' + bala
    │                          │ no
    │                          ▼
    │                     'stand-shoot' (2f) + bala ──▶ vuelve a idle/run
    ▼
 ¿aterriza (aire→suelo)? ──sí──▶ 'land' (3f, una vez) ──▶ idle/run
    │ no
    ▼
 ¿golpe enemigo? ──sí──▶ HP-1 ──▶ ¿HP<=0? ──no──▶ 'hit' + knockback + invuln 1s + parpadeo
    │ no                              │ sí
    ▼                                 ▼
 sigue (idle/run/jump/crouch)   'dead' ──▶ animationcomplete ──▶ GameOver
                                    (respawn por caída NO anima muerte, igual que hoy)
```

## Restricciones
- NO mover, renombrar ni convertir assets originales en `SpriteSheets/player/`; solo copiar a `public/assets/player/` dejando el original intacto.
- No cambiar mecánicas ni inputs: misma velocidad/salto/gravedad (`JOHN_SPEED/JOHN_JUMP`), mismas teclas (cursores + WASD + C/clic), misma cadencia/pool de balas, mismo knockback/invuln/score.
- Mantener Phaser 4.2.1 sin dependencias nuevas en `package.json`.
- Hitboxes vigentes: variantes de pie (stand-shoot, run-shoot, hit, land, dead) reutilizan `BODY_STAND` {w:18,h:20,ox:4,oy:2}; `crouch-shoot` reutiliza `BODY_CROUCH` {w:18,h:14,ox:4,oy:12}; al morir, `body.enable = false` inmediato (igual que `damageGrunt`).
- `collider`/`overlap` una sola vez en `create`, nunca en `update`; `animationcomplete` con `once`, no con `on`.

## Fuera de alcance
- Apuntado en 8 direcciones (`stand_looking_*`, `shooting_up/*diag`, `run_up_diag`, `run_shoot_up_diag`, `jump_ng_aim*`) — mediano plazo, pide input de apuntar inexistente.
- Colgado de bordes (`hagging_*`: idle, move, fire_right, aims + firing) — mediano plazo, pide física de agarre inexistente.
- Variantes `*_ng` (John sin arma), `weapon_bullet_level2`, `player_weapon_break`, `john_dead_soul`, `run_dust`/`jump_dust` — mediano plazo o decorativo, requieren diseño de power-up/game-over no definido.
- Boss (`SpriteSheets/boss/`), cueva, audio, HUD, Boot/GameOver más allá del delay por muerte.

## Tareas
### T1: Disparo parado y corriendo (feedback core run'n'gun)
- **Hacer:**
  1. Copiar `john_run_shoot.png` de `SpriteSheets/player/` a `public/assets/player/` (el `john_stand_shooting.png` ya está copiado; verificar que sea idéntico al original, si no recopiar). Originales intactos.
  2. En `src/scenes/PreloadScene.js`, añadir a `MVP_ASSETS` las entradas image `['john-run-shoot', 'assets/player/john_run_shoot.png']` (más `john-stand-shoot` si falta) para el gate de progreso/error.
  3. En `src/scenes/PlayScene.js` (`preload`), cargar spritesheets `john-stand-shoot-anim` (`john_stand_shooting.png`, 26x22) y `john-run-shoot-anim` (`john_run_shoot.png`, 26x22).
  4. En `src/player.js` (`ensureAnims`), registrar `john-stand-shoot` (frames 0..1, frameRate 8, repeat 0) y `john-run-shoot` (frames 0..9, frameRate 10, repeat -1). Sin cambio de hitbox (ambas usan `BODY_STAND`).
  5. En `src/scenes/PlayScene.js` (`fireJohn`), tras `enableBody` de la bala, estampar `john.setData('shootUntil', this.time.now + JOHN_SHOOT_HOLD)` (250ms, constante en `src/player.js`) y reproducir `john-stand-shoot` si quieto o `john-run-shoot` si en movimiento (usa `body.velocity.x !== 0`, respeta `flipX` vigente); no alterar velocidad, spawn ni ammo. En `src/player.js` (`updateJohn`, que recibe `now` en el input), mientras `now < shootUntil` la rama de suelo mantiene la pose de disparo en vez de pisarla con idle/run — sin este hold `play()` la mata al frame siguiente (bug hallado en T1: la pose duraba ~1 frame). Al expirar la ventana, idle/run retoman solo.
- **Archivos:** `src/player.js`, `src/scenes/PreloadScene.js`, `src/scenes/PlayScene.js` (+ copia en `public/assets/player/`)
- **Verify:** `pnpm build` pasa; en `pnpm dev`: parado + C/clic muestra pose de disparo de 2f y la bala sale igual; corriendo + C muestra John corriendo disparando (10f) sin frenarse; sin errores 404.

### T2: Disparo agachado + aterrizaje
- **Hacer:**
  1. Copiar `john_crouch_shoot.png` (52x26) y `john_landing.png` (78x22) a `public/assets/player/`, originales intactos.
  2. En `PreloadScene.js` añadir entradas image; en `PlayScene.js` (`preload`) cargar `john-crouch-shoot-anim` (26x26) y `john-land-anim` (26x22).
  3. En `src/player.js`: registrar `john-crouch-shoot` (0..1, frameRate 8, repeat 0, hitbox `BODY_CROUCH` vigente) y `john-land` (0..2, frameRate 10, repeat 0, hitbox `BODY_STAND`).
  4. Disparo agachado: en `fireJohn`, si `crouching` reproducir `john-crouch-shoot` (no `stand-shoot`) sin levantarse ni cambiar hitbox, estampando `shootUntil` igual que T1. En `updateJohn`, la rama crouch debe respetar la misma ventana de hold (mientras `now < shootUntil`, `play('john-crouch-shoot')` en vez de `play('john-crouch')`) — mismo bug que T1: sin el guard, la rama agachada pisa la pose al frame siguiente. Al expirar, vuelve a `john-crouch` solo.
  5. Aterrizaje: en `updateJohn`, detectar transición `!onGround → onGround` (flanco de `body.blocked.down`) y reproducir `john-land` una vez antes de volver a idle/run; no debe loopear ni bloquear input.
- **Archivos:** `src/player.js`, `src/scenes/PreloadScene.js`, `src/scenes/PlayScene.js` (+ copias en `public/assets/player/`)
- **Verify:** `pnpm build` pasa; en `pnpm dev`: agachado + C muestra disparo agachado sin levantarse; al caer de una plataforma se ven los 3f de aterrizaje y luego idle; agachar sigue con hitbox baja (los enemigos pegan igual que antes).

### T3: Golpe + muerte animada
- **Hacer:**
  1. Copiar `john_hithurt.png` (52x22), `john_defeated.png` (260x22) y `john_dead.png` (52x22) a `public/assets/player/`, originales intactos.
  2. En `PreloadScene.js` añadir entradas image; en `PlayScene.js` (`preload`) cargar `john-hit-anim` (26x22) y `john-dead-anim`: usar `john_defeated.png` (26x22, 10f) como anim principal; `john_dead.png` (2f) solo si la inspección visual pide corpse final (documentar en comentario la elección).
  3. En `src/player.js`: registrar `john-hit` (0..1, frameRate 8, repeat 0) y `john-dead` (0..9, frameRate 10, repeat 0).
   4. En `PlayScene.js` (`damageJohn`/`hitJohn`): con HP>0 reproducir `john-hit` junto al knockback + invuln + parpadeo existentes (el tween alpha sigue igual); la pose de hit sobrevive con `hitUntil` (250ms, constante `JOHN_HIT_HOLD` en `src/player.js`) con prioridad hit > shoot > land en `updateJohn` — sin este hold el knockback + idle/run/jump la pisan al frame siguiente (mismo bug que T1); con HP<=0 marcar muerte (guarda `john.active`/flag para que `updateJohn` y `fireJohn` ignoren input), `body.enable = false` + `setVelocity(0,0)`, reproducir `john-dead` y en `once('animationcomplete-john-dead')` llamar `scene.start('GameOver')` (hoy va directo). Caída al vacío con vidas restantes: respawn directo sin anim de muerte, igual que hoy (limpia `shootUntil/landUntil/hitUntil` para no estampar poses viejas tras el teleport).
   5. Asegurar que durante muerte no haya doble daño (guardas `active/dead/invuln` vigentes) ni timers colgados. Nota: se conserva `keepCrouch` (histéresis de agachado ante el parpadeo de `blocked.down` en los gaps): una vez agachado y con la tecla held se mantiene la hitbox `BODY_CROUCH` en vez de oscilar stand↔crouch (flicker); solo se sale soltando la tecla o con impulso real hacia arriba (`velocity.y < -50`, knockback de este T3 o salto). Sin esto, el knockback a un John agachado dejaba la hitbox oscilando.
- **Archivos:** `src/player.js`, `src/scenes/PlayScene.js` (+ `PreloadScene.js` solo para las entradas image y copias en `public/assets/player/`)
- **Verify:** `pnpm build` pasa; en `pnpm dev`: al recibir bala se ven los 2f de hit + knockback + parpadeo; al perder la última vida John reproduce la muerte (10f) y recién después aparece GameOver; reintento reinicia limpio; caer al foso con vidas sigue con respawn directo.

## Done (validación final)
- [ ] `pnpm build` pasa sin errores ni warnings nuevos.
- [ ] Manual `pnpm dev`: disparo parado / corriendo / agachado con anim + bala igual que antes; aterrizaje de 3f al caer; hit de 2f + knockback + invuln; muerte animada antes de GameOver; respawn por foso sin anim.
- [ ] `git status` muestra solo la spec, `src/player.js`, `src/scenes/PlayScene.js`, `src/scenes/PreloadScene.js` y copias en `public/assets/player/`; `SpriteSheets/`, `GIFs/`, `Mockups/` intactos.
