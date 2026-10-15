# Game Feel combate jungla (definitiva)

## Contexto
- Stack: Node 24 + pnpm 12.6.0, Phaser 4.2.1 + Vite + JavaScript (sin TypeScript). Comandos: `pnpm dev` (boot Phaser), `pnpm build` (debe pasar sin errores). Registro de escenas en `src/main.js` (`roundPixels: true`, verificado).
- Qué existe hoy: `src/scenes/PlayScene.js` (nivel jungla 960x270, pools `bullets` max 12 y `enemyBullets` max 20, `fireJohn` sin cooldown con `refundAmmo` auto al reciclar/impactar, spawn John fijo `x=john.x+dir*14, y=john.y-2` sin distinguir pie/agachado —verificado—, `damageJohn/hitJohn` con knockback por `setVelocity` + tween alpha parpadeo + invuln 1000ms, timers `fireTimer` grunt 2200ms / torreta 2600ms, `cam.startFollow(john, false, 0.08, 0.08)`, colliders solo `john/grunt vs platforms` — las balas atraviesan el escenario, verificado; overlaps bala↔víctima y john↔enemigo usan bodies Arcade, no el sprite visual); `src/enemies.js` (grunt `hp: 1` verificado — muere de 1 tiro, `gruntFire` sin chequeo frontal con spawn `grunt.x+dir*12, grunt.y` —verificado, levemente arriba del arma—, `turretFire` 8 dirs con spawn `vec*12` —correcto, no se toca—, `damageTurret` con `destroy()` al morir, torreta `physics.add.staticSprite` verificado, `BULLET_RANGE=200`, `AGRO_RANGE=200`, `CAM_MARGIN=48`); `src/player.js` (`john-hit` 2f 26x22 ya registrado con `JOHN_HIT_HOLD=250`, `JOHN_SHOOT_HOLD=250`, flag `crouching` + hitboxes `BODY_STAND` {w:18,h:20,ox:4,oy:2} / `BODY_CROUCH` {w:18,h:14,ox:4,oy:12}, salto `JustDown X/SPACE` sin coyote/buffer/variable); `src/scenes/PreloadScene.js` (carga `MVP_ASSETS` + `pause-cursor`, sin `fx/`; sonidos `snd_rifle_shot`, `snd_reload_clip`, `snd_explosion_ground` ya cargados, verificado); `src/scenes/HUDScene.js` (texto `HP/SCORE/AMMO` por registry); `src/scenes/PauseScene.js` (`scene.pause('Play')` congela update + `delayedCall` del reloj de Play, verificado).
- Medidos solo lectura (PIL/`file`): `SpriteSheets/player/weapon_bullet.png` 64x8 (8f 8x8, hoy solo frame 0 sin anim, copia idéntica en `public/assets/player/`); `SpriteSheets/fx/bullet_impact.png` 100x20; `SpriteSheets/fx/particles_grunt.png`, `particles_turret.png`, `particles_explosion.png`, `particles_dirt.png` 12x2; `SpriteSheets/fx/explosion_smoke.png` 864x72 y `explosion_red.png` 260x22; `SpriteSheets/player/john_hithurt.png` 52x22 (2f 26x22, ya copiado y registrado como `john-hit`); `run_dust.png` 108x18 y `jump_dust.png` 204x10; puntas de arma por medir en T18 (`john_stand_shooting.png` 52x22 de pie, `john_crouch_shoot.png` 52x26 agachado, `grunt_shoot.png` 52x22). Los frames exactos los fija T5 midiendo, no se asumen.
- Patrones a seguir: `src/player.js` (`ensureAnims` con `anims.exists` + `generateFrameNumbers`, holds `shootUntil/hitUntil/landUntil`, `play(key, true)` con prioridad hit > shoot > land); `src/enemies.js` (guardas `active/dead`, `fireTimer` que se remueve al morir, `once('animationcomplete-...')`); `src/scenes/PlayScene.js` (pools con `get/enableBody`, `overlap`/`collider` una sola vez en `create`, `registry` hp/score/ammo, `isOnCameraPlusMargin`, `events.once(SHUTDOWN)` que suelta HUD).
- Decisiones ya tomadas (no re-discutir): siempre Phaser v4, nunca v3; originales en `SpriteSheets/` NUNCA se mueven/renombran/convierten, solo copiar con `cp` a `public/`; sin dependencias nuevas salvo `phaser` + `vite`; tareas pequeñas (cada una ≤3 archivos, una por sesión); reportes en español; flujo aprobado (John 150ms, grunt 2200ms, torreta 2600ms, recarga 900ms al agotar, clip desfasado 120ms, invuln 1000ms sin parpadeo); deuda-combate (cámara+48, agro 200, rango bala 200) y `specs/animaciones-john.md` (holds, muerte animada, hagging, `weapon_bullet_level2`, `player_weapon_break`, `john_dead_soul`) siguen vigentes; esta es la ÚNICA spec de game-feel (absorbe y reemplaza a `specs/game-feel-v2.md`, que se elimina).
- Decisiones de la extensión (ya resueltas): la recarga inicia al vaciar el cartucho y `snd_reload_clip` suena una sola vez al iniciar (intentos durante `reloading` silenciosos); partículas y fx de boca tienen tarea propia (T6/T7); `particles_*` se cargan como spritesheet si T5 confirma celdas 2x2; texturas con keys distintas entre `PreloadScene` y `PlayScene.preload` (patrón `animaciones-john`) para evitar «Texture key already in use»; expiración por rango lleva puff (T10); invuln legible sin parpadeo vía `HP` rojo sostenido (T13); flash de `hpText` vive en T13, T4 solo publica flags + shake; T3 y T4 tienen exactamente 3 archivos cada una, no se parten.
- Decisión profesional de daño (pedido 2026-10-16): el daño a John ocurre SOLO si la bala toca su collider (body Arcade: `BODY_STAND` de pie, `BODY_CROUCH` agachado), nunca por contacto con el sprite visual. Agachado ya esquiva tiros altos de forma natural por hitbox baja; NO se añade bypass por postura ni se reescala ningún sprite en esta spec.

