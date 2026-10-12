# Animaciones de enemigos (Grunt y Torreta)

## Contexto
- Qué existe hoy: MVP jugable con John (animado: idle, run, jump, crouch), un grunt con patrulla horizontal y disparo básico, y una torreta estática que dispara hacia John y titila en blanco al recibir daño.
- Limitación actual: Grunt usa solo el frame estático 0 de `grunt_idle.png` mientras camina, no tiene feedback visual de disparo y al morir desaparece instantáneamente (`grunt.destroy()`). La torreta usa solo el frame 0 estático de `turret.png`, dispara balas horizontales sin apuntar visualmente y al morir desaparece instantáneamente.
- Assets disponibles en `SpriteSheets/enemy/`:
  - `grunt_idle.png` (52x22, 2 frames de 26x22)
  - `grunt_run.png` (260x22, 10 frames de 26x22)
  - `grunt_shoot.png` (52x22, 2 frames de 26x22)
  - `grunt_death.png` (312x22, 12 frames de 26x22)
  - `turret.png` (144x18, 8 frames direccionales de 18x18: 0=Left, 1=Up-Left, 2=Up, 3=Up-Right, 4=Right, 5=Down-Right, 6=Down, 7=Down-Left)
  - `turret_broke.png` (72x18, 4 frames de 18x18)
- Stack y restricciones: Phaser 4.2.1 + Vite + JS en rama `develop`. Copiar spritesheets a `public/assets/enemy/` manteniendo intactos los originales en `SpriteSheets/enemy/`. Animaciones vía `scene.anims.create` y física Arcade (`setVelocity`, `body.enable = false` en muerte). Patrón de animaciones similar a `src/player.js` con `ensureEnemyAnims(scene)`.

## Objetivo
Dar vida visual y feedback retro a los enemigos del nivel jungla implementando animaciones de correr, disparar y muerte para el Grunt, y orientación direccional hacia John más animación de destrucción para la Torreta.

## Flujo
SECUENCIA (orden temporal ↓) — versión comprimida:
```
SECUENCIA (orden temporal ↓)
1. PreloadScene / PlayScene → Loader: precarga spritesheets de grunt (run, shoot, death) y torreta (broke).
2. PlayScene → AnimationManager: registra anims globales ('grunt-run', 'grunt-shoot', 'grunt-death', 'turret-broke').
3. Grunt → PlayScene (patrulla): camina reproduciendo 'grunt-run' y flipX según dirección.
4. Timer cadencia → Grunt: pausa brevemente patrulla, reproduce 'grunt-shoot', spawnea bala y encadena regreso a 'grunt-run'.
5. John movimiento → Torreta: en cada tick calcula ángulo hacia John y actualiza su frame direccional (0..7).
6. Torreta cadencia → Mundo: dispara bala en el vector exacto hacia el que apunta.
7. Bala John → Grunt: colisión desactiva body del Grunt, otorga score, cancela timers, reproduce 'grunt-death' y al completar se destruye.
8. Bala John → Torreta (HP=0): desactiva body, cancela timer, otorga score, reproduce 'turret-broke' y al completar se destruye.
```

Diagrama de FLUJO (decisiones y ramas — casos borde):
```
 Grunt activo (patrulla)
    │
    ▼
 ¿Impacto de bala John? ──sí──▶ desactiva body + cancela disparo ──▶ 'grunt-death' ──▶ animationcomplete ──▶ destroy()
    │ no
    ▼
 ¿Timer disparo listo? ──sí──▶ ¿está vivo? ──no──▶ descartar
    │ no                         │ sí
    │                            ▼
    │                   frena brevemente + 'grunt-shoot' ──▶ emite bala ──▶ chain('grunt-run') + reanuda patrulla
    ▼
 continúa patrullando ('grunt-run')

 ─────────────────────────────────────────────────────────────────────────────────────────────────

 Torreta activa
    │
    ▼
 John en escena ──sí──▶ calcula ángulo (dx, dy) ──▶ selecciona frame direccional (0..7)
    │
    ▼
 ¿Timer disparo listo? ──sí──▶ emite bala según frame/ángulo apuntado
    │
    ▼
 ¿Impacto de bala John? ──sí──▶ HP = HP - 1
                                   │
                                   ▼
                             ¿HP <= 0? ──no──▶ flash blanco (tint 120ms) + sigue activa
                                   │ sí
                                   ▼
                             desactiva body + cancela timer disparo
                                   │
                                   ▼
                             cambia textura/anim a 'turret-broke' (4 frames)
                                   │
                                   ▼
                             animationcomplete ──▶ destroy()
```

## Restricciones
- NO mover, renombrar ni convertir assets originales en `SpriteSheets/enemy/`; solo copiar a `public/assets/enemy/`.
- No alterar mecánicas existentes del jugador (movimiento, salto, agachado, disparo de John quedan intactos).
- Mantener compatibilidad total con Phaser 4.2.1 sin añadir dependencias nuevas en `package.json`.
- Respetar el ciclo de vida de Phaser: `collider` y `overlap` registrados una sola vez en `create`, no en `update`.
- Manejo estricto de Arcade Physics: al morir un enemigo, deshabilitar `body.enable = false` inmediatamente para evitar colisiones fantasma durante la animación de muerte.

