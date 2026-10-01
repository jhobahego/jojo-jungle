# Deuda de combate MVP

## Contexto
- Qué existe hoy: juego Phaser 4.2.1 + Vite + JS (Node 24 + pnpm 12.6.0), canvas 480x270 con `pixelArt: true`, `Scale.FIT + CENTER_BOTH`, zoom 2x (ver `src/main.js`, `AGENTS.md`). Nivel jungla 960x270 en `src/scenes/PlayScene.js`: suelo/plataformas estáticas, parallax 2 capas, cámara follow a John, pools `bullets` (max 12, ammo en registry) y `enemyBullets` (max 20), overlaps creados una sola vez en `create()`.
- Combate T4 verificado jugable (ver `TODO.md`): balas de John (340px/s), grunt (patrulla x 430..570, disparo 2200ms, bala 160px/s) y torreta estática en (880, 231) (disparo 2600ms, bala 150px/s) vuelan, dañan/matan y el flujo muerte → game-over → reintento funciona. Comportamiento provisorio aceptado: sin restricción de visión ni alcance (balas mueren solo al salir del nivel con margen ±30px en `recycleBullets`), torreta usa solo frame 0 de `turret.png` (tira 8 frames 18x18, mira a la izquierda) pero dispara hacia ambos lados.
- Patrones a seguir: `src/scenes/PlayScene.js` (orquestación: pools con `get/enableBody`, `overlap` una vez en `create`, `registry` hp/score/ammo, `fireJohn` con guarda `john.active` + `refundAmmo` al reciclar) y `src/enemies.js` (guardas `active/dead` en `gruntFire/turretFire/damage*`, timers con `fireTimer` que se remueven al morir).
- Decisiones ya tomadas (no re-discutir): siempre Phaser v4, nunca v3; assets originales en `SpriteSheets/` NUNCA se mueven/renombran/convierten (si Vite exige servirlos, se copian a `public/`); sin dependencias nuevas salvo `phaser` + `vite`; tareas pequeñas (< ~3 archivos, una por sesión); reportes en español.
- Decisiones de flujo aprobadas por el usuario (2026-10-01, paso 1 del scope): `MARGEN_CAM = 48px`, `RANGO_AGRO = 200px`, `RANGO_BALA = 200px` por distancia recorrida (`spawnX`); patrulla del grunt SIGUE fuera de cámara (solo se gatean disparo + daño); `refundAmmo` de John se mantiene al reciclar por rango; torreta se orienta con `flipX`/frame según signo `dx` tras verificar la tira.

## Objetivo
Ningún disparo ni daño ocurre fuera de cámara (+48px) ni más allá de 200px, las balas mueren a 200px recorridos y la torreta mira al lado al que dispara.

## Flujo
SECUENCIA (orden temporal ↓) — versión comprimida:
```
SECUENCIA (orden temporal ↓)
1. Timer (grunt 2200ms / torreta 2600ms) o Jugador (C/clic) → PlayScene: intento de disparo
2. PlayScene → Cámara: ¿atacante Y objetivo dentro de cámara + MARGEN_CAM (48px)? no → aborta
3. PlayScene → PlayScene: ¿|dx| <= RANGO_AGRO (200px)? no → aborta
4. Torreta → Torreta: orienta sprite (frame/flipX según signo dx) antes de disparar
5. PlayScene → Pool: get() bala (¿null/pool lleno? → aborta sin gastar ammo)
6. PlayScene → Bala: enableBody + setVelocity + guarda spawnX + (John: gasta ammo)
7. Update → Bala: avanza por Arcade; ¿|x - spawnX| > RANGO_BALA (200px)? sí → killBullet (+refund si es de John)
8. Arcade → PlayScene: overlap bala↔víctima (onJohnBulletVsGrunt/Turret, onEnemyBulletVsJohn)
9. PlayScene → PlayScene: ¿bala activa? ¿víctima activa/no-dead? ¿John no-invuln? ¿ambos en cámara+margen? no → ignora
10. PlayScene → Víctima: damageGrunt/damageTurret/hitJohn (score+10 / knockback+invuln 1s / tint torreta)
```