## Objetivo
Cerrar el game feel del combate jungla con cooldowns, cartucho con recarga al agotarse, visión frontal, torreta rota sólida, balas que nacen en la boca del arma según postura, balas legibles y animadas, partículas y explosión con los fx existentes, anticipación de disparos enemigos, audio con keys existentes, HUD de texto expresivo, salto permisivo y cámara viva — sin cambiar cadencias, HP, score, hitboxes ni física.

## Flujo
SECUENCIA (orden temporal ↓) — versión comprimida (aprobada 2026-10-15 + muzzle 2026-10-16):
```
SECUENCIA (orden temporal ↓)
1. Jugador → Play: mantiene disparo (C o clic izq./der. — ráfaga mientras está presionado)
2. Play → John: ¿cooldown 150ms listo y no recargando? si no, ignora (sin bala)
3. Play → Pool: obtiene bala; si pool null, no gasta ammo ni consume cooldown
4. Play → Play: spawnea bala en la BOCA del arma (`JOHN_MUZZLE_STAND` de pie, `JOHN_MUZZLE_CROUCH` agachado, respeta flipX) con `bullet-fly` + gasta 1; al vaciar inicia recarga 900ms con un solo `snd_reload_clip`
5. Bala → Play: vuela animada; al impactar o expirar genera fx y se recicla (expirar no devuelve ammo)
6. Timer → Grunt: tick cada 2200ms; si gates OK inicia anticipación 200ms y dispara desde `GRUNT_MUZZLE` (boca del arma, no arriba)
7. Grunt → Play: ¿en cámara+margen + dist≤200 + al frente (con zona muerta ±4px)? si no, sigue patrulla
8. Timer → Torreta: tick cada 2600ms; si viva inicia flash 250ms y dispara en 8 dirs desde `vec*12` (igual que hoy, correcto)
9. Torreta rota → Play: nada (cuerpo sólido ON, daño OFF, timer cortado, no se destruye)
10. Bala enemiga → John: SOLO si toca su body (`STAND`/`CROUCH`) → `bullet-impact` + partículas + `john-hit` + shake forzado + HP en rojo 1000ms; roce solo-visual del sprite no daña
11. Bala John → Enemigo: tint 120ms + hit-pause 60ms + partículas; grunt muere de 1 tiro, torreta al 2.º con explosión ≤600ms
12. Bala → Entorno: `bullet-impact` + polvo (sin cambiar colisiones existentes)
13. Play → HUD: `AMMO`/`AMMO:RELOAD`, `HP` con flash y rojo en invuln, `SCORE` con pop
```
Diagrama de FLUJO (decisiones y ramas — acá viven los casos borde):
```
 intento disparo / tick enemigo / impacto
    │
    ▼
 ¿es John disparando? ──sí──▶ ¿cooldown 150ms y no reloading? ──no──▶ ignora (intentos en reload silenciosos)
    │ no                          │ sí
    │                             ▼
    │                      ¿pool get null? ──sí──▶ aborta sin gastar ni cooldown
    │                             │ no
    │                             ▼
    │                      spawn en boca según postura (STAND/CROUCH + flipX) + `bullet-fly` + gasta 1
    │                      ──▶ ¿llegó a 0? ──sí──▶ reloading 900ms (un solo clip)
    │                      + al impactar/expirar: fx + recicla
    ▼
 ¿es tick grunt? ──sí──▶ ¿en cámara + dist≤200 + al frente (±4px)? ──no──▶ sigue patrulla
    │ no                          │ sí → anticipación 200ms → ¿sigue vivo y John vivo? ──no──▶ cancela
    │                                                                  │ sí → bala desde GRUNT_MUZZLE + boca + sonido
    │                                                                  ▼ (período intacto 2200)
    ▼
 ¿es tick torreta? ──sí──▶ ¿rota? ──sí──▶ nada (sólida, sin daño/score/fx al re-golpear)
    │ no                       │ no → flash 250ms → ¿sigue viva? ──no──▶ cancela
    │                          │                         │ sí → bala 8 dirs + boca + sonido (período 2600)
    │                          ▼
    ▼
 ¿bala enemiga toca BODY de John? ──sí──▶ ¿invuln/muerto? ──sí──▶ ignora ──▶ si no: `john-hit` + invuln 1000ms SIN alpha/velocity + shake + HP rojo
    │ no (incluye roce solo-visual del sprite agachado) ──▶ nada, la bala sigue
    ▼
 ¿impacto en enemigo? ──sí──▶ grunt (HP1): muerte + fx ──▶ torreta HP>1: tint + partículas ──▶ HP0: explosión + `turret-broke` sólida
    │ no
    ▼
 ¿bala expiró o tocó entorno? ──sí──▶ puff/escala 0.5 + polvo, sin refund ──▶ fin bala
    │
    ▼
 `props/` NO se toca (futura spec de nivel nuevo)
```
Matriz evento → feedback (solo assets/sonidos existentes; «—» = nada deliberado):
| Evento | Visual | Audio (existente) | Cámara | HUD (solo texto) |
|---|---|---|---|---|
| John dispara | boca en punto T18 (impact f0 escala 0.5, 50ms) + `bullet-fly` | `snd_rifle_shot` ±5% rate | — | `AMMO` baja |
| Último tiro | igual + inicia recarga | `snd_reload_clip` (1 vez, desfasado 120ms del último disparo) | — | `AMMO:RELOAD` |
| Bala John → enemigo vivo | `bullet-impact` + partículas + tint 120ms + hit-pause 60ms | — | — | — |
| Torreta HP 0 | blanco 80ms → `explosion_red` + `particles_explosion` → `explosion_smoke` → `turret-broke` | `snd_explosion_ground` | shake 150ms/0.003 | `SCORE` pop (+10) |
| Enemigo se prepara | anticipación ≤250ms (pose/flash) | — | — | — |
| Bala enemiga sale | boca en `GRUNT_MUZZLE` / `vec*12` + tint enemigo | `snd_rifle_shot` grave, volumen por distancia | — | — |
| Bala enemiga → John (body) | `bullet-impact` + `particles_grunt` + `john-hit` | — | shake 120ms/0.004 forzado | `HP` flash + rojo 1000ms |
| Roce visual sin body | nada (la bala sigue) | — | — | — |
| Bala → suelo/pared | `bullet-impact` + `particles_dirt` | — | — | — |
| Bala expira por rango | puff escala 0.5 | — | — | — |
| Aterrizar / correr | `jump-dust` / `run-dust` | — | — | — |
Prioridades: shake `hit` (forzado) > `explosion` > resto; si se supera `FX_MAX_SPRITES` se omiten fx, nunca balas, daño ni score.

