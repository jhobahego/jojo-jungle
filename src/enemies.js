import Phaser from 'phaser';

// T4: grunt (patrulla + disparo simple) y torreta estática.
// La orquestación (grupos, overlaps, timers, score) vive en PlayScene.

export const GRUNT_SPEED = 40;
export const GRUNT_PATROL = { minX: 430, maxX: 570 };
export const GRUNT_FIRE_DELAY = 2200;
export const TURRET_FIRE_DELAY = 2600;
export const ENEMY_BULLET_SPEED = 160;
// Deuda combate MVP T1: alcance máximo de toda bala por distancia recorrida.
export const BULLET_RANGE = 200;
// Deuda combate MVP T2: gate de visión y agro para disparo y daño.
export const CAM_MARGIN = 48;
export const AGRO_RANGE = 200;
// T2 game-feel: zona muerta frontal del grunt (px). Si John cae dentro,
// o está a la espalda (signo distinto de `dir`), el grunt no dispara.
export const GRUNT_FRONT_DEADZONE = 4;
// T5 game-feel: boca del arma del grunt (offset en px desde grunt.x/grunt.y —
// centro del sprite — hasta la punta del cañón, medido solo lectura con PIL).
// `grunt_shoot.png` 52x22 (2f 26x22): frame 0 (pose de spawn, la bala sale
// sincronizada con el play) con cañón en filas y=14..15 y punta x=23.
// Punta (23,14.5) menos centro de frame (13,11) → dx=+10, dy=+3.5 → {dx:10,dy:4}.
// (Frame 1 baja el cañón a y=16 con la misma dx=10; se usa el frame 0 porque
// es lo visible al spawnear. Torreta no se toca: sigue `vec*12`.)
// Uso: x=grunt.x+dir*dx, y=grunt.y+dy. El fx de boca de T8 usa este punto;
// fireEnemyBullet ya lo guarda como spawnX/spawnY para BULLET_RANGE.
export const GRUNT_MUZZLE = { dx: 10, dy: 4 };
// T8 game-feel: anticipación de disparo del grunt (ms entre gates y salida de
// la bala desde GRUNT_MUZZLE). Desplaza la SALIDA de la bala, no el período
// (el fireTimer sigue cada 2200ms); la pose 'grunt-shoot' es el telegraph.
export const GRUNT_TELEGRAPH_MS = 200;
// T8 game-feel: pulso de telegraph de la torreta (ms antes de soltar la bala;
// desplaza la salida, no el período de 2600ms).
export const TURRET_TELEGRAPH_MS = 250;
// T8 game-feel: tint fijo del pulso — destello claro en la familia del propio
// metal de la torreta (paleta medida con PIL: cuerpo #42425a, brillo #87879f;
// #87879f aclarado ~35% → #b6b6d7). Como TintModes.FILL reemplaza el color de
// la textura (phaser.d.ts:128079), el llenado queda más claro que el cuerpo y
// lee como "cargando"; distinto del blanco FILL del golpe en damageTurret.
export const TURRET_TELEGRAPH_TINT = 0xb6b6d7;
// T9 game-feel: feedback de impacto en enemigos vivos (tint + hit-pause +
// stagger grunt). Duraciones fijas; el tint reinicia su timer sin acumular.
export const ENEMY_HIT_TINT_MS = 120;
export const HIT_PAUSE_MS = 60;
export const GRUNT_STAGGER_MS = 150;

export function isOnCameraPlusMargin(scene, x, margin = CAM_MARGIN) {
  const view = scene.cameras.main.worldView;
  return x >= view.x - margin && x <= view.right + margin;
}