Diagrama de FLUJO (decisiones y ramas — acá viven los casos borde):
```
 intento disparo (timer enemigo / C-clic John)
    │
    ▼
 ¿atacante muerto/inactivo? ──sí──▶ aborta (no dispara)
    │ no
    ▼
 ¿John muerto/inactivo? (solo fuego enemigo) ──sí──▶ aborta
    │ no
    ▼
 ¿atacante Y objetivo en cámara + 48px? ──no──▶ aborta (sin disparo, sin daño)
    │ sí
    ▼
 ¿|dx| <= 200px (agro)? ──no──▶ aborta
    │ sí
    ▼
 (solo torreta) orienta sprite según signo dx
    │
    ▼
 ¿pool get() null? ──sí──▶ aborta sin gastar ammo
    │ no
    ▼
 bala vuela (guarda spawnX)
    │
    ▼
 ¿|x - spawnX| > 200px? ──sí──▶ killBullet (+refund solo John) ──▶ fin bala
    │ no
    ▼
 ¿overlap con víctima? ──no──▶ sigue volando
    │ sí
    ▼
 ¿bala inactiva? ──sí──▶ ignora (doble overlap)
    │ no
    ▼
 ¿víctima muerta/inactiva? ──sí──▶ ignora
    │ no
    ▼
 ¿John invuln? (solo daño a John) ──sí──▶ ignora bala (killBullet sin daño)
    │ no
    ▼
 ¿bala Y víctima en cámara + 48px? ──no──▶ ignora (sin daño; bala sigue o se recicla por rango)
    │ sí
    ▼
 aplica daño: grunt muere / torreta -1hp (+tint 120ms) / John -1hp + knockback + invuln 1s
    │
    ▼
 ¿HP John <= 0? ──sí──▶ GameOver (timers ya se limpian al destruir/shutdown)
    │ no
    ▼
 sigue jugando (reintento resetea en init(): hp/score/ammo/spawn)
```

## Restricciones
- NO mover, renombrar ni convertir assets originales en `SpriteSheets/` (la tira `enemy/turret.png` se inspecciona en lectura, no se modifica); solo copiar a `public/` si Vite lo exige, dejando el original intacto.
- Física solo Arcade: mover por `setVelocity`, nunca por `x/y` directo; `collider`/`overlap` una sola vez en `create()`, nunca en `update()`; no tocar `physics.world` bounds ni gravedad.
- NO tocar HUD (`src/scenes/HUDScene.js`), `GameOverScene`, `PreloadScene` ni el sistema registry hp/score/ammo más allá de mantener el `refundAmmo` existente.
- Sin dependencias nuevas salvo `phaser` + `vite` (más `@vitejs/plugin-*` si el template lo pide), justificando el resto.
- Constantes nuevas (`MARGEN_CAM`, `RANGO_AGRO`, `RANGO_BALA`) centralizadas y exportadas (p. ej. en `src/enemies.js`), sin números mágicos duplicados en `PlayScene.js`.

## Fuera de alcance
- Pausar/congelar la patrulla del grunt fuera de cámara (sigue patrullando; solo disparo + daño se gatean).
- Animación completa de la torreta más allá de orientar el sprite al lado del disparo (sin tweens, partículas ni sonido).
- Bloqueo de visión por paredes/plataformas (solo cámara + distancia, sin line-of-sight con tilemap).
- Boss (`SpriteSheets/boss/`), nivel cueva, tilemaps con Tiled, audio/música/SFX, partículas/fx, guardado/highscore, táctil completo, CI/CD y deploy.
- Optimización del bundle (cerrada en `specs/bundle-chunk-500kb.md`) y migración a TypeScript.

## Tareas
### T1: Rango de balas por distancia (200px)
- **Hacer:** Exportar `BULLET_RANGE = 200` en `src/enemies.js`; en `fireEnemyBullet` (y `fireJohn` en PlayScene) guardar `bullet.setData('spawnX', x)` al activar; en `recycleBullets` matar la bala si `Math.abs(bullet.x - bullet.getData('spawnX')) > BULLET_RANGE` además de los límites de nivel actuales; mantener `refundAmmo` solo para el grupo de John (incluido el reciclaje por rango).
- **Archivos:** `src/enemies.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` + manual `pnpm dev`: desde el spawn disparar a la derecha, la bala desaparece a ~40% del viewport (mucho antes del borde del nivel) y el contador ammo vuelve a subir tras cada reciclaje.