## Restricciones
- Originales en `SpriteSheets/` NUNCA se borran, mueven, renombran ni convierten in-place; solo copiar con `cp` a `public/assets/` (`fx/` a `public/assets/fx/`), original intacto.
- Física solo Arcade: mover por `setVelocity`, nunca por `x/y` directo; `collider`/`overlap` una sola vez en `create()`, nunca en `update()`; no tocar `physics.world` bounds ni gravedad (`src/scenes/PlayScene.js`, `src/enemies.js`).
- NO tocar `src/scenes/BootScene.js`, `src/scenes/GameOverScene.js`, `src/scenes/PauseScene.js` ni `src/main.js`; en `PreloadScene.js` solo añadido aditivo de cargas.
- Hitboxes vigentes sin cambios: pie `BODY_STAND` {w:18,h:20,ox:4,oy:2}, agachado `BODY_CROUCH` {w:18,h:14,ox:4,oy:12} (`src/player.js`); al morir `body.enable=false` inmediato. Prohibido reescalar sprites (Grunt más grande que John) en esta spec.
- Daño solo por overlap de bodies Arcade; prohibido chequear postura (`crouching`) para perdonar o forzar daño, y prohibido usar el rect del sprite visual.
- `animationcomplete` con `once`, no con `on`; constantes nuevas centralizadas y exportadas (John/combate en `src/player.js`, enemigos en `src/enemies.js`, cámara/fx/HUD donde se usan), sin números mágicos duplicados.
- Sin dependencias nuevas salvo `phaser` + `vite`.
- Sin cambios de reglas: cadencias (150/2200/2600/900/1000 ms), `BULLET_RANGE`, `AGRO_RANGE`, `CAM_MARGIN`, HP, score, hitboxes, gravedad y bounds permanecen. La anticipación desplaza la salida de la bala, no el período.
- Emitters se crean UNA vez en `create()` (`emitting:false`) y se reutilizan con `explode(n, x, y)`; nunca crear emitters por impacto. Fx sprites autodestruibles con `once('animationcomplete-…')`, tope `FX_MAX_SPRITES` y guarda `anims.exists`: si falta anim o se alcanza el tope, se omite el fx sin excepción.
- Un único helper de shake (`shakeCam(kind)` en `PlayScene.js`) y un único helper de sonido (`playSfx`); hit-pause solo del sprite impactado (`anims.pause()/resume()`), nunca hit-stop global vía `physics.world`.
- Confirmar en `node_modules/phaser` (v4.2.1) la firma exacta antes de usar `add.particles`/`explode`, `cameras.main.shake(…, force)`, tint y `setFollowOffset`.
- Sin colisiones nuevas que cambien gameplay sin aprobación (T11). `props/` sigue intacto.
- Archivos permitidos en toda la spec: `src/player.js`, `src/enemies.js`, `src/scenes/PlayScene.js`, `src/scenes/PreloadScene.js` + `src/scenes/HUDScene.js` (solo T13).

## Fuera de alcance
- `SpriteSheets/props/` (ammo, barrel, red_barrel, crate, bigcrate, plant, shelter, skullpanel): NO se copian, cargan ni usan; reservados para futura spec de escenario completo / nivel nuevo.
- Invulnerabilidad agachada aun con contacto de body, y reescala de Grunt vs John: diferidos a futura spec (hoy el esquive agachado es solo el natural por hitbox baja + muzzle corregido).
- Decorado del mapa más allá de fx puntuales de impacto/muerte.
- HUD gráfico (barra de vida y munición con UI) y paneles nuevos; solo texto `HP/AMMO/SCORE` existente.
- Funcionalidad de Controles/Opciones de pausa, sonidos nuevos, boss (`SpriteSheets/boss/`), nivel cueva, tilemaps con Tiled, guardado/highscore, táctil completo, CI/CD y deploy.
- Apuntado 8-dir, hagging, `weapon_bullet_level2`, `player_weapon_break`, `john_dead_soul` (mediano plazo en `specs/animaciones-john.md`).
- Bloqueado explícitamente (si se aprueba va a su spec, no acá): partículas ambientales, parallax multi-capa, sombra `shadow_char`, sonidos nuevos, barra gráfica, hit-stop/slow-motion global, cinemática de muerte de John, props destructibles.

