# Sonidos del juego

## Contexto
- Qué existe hoy: scaffold Vite + Phaser 4.2.1 con escenas `Boot → Preload → Play → GameOver` + `HUD` en paralelo (`src/main.js`, `src/scenes/`). Audio no existe: `specs/mvp-jugable.md` lo dejó explícitamente fuera de alcance. Los 27 `.ogg` están en `Sounds/` en la raíz (nunca mover ni renombrar originales; si Vite exige servirlos, copiar a `public/` dejando el original intacto, por `AGENTS.md`).
- Patrones a seguir: `src/scenes/PreloadScene.js` (carga en `preload` con barra vía `progress/complete` y rama error + reintento que no arranca el nivel roto); `src/scenes/PlayScene.js` (estado de run se resetea en `init()`, `collider/overlap` solo en `create`, HUD con `launch`); `src/player.js` + `src/enemies.js` (lógica de actor en módulos, la escena orquesta; eventos ya existentes: `justLanded` en `updateJohn`, `animationcomplete-*` en muertes).
- Decisiones ya tomadas (no re-discutir): siempre Phaser v4, nunca v3; `pixelArt: true`, `Scale.FIT + CENTER_BOTH`; tareas pequeñas de una por sesión (< ~3 archivos); reportes en español; sin dependencias nuevas salvo `phaser` + `vite`. Flujo de audio aprobado por el usuario (turno anterior) con estas correcciones: se ignoran `snd_jump_hump`, `snd_landfppt`, `snd_snap`, `snd_blowup`, `snd_explosion_air/earth/solid`, `snd_danger`; el disparo de John, grunt y torreta usa el MISMO sonido (`snd_rifle_shot`); todo lo del boss queda fuera.

## Objetivo
John y los enemigos suenan (salto, aterrizaje, pasos, disparos, daño, explosión de muerte) con `snd_main_theme` en loop durante el nivel y `snd_end_drums` en game-over.

## Flujo
SECUENCIA (orden temporal ↓) — versión comprimida:
```
SECUENCIA (orden temporal ↓)
1. Jugador → BootScene: pulsa tecla/clic (ese gesto desbloquea WebAudio) + suena snd_click/snd_select
2. BootScene → PreloadScene: start('Preload')
3. BootScene → Loader: load.audio de `snd_click` (suena en Boot, antes de que Preload exista); PreloadScene → Loader: load.audio de los otros 11 .ogg (copiados a public/assets/sounds/), con la barra existente
4. Loader → PreloadScene: complete (0 fallos) o loaderror
5. PreloadScene → PlayScene: start('Play') — o pantalla error + reintento si hubo fallos (igual que imágenes)
6. PlayScene → SoundManager: play('main_theme', loop) una sola vez por run (guard: no re-lanzar si ya suena)
7. Jugador → PlayScene (loop): input / overlap bala / timer enemigo / flanco aire→suelo
8. PlayScene → SoundManager: play(SFX del evento); pasos con cadencia, disparos a demanda
9. SoundManager → Jugador: salida (SFX se solapan entre sí, la música nunca se duplica)
10. PlayScene → GameOverScene: stop('main_theme') → play('end_drums') una vez + snd_select en reintento
```

Diagrama de FLUJO (las decisiones y ramas — acá viven los casos borde):
```
 press-start (gesto = unlock audio) + click
    │
    ▼
 carga 1 .ogg en Boot + 11 en Preload ──▶ ¿falla algún archivo? ──sí──▶ error + reintento (no arranca a medias, igual que imágenes)
    │ no
    ▼
 Play.init: ¿main_theme ya sonando? ──sí──▶ no re-lanzar (evita doble loop al reintentar)
    │ no
    ▼
 play main_theme loop (volumen música 0.5)
    │
    ▼
 evento ──▶ ¿paso corriendo? ──sí──▶ ¿pasaron ≥250ms desde el último paso? ──no──▶ se descarta (anti-spam)
    │                │ sí                                              │ sí
    │                ▼                                                 ▼
    │         ¿disparo sin bala en pool? ──sí──▶ snd_reload_clip (feedback pool vacío)
    │                │ no
    │                ▼
    │         salto / aterrizaje / disparo / daño / muerte enemiga ──▶ play SFX (volumen 0.8, solape permitido)
    ▼
 ¿HP <= 0 o sale de Play? ──sí──▶ stop main_theme → play end_drums una vez → GameOver (select en reintento)
    │ no
    ▼
 sigue loop (sin tecla de mute: fuera de alcance)
```