## Fuera de alcance
- Bosses (`SpriteSheets/boss/`), segundo nivel (cueva), portal de grunt (`grunt_portal.png`).
- Variaciones de Grunt agachado (`grunt_crouch.png`, `grunt_crouch_shoot_front.png`).
- Sonidos o efectos de audio (fuera del alcance del MVP actual).
- Modificaciones al HUD o escenas de título / Game Over.

## Tareas

### T1: Assets y animación de patrulla de Grunt
- **Hacer:**
  1. Copiar `grunt_run.png`, `grunt_shoot.png`, `grunt_death.png` y `turret_broke.png` desde `SpriteSheets/enemy/` hacia `public/assets/enemy/` dejando intactos los originales.
  2. En `PreloadScene.js` y `PlayScene.js`, precargar los nuevos spritesheets con sus dimensiones exactas (`grunt`: 26x22, `turret_broke`: 18x18).
  3. En `src/enemies.js`, crear `ensureEnemyAnims(scene)` registrando la animación global `grunt-run` (10 frames, frameRate 10, repeat: -1). Actualizar `createGrunt` y `updateGrunt` para reproducir `grunt-run` sincronizado con la velocidad horizontal y `flipX`.
- **Archivos:** `src/scenes/PreloadScene.js`, `src/scenes/PlayScene.js`, `src/enemies.js` (+ copias en `public/assets/enemy/`)
- **Verify:** `pnpm build` pasa sin errores; en `pnpm dev`: el Grunt corre visiblemente con animación de 10 frames de ida y vuelta en su zona de patrulla (sin deslizarse con frame estático) y la barra de carga no arroja errores 404.

### T2: Disparo y muerte animada de Grunt
- **Hacer:**
  1. En `src/enemies.js`, registrar animaciones `grunt-shoot` (2 frames, frameRate 8, repeat: 0) y `grunt-death` (12 frames, frameRate 12, repeat: 0).
  2. En `gruntFire`, si el Grunt está vivo, frenar brevemente su velocidad horizontal, reproducir `grunt-shoot`, instanciar la bala y encadenar el regreso a `grunt-run` reanudando patrulla.
  3. En `damageGrunt`, marcar `dead: true`, deshabilitar su física (`body.enable = false`), remover su `fireTimer`, reproducir `grunt-death` y en `animationcomplete` destruir el objeto (`grunt.destroy()`).
  4. En `PlayScene.js`, asegurar que los overlaps bala↔grunt y john↔grunt ignoren al Grunt si `grunt.getData('dead')` es verdadero.
- **Archivos:** `src/enemies.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa sin errores; en `pnpm dev`: al disparar, el Grunt frena y muestra animación de disparo; al recibir impacto de bala de John, reproduce sus 12 frames de muerte en el lugar sin dañar a John ni recibir más impactos, y desaparece al terminar la animación.

### T3: Torreta direccional (8 ángulos) y animación de destrucción
- **Hacer:**
  1. En `src/enemies.js`, registrar animación `turret-broke` (4 frames, frameRate 10, repeat: 0).
  2. En `updateTurret(turret, john)` (llamado desde `PlayScene.update`), calcular el ángulo hacia John usando `Phaser.Math.Angle.Between(turret.x, turret.y, john.x, john.y)` y mapearlo al frame correspondiente (0..7 de `turret.png`, 8 direcciones en incrementos de 45°).
  3. En `turretFire`, orientar el disparo en el vector correspondiente al frame al que apunta la torreta.
  4. En `damageTurret`: al llegar a HP <= 0, deshabilitar su body estático, cancelar `fireTimer`, cambiar la textura/animación a `turret-broke`, y en `animationcomplete` llamar a `turret.destroy()`.
- **Archivos:** `src/enemies.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa sin errores; en `pnpm dev`: la torreta apunta dinámicamente con su cañón hacia John según se mueva; al recibir 2 impactos de bala, reproduce la animación de explosión de 4 frames antes de destruirse.

## Done (validación final)
- [ ] `pnpm build` pasa sin errores ni advertencias de tipos/bundler.
- [ ] Manual `pnpm dev`:
  - Grunt corre animado durante la patrulla y se da vuelta en los límites.
  - Grunt realiza animación de disparo al arrojar una bala.
  - Grunt reproduce animación de muerte de 12 frames al ser eliminado y no genera daño colateral mientras muere.
  - Torreta apunta visualmente en 8 direcciones hacia la posición de John.
  - Torreta titila en blanco en el primer impacto y reproduce la animación `turret-broke` al ser destruida en el segundo impacto.
- [ ] `git status` muestra solo los archivos de spec, código modificado y assets copiados en `public/assets/enemy/`, manteniendo intacto `SpriteSheets/`.