## Tareas
### Orden de ejecución
`T1 → T2 → T3 → T4 → T18 → T5 → T6 → T10 → T7 → T8 → T9 → T11 → T12 → T13 → T15 → T14 → T16 → T17`. Dependencias: T18 no requiere fx (solo medir PNGs); T6 requiere T5 y T3; T7/T8/T9/T10/T11 usan el punto de spawn de T18; T13 requiere flags de T1/T4; T16 y T17 al final. Una tarea por sesión; cada una debe pasar `pnpm build` antes de seguir.

### T1: Cooldowns + cartucho con recarga al agotar
- **Hacer:** En `src/player.js` exportar `JOHN_FIRE_DELAY=150` y `RELOAD_DELAY=900`. En `src/scenes/PlayScene.js` (`fireJohn`) orden estricto: (1) si `reloading` o `now - lastShotAt < JOHN_FIRE_DELAY` ignora (intentos en `reloading` silenciosos, resto sin sonido ni bala, sin tocar `lastShotAt`); (2) `pool.get()` y si es `null` aborta sin gastar ammo ni cooldown; (3) gasta 1 ammo, fija `lastShotAt=now`, spawnea con `bullet-fly` (T3) en el punto de T18. ELIMINAR `refundAmmo` auto (impactos y `recycleBullets` del grupo John solo `killBullet`). Disparo en ráfaga: en `update()` mientras `fireKey.isDown` o puntero presionado (izq. con `isDown` / der. con `rightButtonDown()`) se intenta `fireJohn()` cada frame; el cooldown regula la cadencia (una pulsación suelta es el caso particular de un intento). Para el clic derecho, en `create()` llamar `this.input.mouse.disableContextMenu()` (existe en Phaser 4.2.1, verificado en `node_modules/phaser/types/phaser.d.ts`; su propósito declarado es habilitar el botón derecho sin que el menú estorbe). Al vaciar (no al reintentar) pone `reloading=true`, publica `registry.reloading`, suena `snd_reload_clip` una vez con desfase `RELOAD_SFX_DELAY=120` respecto al último disparo (vía `delayedCall` del reloj de Play, se guarda el handle; T16 lo cancela en restart) para no solaparse con `snd_rifle_shot`, y con `time.delayedCall(RELOAD_DELAY)` resetea `ammo=BULLET_MAX(12)` + `reloading=false`. Mantener `GRUNT_FIRE_DELAY=2200` / `TURRET_FIRE_DELAY=2600`. Comentar que cartucho == pool max.
- **Archivos:** `src/player.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: mantener C (o clic) dispara en ráfaga ~6/s; vaciar 12 bloquea, un solo clip desfasado y distinguible del último disparo, a ~0.9s vuelve a `AMMO:12`; pulsar C 20 veces en recarga no repite sonido ni duplica recarga; balas expiradas por rango no devuelven ammo; clic derecho dispara sin abrir menú contextual.

### T2: Visión frontal grunt + torreta rota sólida
- **Hacer:** En `src/enemies.js` (`gruntFire`) abortar si `john.x-grunt.x` cae en zona muerta `GRUNT_FRONT_DEADZONE=4px` o su signo difiere de `dir` (espalda: no para patrulla, no suena); mantener cámara+margen y agro 200. En `damageTurret` a HP 0: `dead=true` antes de fx, remover `fireTimer`, `play('turret-broke')` sin `once(destroy)`, DEJAR `body.enable=true` (es `staticSprite`, no mover el cuerpo; `refreshBody()` solo si ya es StaticBody). En `src/scenes/PlayScene.js` añadir en `create()` un `collider(john, turret)` y el `overlap(john, turret)` con early-return si `dead`; balas a rota se absorben con fx (T3) sin score/daño/re-golpe ni tint. Fijar `depth` de rota bajo John. Score +10 solo al romper.
- **Archivos:** `src/enemies.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: detrás del grunt a <200px nunca dispara; 2 tiros dejan `turret-broke` sólida y pisable sin HP perdido ni más disparos; 5 tiros extra a la rota no dan score ni repiten anim.