## Restricciones
- NO mover, renombrar ni convertir los `.ogg` originales de `Sounds/`; solo copiar los 12 usados a `public/assets/sounds/`.
- Sonido solo vía `this.sound` / `scene.sound` de Phaser (WebAudio); sin dependencias nuevas (sin howler ni nada).
- NO tocar física, anims, HUD, contratos de escenas ni `vite.config.js`; los `play()` van en los puntos de evento ya existentes (`fireJohn`, `hitJohn/damageJohn`, `gruntFire/turretFire`, `damageGrunt/damageTurret`, ramas de salto/aterrizaje de `updateJohn`).
- `collider/overlap` se siguen creando solo en `create`; ningún `play` dentro de `update` sin gate de flanco o cadencia (no spamear por frame).
- Mapeo fijo (lo demás no se carga): `snd_jump` salto · `snd_landing` aterrizaje · `snd_step1/2` pasos alternados · `snd_rifle_shot` disparo John+grunt+torreta · `snd_reload_clip` pool vacío · `snd_hurt` daño a John · `snd_explosion_ground` muerte grunt/torreta · `snd_main_theme` loop nivel · `snd_end_drums` game-over · `snd_click`/`snd_select` UI (press-start / reintento).

## Fuera de alcance
- Boss (`snd_boss_fire`, `snd_boss_laser`, `snd_boss_music`, `snd_bossintro`) y reservados sin evento: `snd_boss*`, `snd_jump_hump`, `snd_landfppt`, `snd_snap`, `snd_blowup`, `snd_explosion_air/earth/solid`, `snd_danger`, `snd_missil`, `snd_bomb`, `snd_small_rifle`.
- Tecla de mute (M), control de volumen en UI, audio posicional/espacial, partículas de explosión visual.
- Migración a TypeScript, CI/CD, deploy.

## Tareas
### T1: Copiar y cargar los 12 .ogg
- **Hacer:** Copiar los 12 `.ogg` del mapeo desde `Sounds/` a `public/assets/sounds/` (originales intactos); cargar `snd_click` en `BootScene.preload()` (suena en Boot, antes de que Preload exista) y los otros 11 en `PreloadScene.preload()`, con `this.load.audio(key, url)` reutilizando la barra `progress/complete` y la rama error + reintento ya existentes (los fallos de audio suman al mismo contador `failed`).
- **Archivos:** `src/scenes/PreloadScene.js`, `src/scenes/BootScene.js` (+ 12 copias en `public/assets/sounds/`)
- **Verify:** `pnpm build` + manual `pnpm dev`: pestaña Network muestra 1 `.ogg` en Boot + 11 en Preload (12 total, 200) y la barra llega a 100% sin errores.

### T2: Música de nivel + game-over + clics UI
- **Hacer:** En `PlayScene.create()` lanzar `snd_main_theme` en loop (volumen 0.5) con guard para no duplicarlo si ya suena; al morir (rama `hp <= 0` de `damageJohn`) hacer `stop('main_theme')`; en `GameOverScene` reproducir `snd_end_drums` una vez al entrar y `snd_select` al pulsar reintento; en `BootScene` reproducir `snd_click` al pulsar press-start (precargado en `BootScene.preload()` en T1).
- **Archivos:** `src/scenes/PlayScene.js`, `src/scenes/GameOverScene.js`, `src/scenes/BootScene.js`
- **Verify:** `pnpm build` + manual: el tema suena en loop al jugar, al morir se corta y suenan los tambores, reintentar no duplica la música.