export function ensureEnemyAnims(scene) {
  const anims = scene.anims;
  if (!anims.exists('grunt-run')) {
    anims.create({
      key: 'grunt-run',
      frames: anims.generateFrameNumbers('grunt-run-anim', { start: 0, end: 9 }),
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!anims.exists('grunt-shoot')) {
    anims.create({
      key: 'grunt-shoot',
      frames: anims.generateFrameNumbers('grunt-shoot-anim', { start: 0, end: 1 }),
      frameRate: 8,
      repeat: 0,
    });
  }
  if (!anims.exists('grunt-death')) {
    anims.create({
      key: 'grunt-death',
      frames: anims.generateFrameNumbers('grunt-death-anim', { start: 0, end: 11 }),
      frameRate: 12,
      repeat: 0,
    });
  }
  if (!anims.exists('turret-broke')) {
    anims.create({
      key: 'turret-broke',
      frames: anims.generateFrameNumbers('turret-broke-anim', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: 0,
    });
  }
}

export function createGrunt(scene, x, y) {
  ensureEnemyAnims(scene);
  const grunt = scene.physics.add.sprite(x, y, 'grunt-run-anim', 0);
  grunt.setCollideWorldBounds(true);
  grunt.body.setSize(20, 20);
  grunt.setData({
    hp: 1,
    dir: 1,
    minX: GRUNT_PATROL.minX,
    maxX: GRUNT_PATROL.maxX,
    fireTimer: null,
    dead: false,
    shooting: false,
  });
  grunt.setVelocityX(GRUNT_SPEED);
  grunt.play('grunt-run');
  return grunt;
}

export function updateGrunt(grunt) {
  if (!grunt.active || grunt.getData('dead')) {
    return;
  }
  if (grunt.getData('shooting')) {
    return;
  }
  let dir = grunt.getData('dir');
  if (grunt.x <= grunt.getData('minX')) {
    dir = 1;
  } else if (grunt.x >= grunt.getData('maxX')) {
    dir = -1;
  }
  grunt.setData('dir', dir);
  grunt.setVelocityX(dir * GRUNT_SPEED);
  grunt.setFlipX(dir < 0);
  grunt.play('grunt-run', true);
}

export const TURRET_FRAME_VECTORS = {
  0: { x: -1, y: 0 },
  1: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
  2: { x: 0, y: -1 },
  3: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  4: { x: 1, y: 0 },
  5: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  6: { x: 0, y: 1 },
  7: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
};

const SECTOR_TO_TURRET_FRAME = [4, 5, 6, 7, 0, 1, 2, 3];

export function createTurret(scene, x, y) {
  ensureEnemyAnims(scene);
  const turret = scene.physics.add.staticSprite(x, y, 'turret-anim', 0);
  turret.setData({ hp: 2, fireTimer: null, dead: false, aimFrame: 0 });
  return turret;
}

export function updateTurret(turret, john) {
  if (!turret.active || turret.getData('dead') || !john || !john.active) {
    return;
  }
  const angle = Phaser.Math.Angle.Between(turret.x, turret.y, john.x, john.y);
  const deg = (Phaser.Math.RadToDeg(angle) + 360) % 360;
  const sector = Math.round(deg / 45) % 8;
  const frame = SECTOR_TO_TURRET_FRAME[sector];
  turret.setFrame(frame);
  turret.setData('aimFrame', frame);
}

export function fireEnemyBullet(scene, group, x, y, dirX, dirY = 0, speed = ENEMY_BULLET_SPEED) {
  const bullet = group.get(x, y, 'enemy-bullet', 0);
  if (!bullet) {
    return;
  }
  bullet.enableBody(true, x, y, true, true);
  // T3 game-feel: reset visual + bala animada (punto de spawn lo fija T5).
  // Un pase sincronizado al vuelo enemigo (~1.25s a 6fps); el impacto corta.
  // Cabeza a la derecha en frame 0: flipX según signo horizontal (la
  // rotación completa en 8 dirs de torreta la pone T10).
  bullet.setRotation(0);
  bullet.setFlipX(dirX < 0);
  bullet.clearTint();
  bullet.setAlpha(1);
  bullet.setScale(1);
  if (scene.anims.exists('bullet-fly-enemy')) {
    // Sin `ignoreIfPlaying`: igual que en fireJohn, el pool reusa entradas
    // con la anim congelada; reinicio forzado a frame 0 en cada spawn.
    bullet.play('bullet-fly-enemy');
  }
  bullet.setData('spawnX', x);
  bullet.setData('spawnY', y);
  bullet.setVelocity(dirX * speed, dirY * speed);
  bullet.body.setAllowGravity(false);
}

export function gruntFire(scene, group, grunt, john) {
  if (!grunt.active || grunt.getData('dead') || grunt.getData('shooting')) {
    return;
  }
  if (!john || !john.active) {
    return;
  }
  if (!isOnCameraPlusMargin(scene, grunt.x) || !isOnCameraPlusMargin(scene, john.x)) {
    return;
  }
  if (Math.abs(john.x - grunt.x) > AGRO_RANGE) {
    return;
  }
  const dir = grunt.getData('dir');
  // T2 game-feel: visión frontal — zona muerta ±4px o a la espalda: no dispara,
  // no para patrulla, no suena. Cámara+margen y agro 200 se mantienen arriba.
  const dx = john.x - grunt.x;
  if (Math.abs(dx) <= GRUNT_FRONT_DEADZONE || Math.sign(dx) !== dir) {
    return;
  }
  grunt.setData('shooting', true);
  grunt.setVelocityX(0);
  grunt.play('grunt-shoot');
  // T8 game-feel: anticipación 200ms — la pose 'grunt-shoot' es el telegraph
  // (2f a 8fps ≈ 250ms, la bala sale a los 200ms) y LUEGO la bala nace en la
  // boca del arma (GRUNT_MUZZLE), no antes. Sonido con la bala, nunca con la
  // anticipación. El timer queda guardado en data para que damageGrunt lo
  // remueva al morir (matar en telegraph no deja bala fantasma); fireEnemyBullet
  // guarda este punto como spawnX/spawnY (BULLET_RANGE mide distancia
  // recorrida desde ahí). Sin tocar velocidad, rango ni torreta.
  // dir se captura en el `const dir` de arriba: durante shooting updateGrunt
  // no corre, así que no puede cambiar (el flip de borde de patrulla también
  // vive en updateGrunt).
  grunt.setData(
    'telegraphTimer',
    scene.time.delayedCall(GRUNT_TELEGRAPH_MS, () => {
      // Al soltar la bala re-validar: grunt activo/vivo y John vivo; si no,
      // cancela sin bala ni sonido (el retomar patrulla lo hace al terminar
      // 'grunt-shoot' el once de abajo).
      if (!grunt.active || grunt.getData('dead') || !john.active || john.getData('dead')) {
        return;
      }
      grunt.setData('telegraphTimer', null);
      fireEnemyBullet(
        scene,
        group,
        grunt.x + dir * GRUNT_MUZZLE.dx,
        grunt.y + GRUNT_MUZZLE.dy,
        dir,
        0,
        ENEMY_BULLET_SPEED,
      );
      // T4 sonidos: con la bala (mismo rifle que John, volumen SFX 0.8).
      scene.sound.play('snd_rifle_shot', { volume: 0.8 });
    }),
  );
  grunt.once('animationcomplete-grunt-shoot', () => {
    if (!grunt.active || grunt.getData('dead')) {
      return;
    }
    grunt.setData('shooting', false);
    const currentDir = grunt.getData('dir');
    grunt.setVelocityX(currentDir * GRUNT_SPEED);
    grunt.play('grunt-run', true);
  });
}

export function turretFire(scene, group, turret, john) {
  if (!turret.active || turret.getData('dead') || !john.active) {
    return;
  }
  if (!isOnCameraPlusMargin(scene, turret.x) || !isOnCameraPlusMargin(scene, john.x)) {
    return;
  }
  if (Math.abs(john.x - turret.x) > AGRO_RANGE) {
    return;
  }
  // T8 game-feel: telegraph — pulso de tint fijo (TURRET_TELEGRAPH_TINT) de
  // 250ms mientras `aimFrame` (que updateTurret pisa cada update) señala a
  // John ("hacia aimFrame"); al soltar la bala se limpia. Sonido con la
  // bala, no acá. El timer queda guardado para que damageTurret lo remueva
  // al morir.
  turret.setTint(TURRET_TELEGRAPH_TINT).setTintMode(Phaser.TintModes.FILL);
  turret.setData(
    'telegraphTimer',
    scene.time.delayedCall(TURRET_TELEGRAPH_MS, () => {
      // Al soltar la bala re-validar: torreta activa/viva y John vivo; si no,
      // cancela sin bala, sin fx ni sonido.
      if (!turret.active || turret.getData('dead') || !john.active || john.getData('dead')) {
        return;
      }
      turret.clearTint();
      turret.setData('telegraphTimer', null);
      // aimFrame se lee al soltar (updateTurret lo actualizó DURANTE los
      // 250ms): la bala sale hacia dónde quedó apuntando el cañón.
      const frame = turret.getData('aimFrame') ?? 0;
      const vec = TURRET_FRAME_VECTORS[frame] || { x: -1, y: 0 };
      const speed = ENEMY_BULLET_SPEED - 10;
      const mx = turret.x + vec.x * 12;
      const my = turret.y + vec.y * 12;
      fireEnemyBullet(scene, group, mx, my, vec.x, vec.y, speed);
      // T7 game-feel: boca de la torreta → ráfaga 'turret' (5) sesgada según
      // el disparo (vertical queda radial). Fx opcional, nunca rompe gameplay.
      try {
        if (typeof scene.emitFx === 'function') {
          scene.emitFx('turret', mx, my, Math.sign(vec.x));
        }
      } catch {
        // Fx opcional.
      }
      // T4 sonidos: con la bala (mismo rifle que John, volumen SFX 0.8).
      scene.sound.play('snd_rifle_shot', { volume: 0.8 });
    }),
  );
}

// Devuelve true si el enemigo murió con este impacto.
// T9 game-feel: helpers de feedback (tint + hit-pause + stagger). Solo actúan
// sobre enemigo activo y vivo; el tint reinicia su timer (sin acumular) y el
// hit-pause no reanuda si el enemigo murió durante la pausa.
function applyHitTint(scene, enemy) {
  if (!enemy.active || enemy.getData('dead')) {
    return;
  }
  const prev = enemy.getData('hitTintTimer');
  if (prev) {
    prev.remove();
  }
  enemy.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  enemy.setData(
    'hitTintTimer',
    scene.time.delayedCall(ENEMY_HIT_TINT_MS, () => {
      enemy.setData('hitTintTimer', null);
      if (enemy.active && !enemy.getData('dead')) {
        enemy.clearTint();
      }
    }),
  );
}

function applyHitPause(scene, enemy) {
  if (!enemy.active || enemy.getData('dead') || !enemy.anims) {
    return;
  }
  const prev = enemy.getData('hitPauseTimer');
  if (prev) {
    prev.remove();
  }
  enemy.anims.pause();
  enemy.setData(
    'hitPauseTimer',
    scene.time.delayedCall(HIT_PAUSE_MS, () => {
      enemy.setData('hitPauseTimer', null);
      if (enemy.active && !enemy.getData('dead') && enemy.anims) {
        enemy.anims.resume();
      }
    }),
  );
}

// T9 game-feel: stagger de grunt — frena 150ms y restaura la MISMA dir/velocidad
// (sin cambiar `dir`). Con HP 1 el grunt muere de 1 tiro, así que esto solo se
// vería si sobrevive al golpe; el caso real es la torreta viva.
function applyGruntStagger(scene, grunt) {
  if (!grunt.active || grunt.getData('dead')) {
    return;
  }
  const prev = grunt.getData('staggerTimer');
  if (prev) {
    prev.remove();
  }
  const dir = grunt.getData('dir');
  grunt.setVelocityX(0);
  grunt.setData(
    'staggerTimer',
    scene.time.delayedCall(GRUNT_STAGGER_MS, () => {
      grunt.setData('staggerTimer', null);
      if (!grunt.active || grunt.getData('dead')) {
        return;
      }
      grunt.setVelocityX(dir * GRUNT_SPEED);
    }),
  );
}

function clearHitFeedback(enemy) {
  const tintTimer = enemy.getData('hitTintTimer');
  if (tintTimer) {
    tintTimer.remove();
  }
  enemy.setData('hitTintTimer', null);
  const pauseTimer = enemy.getData('hitPauseTimer');
  if (pauseTimer) {
    pauseTimer.remove();
  }
  enemy.setData('hitPauseTimer', null);
  const staggerTimer = enemy.getData('staggerTimer');
  if (staggerTimer) {
    staggerTimer.remove();
  }
  enemy.setData('staggerTimer', null);
  if (enemy.anims) {
    enemy.anims.resume();
  }
  enemy.clearTint();
}

export function damageGrunt(scene, grunt) {
  if (!grunt.active || grunt.getData('dead')) {
    return false;
  }
  // T9 game-feel: con HP 1 el golpe es letal; si un futuro HP>1 sobrevive, el
  // feedback es tint 120ms + hit-pause 60ms + stagger 150ms sin cambiar `dir`.
  const hp = grunt.getData('hp') - 1;
  grunt.setData('hp', hp);
  if (hp > 0) {
    applyHitTint(scene, grunt);
    applyHitPause(scene, grunt);
    applyGruntStagger(scene, grunt);
    return false;
  }
  grunt.setData('dead', true);
  grunt.setData('shooting', false);
  const timer = grunt.getData('fireTimer');
  if (timer) {
    timer.remove();
  }
  // T8 game-feel: matar en anticipación corta el telegraph (sin bala
  // fantasma). El patrón de patrulla no se retoma: el grunt está muerto.
  const telegraph = grunt.getData('telegraphTimer');
  if (telegraph) {
    telegraph.remove();
  }
  grunt.setData('telegraphTimer', null);
  // T9 game-feel: con HP 1 el grunt muere de 1 tiro — el tint/hit-pause/stagger
  // solo se verían si sobrevive; se limpia cualquier feedback previo para no
  // manchar 'grunt-death' ni dejar timers huérfanos. La `dir` no se toca.
  clearHitFeedback(grunt);
  if (grunt.body) {
    grunt.body.enable = false;
    grunt.setVelocity(0, 0);
  }
  scene.registry.set('score', scene.registry.get('score') + 10);
  grunt.play('grunt-death');
  // T4 sonidos: muerte de grunt (volumen SFX 0.8).
  scene.sound.play('snd_explosion_ground', { volume: 0.8 });
  grunt.once('animationcomplete-grunt-death', () => {
    if (grunt.active) {
      grunt.destroy();
    }
  });
  return true;
}

export function damageTurret(scene, turret) {
  if (!turret.active || turret.getData('dead')) {
    return false;
  }
  const hp = turret.getData('hp') - 1;
  turret.setData('hp', hp);
  if (hp <= 0) {
    turret.setData('dead', true);
    const timer = turret.getData('fireTimer');
    if (timer) {
      timer.remove();
    }
    // T8 game-feel: matar durante el telegraph corta el pulso (sin bala
    // fantasma) y limpia el tint ámbar para no manchar `turret-broke`.
    const telegraph = turret.getData('telegraphTimer');
    if (telegraph) {
      telegraph.remove();
    }
    turret.setData('telegraphTimer', null);
    // T9 game-feel: limpia tint/hit-pause previos para no manchar
    // `turret-broke` ni dejar timers huérfanos (la rota no destella).
    clearHitFeedback(turret);
    // T2 game-feel: rota queda sólida y visible — body ON (staticSprite, sin
    // mover el cuerpo ni refreshBody), 'turret-broke' sin destroy.
    // Score +10 solo al romper (re-golpes retornan arriba por `dead`).
    if (turret.body) {
      turret.body.enable = true;
    }
    scene.registry.set('score', scene.registry.get('score') + 10);
    turret.play('turret-broke');
    // T7 game-feel: HP 0 → ráfaga 'explosion' (14) en el centro de la
    // torreta (el count vive en FX_PRESETS de PlayScene). Si la escena no
    // expone emitFx se omite sin excepción; nunca bloquea score/daño.
    try {
      if (typeof scene.emitFx === 'function') {
        scene.emitFx('explosion', turret.x, turret.y, 0);
      }
    } catch {
      // Fx opcional: un fallo de partículas nunca rompe el gameplay.
    }
    // T4 sonidos: muerte de torreta (volumen SFX 0.8; el golpe no mortal sigue mudo).
    scene.sound.play('snd_explosion_ground', { volume: 0.8 });
    return true;
  }
  // T9 game-feel: torreta viva golpeada — tint blanco 120ms (reinicia timer) +
  // hit-pause 60ms del sprite (sin reanudar si muere en la pausa).
  applyHitTint(scene, turret);
  applyHitPause(scene, turret);
  return false;
}