### T3: Bala animada + impacto con fx
- **Hacer:** Copiar con `cp` a `public/assets/fx/`: `bullet_impact.png`, `particles_grunt.png`, `particles_turret.png`, `particles_explosion.png` (solo esos 4). En `PreloadScene.js` entradas aditivas con keys de gate distintas a las de Play (p. ej. `fx-bullet-impact`), nunca la misma key en dos loaders. En `PlayScene.js` (`preload`) cargar `bullet-fly-anim` (`weapon_bullet.png`, 8x8 → 8f) y `bullet-impact-anim` (frame de T5); en `create()` registrar `bullet-fly` (frameRate 12, repeat 0 — un pase sincronizado al vuelo de John, 200px a 340px/s ≈ 588ms), `bullet-fly-enemy` (frameRate 6, repeat 0 — un pase sincronizado al vuelo enemigo, 200px a 160/150px/s ≈ 1.25s) y `bullet-impact` (frameRate 16, repeat 0) con guarda `anims.exists` (medido: los 8 frames de `weapon_bullet.png` decaen de 37px opacos a frame 7 vacío, por eso un solo pase por vuelo y nunca loop). En `fireJohn`/`fireEnemyBullet` resetear `rotation/tint/alpha/scale`/frame, `flipX` según el signo horizontal del disparo (`dir < 0` / `dirX < 0`: el frame 0 lleva la cabeza a la derecha) y `play('bullet-fly'/'bullet-fly-enemy')` sin `ignoreIfPlaying` (el pool reusa balas con la anim congelada en el frame de muerte; solo el restart forzado garantiza frame 0 al spawnear); en `onJohnBulletVsGrunt/Turret` y `onEnemyBulletVsJohn` spawnear impacto en el centro del body con `depth=FX_DEPTH` y `once(animationcomplete → destroy)` antes de `killBullet`. Punto de spawn exacto lo fija T18; acá solo animar. Sin sonidos nuevos. Fix verificado post-implementación: el `ignoreIfPlaying` en balas de pool congelaba la anim en el frame de muerte (casi siempre el 7, vacío) y las reusadas volaban invisibles — por eso restart forzado en `fireJohn` y `fireEnemyBullet` (`enemyBullets` también es pool con reuse). Auditado: anims de John/grunt/torreta e impactos `bullet-impact` son de instancia única (se crean una vez o se destruyen al terminar), así que el `play(key, true)` ahí es correcto y no les aplica este bug. Deuda explícita: diagonales y tiro hacia arriba quedan pendientes — las balas diagonales/verticales de torreta hoy solo espejan por signo horizontal, la orientación real (`rotation=atan2`) la pone T10; John y grunt no disparan en vertical/diagonal hasta el apuntado 8-dir (mediano plazo en `specs/animaciones-john.md`).
- **Archivos:** `src/scenes/PreloadScene.js`, `src/scenes/PlayScene.js`, `src/enemies.js` (+ copias en `public/assets/fx/`)
- **Verify:** `pnpm build` pasa sin 404 ni «Texture key already in use» + manual `pnpm dev`: balas animadas, impactos autodestruidos; `git status --stat` no toca `SpriteSheets/`.

### T4: Daño John solo por animación + dust
- **Hacer:** En `src/scenes/PlayScene.js` (`damageJohn`/`hitJohn`): QUITAR `setVelocity` de knockback y el tween alpha (`tweens.add alpha` + `killTweensOf` de ese tween); mantener `invuln=true` + `delayedCall(1000)` que lo limpia, `setAlpha(1)` fijo, `hitUntil=now+JOHN_HIT_HOLD` + `play('john-hit', true)`; publicar `registry.invuln` y `registry.hitAt`. NO añadir bypass por `crouching`: el overlap ya es por bodies. Constantes `HIT_SHAKE_MS=120` / `HIT_SHAKE_INTENSITY=0.004` y `cameras.main.shake(...)` directo (T15 lo centraliza). Copiar `run_dust.png` y `jump_dust.png` a `public/assets/fx/`, carga aditiva en `PreloadScene`, frames de T5, spawnear solo en flanco real aire→suelo y cadencia de pasos ≥250ms (una instancia por flanco), anclado a pies según `BODY_STAND`, con `once(animationcomplete → destroy)`. Sin cambios de hitbox/HP.
- **Archivos:** `src/scenes/PlayScene.js`, `src/player.js` (+ `src/scenes/PreloadScene.js` solo entradas y copias)
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: golpe en salto conserva trayectoria, solo `john-hit` 2f + shake, sin parpadeo; segunda bala <1s no daña; dust en correr/aterrizar autodestruido; muerte y foso iguales.
- **Fix verificado post-implementación:** dust con origen abajo-centro + pies desde `body.bottom` (deriva de `BODY_STAND`; el centro en `y+10` hundía ~9px el run-dust bajo el piso), `flipX` por facing con 1px detrás del pie; frames provisorios 6f (run 18x18, jump 34x10) pendientes de confirmación en T5.

### T18: Orígenes de bala en la boca del arma (John pie/agachado + grunt)
- **Hacer:** Medir solo lectura la punta del cañón en `john_stand_shooting.png` (52x22), `john_crouch_shoot.png` (52x26) y `grunt_shoot.png` (52x22): offset en px desde el centro del body hasta la boca, documentado en comentario. Exportar en `src/player.js` `JOHN_MUZZLE_STAND={dx,dy}` y `JOHN_MUZZLE_CROUCH={dx,dy}`, y en `src/enemies.js` `GRUNT_MUZZLE={dx,dy}` (torreta no se toca: `vec*12` queda). En `PlayScene.js` (`fireJohn`) elegir offset por `getData('crouching')` y aplicar `dir` de `flipX` al `dx` (`x=john.x+dir*dx, y=john.y+dy`); quitar el fijo `+14/-2`. En `src/enemies.js` (`gruntFire`) spawnear en `grunt.x+dir*dx, grunt.y+dy` y guardar ese punto como `spawnX/spawnY` (el `BULLET_RANGE` ya mide distancia recorrida). El fx de boca de T7 usa exactamente ese mismo punto. Sin tocar velocidad, rango, hitboxes ni torreta.
- **Archivos:** `src/player.js`, `src/scenes/PlayScene.js`, `src/enemies.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev` con pausa de frames: parado la bala nace pegada a la boca del arma (sin gap flotante); agachado nace abajo a la altura del arma (no al nivel del pecho parado); grunt nace en su arma (no arriba); screenshot comparativo pie vs agachado.