### T2: Gate de cámara + agro en disparo y daño
- **Hacer:** Añadir helper `isOnCameraPlusMargin(scene, x, margin = 48)` (usa `scene.cameras.main.worldView`) en `src/enemies.js` y exportar `AGRO_RANGE = 200`, `CAM_MARGIN = 48`; en `gruntFire`/`turretFire` abortar si atacante o John fuera de cámara+margen o si `|john.x - atacante.x| > AGRO_RANGE` (mantener guardas `active/dead` existentes); en `PlayScene.js` (`onJohnBulletVsGrunt`, `onJohnBulletVsTurret`, `onEnemyBulletVsJohn`) hacer early-return sin daño si bala o víctima están fuera de cámara+margen (mantener `killBullet` + `invuln`/`refundAmmo` vigentes: sin daño no hay `damage*` ni `hitJohn`); `fireJohn` no se bloquea (John siempre va con la cámara) pero su daño queda cubierto por este mismo gate en el overlap; `updateGrunt` no cambia (patrulla sigue).
- **Archivos:** `src/enemies.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` + manual `pnpm dev`: quieto en el spawn, vaciar cargador hacia la derecha sin que el grunt muera ni se pierda hp por balas enemigas; avanzar hasta ver al grunt/torreta y comprobar que ahí sí hay disparos y daño en ambos sentidos.

### T3: Torreta mira al lado al que dispara
- **Hacer:** Inspeccionar (solo lectura) `SpriteSheets/enemy/turret.png` para anotar qué orientación representa cada uno de los 8 frames; en `turretFire` (o helper `updateTurret` si se prefiere orientar cada frame) fijar `turret.setFrame(n)` o `turret.setFlipX(dx > 0)` según el signo de `john.x - turret.x` antes de disparar, con el frame 0 (mira izquierda) como defecto cuando `dx <= 0`; documentar en comentario la elección frame-vs-flipX según lo observado en la tira.
- **Archivos:** `src/enemies.js` (+ toque mínimo en `src/scenes/PlayScene.js` solo si el helper necesita llamada por frame)
- **Verify:** `pnpm build` + manual `pnpm dev`: acercarse a la torreta por la derecha, el sprite mira/dispara a la derecha; rodearla por la izquierda, mira/dispara a la izquierda (screenshot comparativo si hay duda).

### T4: Corregir orden de params en overlaps bala↔enemigo (hallado al verificar T3)
- **Hacer:** En `src/scenes/PlayScene.js`, resolver bala/víctima por pertenencia al pool (`this.bullets.contains`) en `onJohnBulletVsGrunt` y `onJohnBulletVsTurret`, sin asumir el orden de registro (Arcade entrega sprite primero: probado con trazas `raw=grunt-anim,john-bullet`). Sin este fix la torreta se deshabilitaba al primer roce (sin HP ni score) y el grunt fugaba su `fireTimer` + destruía la bala asesina.
- **Archivos:** `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` + manual `pnpm dev`: grunt muere de 1 tiro (+10), torreta de 2 (tint + muerte, +10), `SCORE:20` y `AMMO:12` finales.

## Done (validación final)
- [x] `pnpm build` pasa sin errores ni warnings nuevos
- [x] Manual `pnpm dev` (Verify de `TODO.md`): fuera de cámara no hay disparos ni daño en ningún sentido; la torreta mira al lado al que dispara; las balas desaparecen a medio camino del nivel
- [x] Manual end-to-end sin regresión: jugar → matar grunt/torreta de cerca (score +10 cada uno, HUD actualiza) → recibir golpe (knockback + invuln 1s) → muerte → game-over → reintento con hp/score/ammo/spawn limpios
- [x] `SpriteSheets/`, `GIFs/`, `Mockups/` intactos; sin dependencias nuevas en `package.json`
