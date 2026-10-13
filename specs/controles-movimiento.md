# Controles de movimiento (remapeo salto/agachado/apuntado)

## Contexto
- Stack: Phaser 4.2.1 pineado + Vite + JavaScript (ver `package.json`); física Arcade con gravedad `y: 600` (ver `src/main.js`).
- El input vive en dos lugares que se deben respetar: `src/scenes/PlayScene.js` registra las teclas (`createCursorKeys()` + `addKeys('W,A,S,D,SPACE,Z,X')` + tecla C de disparo, `191:195`) y `src/player.js` decide el movimiento en `updateJohn(player, input)` (`120:222`), siempre por `body.setVelocity`, salto solo con `body.blocked.down`.
- Patrón a seguir: `src/player.js` (`updateJohn`) — ramas por estado (crouch > horizontal > salto > anims) con early `return`, holds por `isDown` y cantos por `JustDown`.
- Decisiones ya tomadas (no re-discutir): assets originales nunca se tocan; sin dependencias nuevas salvo `phaser`/`vite`; disparo sigue en C/clic (T4, fuera de este cambio); la mecánica de apuntado con Ctrl+dirección es futura y acá solo se reserva el flag.

## Objetivo
Reasignar el input de John para que el salto sea solo con X/Space, W/↑ reserven el apuntado hacia arriba y el resto quede igual.

## Flujo
```
SECUENCIA (orden temporal ↓)
1. Jugador → Teclado: pulsa/mantiene tecla (A/D/←/→/S/↓/X/Space/W/↑)
2. PlayScene.update → updateJohn(player, {cursors, keys, now}): input del frame
3. updateJohn → updateJohn: resuelve crouch (S/↓) > horizontal (A/D/←/→) > salto (solo X/Space por JustDown) > aim (W/↑)
4. updateJohn → Body Arcade: setVelocityX/Y + hitbox stand/crouch
5. updateJohn → Sprite: play(idle/run/jump/crouch/…) según estado
6. Sprite → Jugador: ve movimiento/animación
```
```
 entrada: teclas del frame
    │
    ▼
 ¿muerto? ──sí──▶ ignorar input ──▶ fin
    │ no
    ▼
 ¿S/↓ held + en suelo? ──sí──▶ vx=0, hitbox agachada, anim crouch ──▶ fin (*)
    │ no
    ▼
 ¿A/← xor D/→? ──ambas/ninguna──▶ vx=0
    │ una sola                          │
    ▼                                   │
 vx=±SPEED + flip                       │
    │                                   │
    ▼                                   │
 ¿X/Space JustDown + en suelo?          │
    │ sí                     │ no       │
    ▼                        ▼          ▼
 vy=-JUMP, anim jump ──▶ fin   anim idle/run/aire ──▶ fin

 (*) X/Space durante crouch → se ignora (hay que soltar S/↓ para saltar) [D3]
 Z → sin asignar, sin efecto [D1]
 rama paralela, siempre: ¿W/↑ held? ──sí──▶ aimUp=true (sin efecto visible aún) [D2]
```

Decisiones aprobadas por el usuario:
- **D1:** salto SOLO con X o Space. Z queda sin asignar (hoy saltaba, se quita).
- **D2:** W/↑ ya no saltan; setean `aimUp=true` en el player, sin efecto visible (reserva para Ctrl+dirección).
- **D3:** salto desde agachado imposible (como hoy: la rama crouch retorna antes del salto).
- **D4:** X/Space mantenido = un solo salto por pulsación (`JustDown`), sin auto-repetición.
- **D5:** S/↓ en el aire sin efecto (no hay fast-fall).
- **D6:** ←+→ (o A+D) a la vez = `vx=0`.

## Restricciones
- No tocar: disparo (`fireJohn`, tecla C, clic), física/gravedad, plataformas, enemigos, HUD/registry, assets ni anims.
- Solo cambia la resolución de input en `src/player.js` (`updateJohn`); el registro de teclas en `PlayScene.js` ya incluye todas las necesarias.
- Sin dependencias nuevas.

## Fuera de alcance
- La mecánica de apuntado con Ctrl+AWSD/flechas (solo se deja el flag `aimUp`).
- Reasignar Z a otra acción; cambios al disparo; salto desde agachado; fast-fall; controles táctiles.

## Tareas
### T1: Remapear salto y agachado
- **Hacer:** en `updateJohn`: `crouchHeld` pasa a `cursors.down.isDown || keys.S.isDown` (quitar `keys.X`); `jumpPressed` pasa a `JustDown(keys.X) || JustDown(keys.SPACE)` (quitar `cursors.up`, `keys.W` y `keys.Z`). Nada más.
- **Archivos:** `src/player.js`
- **Verify:** `pnpm build` pasa; manual en `pnpm dev`: X salta, Space salta, ↑ no salta, W no salta, Z no salta, S y ↓ agachan, X ya no agacha.

### T2: Reservar flag de apuntado arriba
- **Hacer:** en `updateJohn`, leer `cursors.up.isDown || keys.W.isDown` y guardar `player.setData('aimUp', true/false)` cada frame, sin usarlo en físicas, hitbox ni anims.
- **Archivos:** `src/player.js`
- **Verify:** `pnpm build` pasa; manual en `pnpm dev`: con el juego corriendo, mantener W no mueve ni salta a John (el flag solo existe en `player.getData('aimUp')` para la futura mecánica).

## Done (validación final)
- [ ] `pnpm build` pasa sin errores
- [ ] Manual: en `pnpm dev`, recorrer tecla por tecla — A/D/←/→ mueven, X/Space saltan (un salto por pulsación), S/↓ agachan, W/↑/Z no producen movimiento ni salto, y soltar S/↓ permite volver a saltar