### T5: Medición y copia de fx pendientes (sin lógica)
- **Hacer:** Medir con PIL (solo lectura) y documentar en comentario de `PreloadScene.js` y en la tabla los frames REALES de `explosion_smoke.png`, `explosion_red.png`, `run_dust.png`, `jump_dust.png`, `bullet_impact.png` y `particles_*.png`. Criterio: división válida si cada celda tiene ≥1 píxel opaco y ninguna frontera corta un componente conectado. Copiar con `cp` a `public/assets/fx/`: `explosion_smoke.png`, `explosion_red.png`, `particles_dirt.png` (más `run_dust`/`jump_dust` si T4 no los copió). `shadow_char` NO se copia. Cargar aditivo como spritesheet con el frame medido. No registrar anims ni usar nada todavía.
- **Archivos:** `src/scenes/PreloadScene.js` (+ copias en `public/assets/fx/`)
- **Verify:** `pnpm build` pasa sin 404; tabla completada; `git status --stat` solo `PreloadScene.js` y `public/assets/fx/`; `SpriteSheets/` intacto.
- **Tabla a completar:**
  | Sheet | Tamaño | Frame medido | Nº frames | Notas |
  |---|---|---|---|---|
  | bullet_impact | 100x20 | _pendiente_ | _pendiente_ | |
  | particles_grunt / turret / explosion / dirt | 12x2 | _pendiente_ | _pendiente_ | ¿6 celdas 2x2? |
  | explosion_smoke | 864x72 | _pendiente_ | _pendiente_ | |
  | explosion_red | 260x22 | _pendiente_ | _pendiente_ | |
  | run_dust | 108x18 | _pendiente_ | _pendiente_ | |
  | jump_dust | 204x10 | _pendiente_ | _pendiente_ | |

### T6: Emitters de partículas reutilizables
- **Hacer:** En `PlayScene.js` `create()` crear UNA vez 4 emitters (`grunt`, `turret`, `explosion`, `dirt`) con `emitting:false`, spritesheet 2x2 de T5 con frame aleatorio. Presets en `FX_PRESETS` (cantidad, `speed` min/max, `lifespan` 250–450ms, `alpha` start→0, `scale`, `gravityY` de partícula). Helper `emitFx(kind, x, y, dir)` con `explode(n, x, y)` sesgando ángulo hacia afuera. Conectar: John golpeado → `grunt` (6), torreta viva golpeada → `turret` (5), HP 0 → `explosion` (14). Tope `FX_MAX_PARTICLES`, `depth=FX_DEPTH`.
- **Archivos:** `src/scenes/PlayScene.js`, `src/scenes/PreloadScene.js`, `src/enemies.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: ráfagas <0.5s; 30 impactos no suben `children.list.length`.

### T7: Fx de boca + anticipación de disparo
- **Hacer:** John: boca con frame 0 de impacto escala 0.5 durante `MUZZLE_FLASH_MS=50` en el punto de spawn de T18 (respeta pie/agachado), sin tocar `JOHN_SHOOT_HOLD`. Grunt: al pasar gates reproduce `grunt-shoot` y la bala sale tras `GRUNT_TELEGRAPH_MS=200` desde `GRUNT_MUZZLE`. Torreta viva: tint fijo un pulso `TURRET_TELEGRAPH_MS=250` hacia `aimFrame`, bala al final con `emitFx('turret')`. Al soltar la bala re-validar `active && !dead` y John vivo, si no cancela sin bala ni sonido; timers de anticipación guardados para removerlos al morir. Sonido con la bala, no con la anticipación.
- **Archivos:** `src/enemies.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: anticipación visible; intervalos grunt 2200±50ms y torreta 2600±50ms; matar en anticipación no deja bala fantasma.

### T8: Feedback de impacto en enemigos
- **Hacer:** En enemigo vivo golpeado por John: tint `ENEMY_HIT_TINT_MS=120` (reinicia timer, sin acumular; `clearTint` en callback), hit-pause `HIT_PAUSE_MS=60` con `anims.pause()` + `delayedCall(resume)` sin reanudar si murió, y stagger grunt `GRUNT_STAGGER_MS=150` con `setVelocityX(0)` restaurando velocidad/`dir` (sin cambiar `dir`). Nota: grunt tiene HP 1, así que en él esto solo se ve si sobrevive el golpe; el caso real es torreta viva. Texto `+10` efímero (sin body, tween alpha + subida) al romper torreta. Todo con guardas `active/dead`.
- **Archivos:** `src/enemies.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: impacto en torreta viva destella + micro-pausa; grunt en patrulla retoma misma dirección; ráfaga no deja tint pegado.

### T9: Rotura de torreta con explosión
- **Hacer:** Secuencia ≤600ms a HP 0 (`dead=true` antes de fx): (1) blanco 80ms + hit-pause, (2) `explosion_red` centrada + `emitFx('explosion')` + `snd_explosion_ground` + `shakeCam('explosion')` (150ms/0.003) e inicia `turret-broke`, (3) `explosion_smoke` encima autodestruible. Registrar `explosion-red`/`explosion-smoke` (`repeat 0`, frames T5). Un solo +10.
- **Archivos:** `src/enemies.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: explosión completa y limpia; rota sólida y visible; score +10 exacto; re-golpear no repite fx.