### T3: SFX de John
- **Hacer:** En los puntos de evento existentes: `snd_jump` al saltar y `snd_landing` en el flanco `justLanded` (ramas de `updateJohn` en `player.js`, vía `player.scene.sound`); pasos `snd_step1/2` alternados con cadencia ≥250ms solo corriendo en suelo; en `PlayScene.fireJohn()` `snd_rifle_shot` al disparar y `snd_reload_clip` cuando el pool no devuelve bala; `snd_hurt` en `hitJohn`/`damageJohn` (volumen SFX 0.8).
- **Archivos:** `src/player.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` + manual: saltar/aterrizar/correr/disparar/recibir daño suena cada cosa; correr 3s no spamea pasos; disparar con pool agotado suena a recarga. Nota 2026-10-14 (verificado por el usuario): todo suena salvo `snd_reload_clip`, imposible de provocar hoy — el pool de 12 balas con refund/reciclaje rápido nunca se vacía; el código existe en la rama `!bullet` de `fireJohn()` y se deja así. El game-feel futuro (delay entre disparos, tiempo de recarga al agotar balas) lo hará comprobable.

### T4: SFX de enemigos
- **Hacer:** `snd_rifle_shot` en `gruntFire` y `turretFire` (mismo sonido que John, decisión confirmada) justo donde se crea la bala enemiga; `snd_explosion_ground` en `damageGrunt` y en la rama mortal de `damageTurret`; el golpe no mortal de torreta sigue sin sonido (solo tint, como hoy).
- **Archivos:** `src/enemies.js` (+ toques mínimos en `src/scenes/PlayScene.js` si el contexto `scene` lo exige)
- **Verify:** `pnpm build` + manual: grunt y torreta suenan igual que el rifle al disparar; matar a cada uno suena a explosión; el primer impacto a la torreta sigue mudo.
- **Nota 2026-10-14 (acordado con el usuario, opción 2):** el `play('snd_rifle_shot')` de `gruntFire`/`turretFire` corre incondicional tras `fireEnemyBullet`; si el pool enemigo (`maxSize: 20`) devolviera `null`, sonaría un "disparo fantasma" sin bala. Hoy no se da (cadencias 2200/2600ms vs vida de bala ~1,2s por `BULLET_RANGE` + reciclaje: máximo realista 2–4 simultáneas). Fix futuro: `fireEnemyBullet` devuelve la bala creada (`null` si el pool está agotado) y el `play` se condiciona a ese retorno. No se implementa en esta spec: va con el game-feel futuro.

## Done (validación final)
- [ ] `pnpm build` pasa sin errores
- [ ] Manual `pnpm dev` con sonido: press-start (clic) → nivel con tema en loop → correr/saltar/aterrizar/disparar/pasos suenan → enemigos disparan con rifle → muertes explotan → daño duele → muerte corta el tema y suenan tambores → reintento con select y música única
- [ ] `ls Sounds/` intacto (27 archivos); `ls public/assets/sounds/` tiene exactamente los 12 usados; sin dependencias nuevas en `package.json`
- [ ] Excepción conocida T3 (2026-10-14): `snd_reload_clip` implementado pero no audible en manual — el pool nunca se vacía hoy; pendiente del game-feel futuro (delay entre disparos, recarga al agotar), sin cambios en esta spec
- [ ] Excepción conocida T4 (2026-10-14): `snd_rifle_shot` enemigo con borde teórico — `play` incondicional aunque `fireEnemyBullet` reciba `null` del pool (20 slots, inagotable hoy con cadencias y reciclaje actuales); fix acordado (retorno + `play` condicionado, opción 2) pendiente del game-feel futuro, sin cambios en esta spec
