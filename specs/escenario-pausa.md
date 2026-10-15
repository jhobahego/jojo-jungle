# Pausa con UI propia

## Contexto
- Stack: Node 24 + pnpm 12.6.0, Phaser 4.2.1 + Vite + JavaScript (sin TypeScript). Comandos: `pnpm dev` (boot Phaser + "boot ok"), `pnpm build` (debe pasar sin errores).
- Escenas hoy: `src/main.js` registra `[Boot, Preload, Play, GameOver, HUD]`; `Boot` espera tecla/clic y pasa a `Preload`; `Preload` carga MVP + sonidos y arranca `Play`; `Play` hace `launch('HUD')` en paralelo y `stop('HUD')` en `SHUTDOWN` (`src/scenes/PlayScene.js:219-224`).
- Pausa NO existe: cero `scene.pause/resume`, sin tecla ESC/P. Input actual en `src/scenes/PlayScene.js:191-195`: cursores + `W,A,S,D,SPACE,Z,X`, disparo con `C` o `pointerdown`.
- Timers enemigos (`fireTimer` grunt/torreta en `src/scenes/PlayScene.js:197-213`) pertenecen al reloj de `Play` y se congelan con `pause('Play')`; `snd_main_theme` suena en loop (`src/scenes/PlayScene.js:226-229`).
- HUD actual es solo texto `HP/SCORE/AMMO` (`src/scenes/HUDScene.js:13-21`); `life-unit` ya cargado en Preload pero nunca renderizado.
- Carpeta `SpriteSheets/ui/` tiene 21 PNG (tipografías `fnt_wonder32_custom.png` + variante `fnt_wonder32_customm.png`, `gun_icon.png`, `life_empty.png`, `life_unit.png`, iconos, medallas, nades, armas, multiplicadores, `player_icon_idle.png`); en `public/assets/ui/` hay solo `life_unit.png`. Sin panel/botón dedicado.
- Patrones a seguir: `src/scenes/BootScene.js` (fondo + logo + press-start con fallback a texto) y `src/scenes/GameOverScene.js` (panel + reintento con `snd_select`).
- Decisiones ya tomadas: Escenario se recorta a solo pausa en esta sesión; HUD gráfico queda para la próxima; decorado del mapa no se hace; de `ui/` se copian solo los necesarios para pausa (tipografía + selector), los originales quedan intactos.

## Objetivo
Pausar con ESC/P y mostrar el menú Pausa con Reanudar, Reiniciar, Controles, Opciones y Salir usando assets UI copiados.

## Flujo
SECUENCIA (orden temporal ↓)
```
1. Jugador → Play: presiona ESC (P como alternativa)
2. Play → Manager: pause('Play') + launch('Pause')
3. Pause → Jugador: muestra menú con fondo semitransparente (Reanudar, Reiniciar, Controles, Opciones, Salir) con tipografía e iconos UI
4. Jugador → Pause: elige con teclado/clic
5. Pause → Manager: Reanudar → stop('Pause') + resume('Play')
6. Pause → Manager: Reiniciar → stop('Pause') + stop('HUD') + start('Play') de cero
7. Pause → Manager: Salir → stop('Pause') + stop('HUD') + start('Boot')
8. Pause → Jugador: Controles/Opciones → muestra "Sin funcionalidad", se queda en menú
```
Diagrama de FLUJO (decisiones y ramas — acá viven los casos borde):
```
  presiona ESC/P en Play
     │
     ▼
  ¿ya pausado? ──sí──▶ reanuda (toggle; el input de Pause nunca llega a Play pausado, sin flag)
     │ no
     ▼
 pausa Play + abre Pause arriba (HUD queda congelado detrás)
     │
     ▼
  ¿qué elige? ──Reanudar──▶ cierra Pause, resume Play (el siguiente clic en Play SÍ dispara: es intencional)
     ├──Reiniciar──▶ cierra todo, arranca Play de cero (init resetea hp/score/ammo)
     ├──Salir──▶ cierra todo, vuelve a Boot (espera tecla/clic)
     └──Controles/Opciones──▶ muestra "Sin funcionalidad", se queda
```