### T10: Legibilidad de balas y fin de vida
- **Hacer:** Tint enemigas `ENEMY_BULLET_TINT` vs John sin tint; `rotation=Math.atan2(vy,vx)` en 8 dirs de torreta y `flipX` en John/grunt, reseteado en cada spawn (origen T18 intacto); al expirar por rango puff de `bullet-impact` escala 0.5 en última posición, sin refund. Sin cambiar velocidad, rango ni hitbox.
- **Archivos:** `src/scenes/PlayScene.js`, `src/enemies.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: enemiga distinguible, diagonales orientadas, 30 balas sin heredar tint/rotación, expiradas con puff sin refund.

### T11: Impacto de balas contra el entorno
- **Hacer:** Verificado: hoy NO hay collider/overlap balas↔plataformas, las balas atraviesan. Por eso NO se añade colisión nueva en esta tarea (cambiaría reglas): solo fx pasivo con `bullet-impact` + `emitFx('dirt')` en el punto de expiración orientado opuesto a la trayectoria (apoya a T10). Si a futuro se quiere colisión real, pedir decisión aparte. Cualquier overlap nuevo iría una sola vez en `create()`. Sin sonido nuevo.
- **Archivos:** `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: disparar al suelo/pared deja chispa + polvo coherente, sin refund y sin alterar recorridos.

### T12: Audio con keys existentes
- **Hacer:** Helper `playSfx(key, opts)` en `PlayScene.js` que reemplaza `sound.play` directos. Solo keys cargadas (`snd_rifle_shot`, `snd_reload_clip`, `snd_explosion_ground`); sin sonidos nuevos. `SFX_RATE_JITTER=0.05` en John, `ENEMY_SHOT_RATE=0.85` + volumen por distancia `clamp(1 − dist/AGRO_RANGE·0.6, 0.35, 1)` en enemigos, anti-spam `SFX_MIN_GAP_MS=40` por key y tope de voces. Anticipación sin sonido, suena con la bala.
- **Archivos:** `src/scenes/PlayScene.js`, `src/enemies.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: John no suena idéntico, lejano más bajo, doble explosión no satura; sin assets nuevos de audio.

### T13: HUD de texto expresivo (sin HUD gráfico)
- **Hacer:** En `HUDScene.js` sobre textos existentes (patrón registry): `AMMO` → `AMMO:RELOAD` con `registry.reloading`, vuelve a `AMMO:12`; ámbar con `ammo ≤ LOW_AMMO_THRESHOLD=3`, rojo en 0. `HP` flash blanco→rojo `HP_FLASH_MS=120` al golpe y rojo sostenido en invuln 1000ms. `SCORE` pop escala 1→1.15→1 en `SCORE_POP_MS=140`. Tweens con `killTweensOf` antes de reiniciar. En `PlayScene.js` solo publicar flags (`reloading`, `invuln`, `hitAt`) si T1/T4 no lo hicieron.
- **Archivos:** `src/scenes/HUDScene.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: `AMMO:RELOAD` legible, HP destella y queda rojo ~1s, score con pop, sin gráficos nuevos.

### T14: Movimiento ágil (coyote, buffer, salto variable)
- **Hacer:** Sobre el salto actual (`JustDown X/SPACE` + `onGround`, verificado en `src/player.js`): `COYOTE_MS=90` (solo tras dejar plataforma, no tras saltar), `JUMP_BUFFER_MS=110` (salto en aire ≤110ms antes de aterrizar se ejecuta), salto variable con `JUMP_CUT=0.5` una sola vez al soltar en ascenso. Sin tocar gravedad, hitboxes, velocidad máxima ni prioridad hit > shoot > land. Coyote no cuenta como aire para dust de T4.
- **Archivos:** `src/player.js` (+ `src/scenes/PlayScene.js` solo si el input se lee allí)
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: salto ~100ms tras borde funciona, buffer antes de aterrizar rebota, tap corto < mantener; foso/muerte/respawn iguales.

### T15: Cámara viva (lookahead, follow suave, shake centralizado)
- **Hacer:** En `PlayScene.js`: lookahead `setFollowOffset` hacia facing, máx `CAM_LOOKAHEAD=24` (< `CAM_MARGIN=48`), interpolado `CAM_LOOKAHEAD_LERP`; base follow `0.08` verificada (`CAM_FOLLOW_LERP`) + deadzone horizontal pequeña; no tocar bounds. Helper `shakeCam(kind)` con `{ hit: {120, 0.004, force:true}, explosion: {150, 0.003} }` que sustituye literales de T4/T9. `roundPixels: true` ya verificado en `src/main.js`, no se modifica.
- **Archivos:** `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: cámara se adelanta sin tirones, enemigos siguen gateados por cámara+margen y ≤200px, daño siempre muestra su shake.

### T16: Robustez de estado y rendimiento
- **Hacer:** En respawn/restart resetear `ammo, reloading, lastShotAt, invuln` y cancelar `delayedCall` guardados (recarga, invuln, tint, anticipación) y tweens HUD huérfanos; `events.once('shutdown')` destruye emitters/fx y quita listeners; `spawnFx` devuelve `null` con `FX_MAX_SPRITES=24`; todo diferido revalida `active/dead`; recarga/anticipación usan reloj de Play (se congelan con pausa, verificado); contador dev-only (`import.meta.env.DEV`) de fx/balas/ammo. Sin dependencias nuevas.
- **Archivos:** `src/scenes/PlayScene.js`, `src/enemies.js`, `src/player.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: morir/reiniciar ×5 deja `AMMO:12`, `reloading=false`, 0 fx y sin warnings; pausar en recarga completa solo el resto; 10 impactos ~60fps.

### T17: Pasada final de tuning (solo constantes)
- **Hacer:** Playtest ~10min; ajustar SOLO valores del registro (sin lógica): ningún fx tapa balas, shake no marea, anticipación legible y justa, salto no flotante, muzzle T18 alineado en ambas posturas. Completar «Valor final».
- **Archivos:** constantes en `src/player.js`, `src/enemies.js`, `src/scenes/PlayScene.js`, `src/scenes/HUDScene.js` (solo números)
- **Verify:** `pnpm build` pasa; `git diff` solo numéricos; checklist Done completo.

### Registro de constantes nuevas
| Constante | Inicial | Archivo | Tarea |
|---|---|---|---|
| `JOHN_FIRE_DELAY` / `RELOAD_DELAY` | 150 / 900 | `player.js` | T1 |
| `RELOAD_SFX_DELAY` | 120 (desfase del clip vs último disparo) | `PlayScene.js` | T1 |
| `HIT_SHAKE_MS` / `HIT_SHAKE_INTENSITY` | 120 / 0.004 | `PlayScene.js` | T4 |
| `GRUNT_FRONT_DEADZONE` | 4 px | `enemies.js` | T2 |
| `JOHN_MUZZLE_STAND` / `JOHN_MUZZLE_CROUCH` | medir en T18 (reemplaza +14/-2) | `player.js` | T18 |
| `GRUNT_MUZZLE` | medir en T18 (reemplaza +12/0) | `enemies.js` | T18 |
| `FX_DEPTH` | 10 (personajes 0, HUD en escena aparte) | `PlayScene.js` | T3 |
| `FX_PRESETS`, `FX_MAX_PARTICLES` | ver T6 | `PlayScene.js` | T6 |
| `MUZZLE_FLASH_MS` | 50 | `player.js` | T7 |
| `GRUNT_TELEGRAPH_MS` / `TURRET_TELEGRAPH_MS` | 200 / 250 | `enemies.js` | T7 |
| `ENEMY_HIT_TINT_MS` / `HIT_PAUSE_MS` / `GRUNT_STAGGER_MS` | 120 / 60 / 150 | `enemies.js` | T8 |
| `ENEMY_BULLET_TINT` | color a definir en T10 | `enemies.js` | T10 |
| `SFX_RATE_JITTER` / `ENEMY_SHOT_RATE` / `SFX_MIN_GAP_MS` | 0.05 / 0.85 / 40 | `PlayScene.js` | T12 |
| `LOW_AMMO_THRESHOLD` / `HP_FLASH_MS` / `SCORE_POP_MS` | 3 / 120 / 140 | `HUDScene.js` | T13 |
| `COYOTE_MS` / `JUMP_BUFFER_MS` / `JUMP_CUT` | 90 / 110 / 0.5 | `player.js` | T14 |
| `CAM_LOOKAHEAD` / `CAM_LOOKAHEAD_LERP` / `CAM_FOLLOW_LERP` | 24 / a definir / 0.08 | `PlayScene.js` | T15 |
| `FX_MAX_SPRITES` | 24 | `PlayScene.js` | T16 |

## Done (validación final)
- [ ] `pnpm build` pasa sin errores ni warnings nuevos tras cada tarea
- [ ] Manual `pnpm dev` end-to-end: cooldown John ~6/s en ráfaga (C o clic mantenido), enemigos con su cadencia, sin disparo a la espalda, cartucho 12 con recarga solo al agotar y clip distinguible, torreta rota sólida sin daño, balas desde la boca del arma (pie/agachado/grunt), balas animadas con impacto fx, daño John solo por body + anim + dust, HUD `HP/AMMO` actualiza
- [ ] Tabla de frames de T5 completada con medidas reales; `shadow_char` y `props/` NO copiados ni cargados
- [ ] Emitters una sola vez; 30 impactos no suben `children.list.length`
- [ ] Cadencias intactas: grunt 2200±50ms, torreta 2600±50ms, John ~6/s en ráfaga, recarga ~900ms
- [ ] `snd_reload_clip` una vez por recarga; ningún sonido nuevo
- [ ] Torreta rota: sólida, sin daño/score extra/fx al re-golpear
- [ ] Daño John: solo por body (roce visual no daña), shake siempre visible, HP rojo ~1s, sin parpadeo ni knockback
- [ ] Salto coyote/buffer/variable OK; foso, muerte y respawn iguales
- [ ] Respawn/restart ×5 limpio, 0 fx, sin warnings; pausa congela recarga/anticipación
- [ ] ~60fps con 10 impactos simultáneos
- [ ] `git status --stat` muestra solo la spec, `src/player.js`, `src/enemies.js`, `src/scenes/PlayScene.js`, `src/scenes/PreloadScene.js` + `src/scenes/HUDScene.js` (solo T13) y copias en `public/assets/fx/`; `SpriteSheets/`, `GIFs/`, `Mockups/`, `props/`, `BootScene`, `GameOverScene`, `PauseScene`, `main.js` intactos; sin dependencias nuevas
- [ ] Matriz QA:
  | Escenario | Esperado |
  |---|---|
  | Mantener C (o clic) 5s con 12 | ráfaga ~6/s, bloqueo, `AMMO:RELOAD` ~0.9s, vuelve a 12, clip distinguible del último tiro |
 | Clic derecho | dispara sin abrir menú contextual |
  | Disparar parado vs agachado | Bala nace en la boca en ambos; agachada más baja |
  | Grunt dispara | Bala nace en su arma, no arriba |
  | Agachado bajo bala alta | Si solo roza el sprite no hay daño; si toca el body sí |
  | Detrás de grunt <200px | No dispara ni se detiene |
  | Frente <200px | Anticipación y bala animada con boca |
  | 2 tiros a torreta | Tint + partículas al 1.º; explosión y `turret-broke` sólida al 2.º |
  | Recibir bala saltando | `john-hit` + shake, sin salto extra; 2.ª bala <1s no daña |
  | Contra suelo/pared | Impacto + polvo, sin refund |
  | Pausar en recarga | No avanza en pausa |
  | Morir y reiniciar | Estado y HUD limpios |