## Restricciones
- Originales en `SpriteSheets/` NUNCA se borran ni se convierten in-place; solo copiar a `public/`, original intacto.
- En `PreloadScene.js` solo añadido aditivo de cargas (sin tocar claves MVP existentes ni lógica registry hp/score/ammo; se respeta la intención de `specs/deuda-combate-mvp.md:85`).
- NO tocar `src/scenes/HUDScene.js`, `src/scenes/GameOverScene.js` ni el sistema registry.
- `fnt_wonder32_custom.png` NO tiene descriptor `.fnt`, así que se carga con `this.load.image` y se usa con `add.image` (título/decoración) + `add.text` con estilo que combine; NUNCA `load.bitmapFont`.
- Sin dependencias nuevas salvo `phaser` + `vite`.

## Fuera de alcance
- Decorado del mapa.
- HUD gráfico (barra de vida y munición con UI; próxima spec/sesión, incluye `life_empty.png`, medallas, nades y armas).
- Funcionalidad real de Controles y Opciones.
- Sonidos nuevos, partículas/fx, táctil completo, CI/CD y deploy.

## Tareas
### T1: Copiar y cargar assets UI de pausa
- **Hacer:** Copiar (cp, nunca mv) `SpriteSheets/ui/fnt_wonder32_custom.png` y `SpriteSheets/ui/gun_icon.png` a `public/assets/ui/` (solo esos 2; `player_icon_idle.png` y el resto quedan fuera a propósito); en `PreloadScene.js` añadir cargas aditivas `pause-font` y `pause-cursor` con `this.load.image`, sin tocar el resto.
- **Archivos:** `public/assets/ui/fnt_wonder32_custom.png`, `public/assets/ui/gun_icon.png`, `src/scenes/PreloadScene.js`
- **Verify:** `pnpm build` pasa + `ls public/assets/ui/` muestra `life_unit.png` más solo los 2 copiados + `git status --stat` no toca `SpriteSheets/`.

### T2: Escena Pause + toggle ESC/P
- **Hacer:** Crear `src/scenes/PauseScene.js` (fondo semitransparente, título con `pause-font`, 5 opciones con `pause-cursor` como selector; Controles/Opciones muestran "Sin funcionalidad"); registrar `Pause` en `src/main.js`; en `PlayScene.js` bindear ESC/P a `pause('Play') + launch('Pause')` con toggle e ignorar el primer `pointerdown` de cierre para que NO dispare.
- **Archivos:** `src/scenes/PauseScene.js`, `src/main.js`, `src/scenes/PlayScene.js`
- **Verify:** `pnpm build` pasa + manual `pnpm dev`: ESC pausa y congela enemigos, menú muestra las 5 opciones con tipografía/iconos UI, Reanudar vuelve sin disparar, Reiniciar resetea el run, Salir vuelve a Boot, Controles/Opciones muestran "Sin funcionalidad".

## Desvíos aplicados (audit)
- T1: `fnt_wonder32_custom.png` NO se copió a `public/` ni se carga en `PreloadScene.js`. Es la tira del charset completo (1102x30 sin `.fnt`) y pintaba el abecedario sobre el menú al usarla con `add.image`. Solo se usa `pause-cursor` (`gun_icon.png`); el original queda intacto en `SpriteSheets/`.
- T2: sin `ignoreNextShot` en `PlayScene.js`. El clic de "Reanudar" pertenece al input de `Pause` y nunca llega a `Play` pausado, así que no había disparo fantasma que suprimir; el flag se comía el siguiente disparo intencional.
- T2: Reiniciar frena `Play` explícitamente (`stop('Pause') + stop('HUD') + stop('Play') + start('Play')`), simétrico a Salir, para no arrancar sobre una escena pausada.

## Done (validación final)
- [x] `pnpm build` pasa sin errores
- [x] Manual: ESC/P pausa y reanuda, cada opción hace lo descrito, el primer clic en Play tras reanudar SÍ dispara, originales en `SpriteSheets/` intactos
