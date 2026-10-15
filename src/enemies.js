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
  // T5 game-feel: la bala nace en la boca del arma (GRUNT_MUZZLE), no arriba.
  // fireEnemyBullet guarda este punto como spawnX/spawnY (BULLET_RANGE mide
  // distancia recorrida desde ahí). Sin tocar velocidad, rango ni torreta.
  fireEnemyBullet(
    scene,
    group,
    grunt.x + dir * GRUNT_MUZZLE.dx,
    grunt.y + GRUNT_MUZZLE.dy,
    dir,
    0,
    ENEMY_BULLET_SPEED,
  );
  // T4 sonidos: disparo grunt con el mismo rifle que John (volumen SFX 0.8).
  scene.sound.play('snd_rifle_shot', { volume: 0.8 });
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
  const frame = turret.getData('aimFrame') ?? 0;
  const vec = TURRET_FRAME_VECTORS[frame] || { x: -1, y: 0 };
  const speed = ENEMY_BULLET_SPEED - 10;
  fireEnemyBullet(
    scene,
    group,
    turret.x + vec.x * 12,
    turret.y + vec.y * 12,
    vec.x,
    vec.y,
    speed,
  );
  // T4 sonidos: disparo torreta con el mismo rifle que John (volumen SFX 0.8).
  scene.sound.play('snd_rifle_shot', { volume: 0.8 });
}

// Devuelve true si el enemigo murió con este impacto.
export function damageGrunt(scene, grunt) {
  if (!grunt.active || grunt.getData('dead')) {
    return false;
  }
  grunt.setData('dead', true);
  grunt.setData('shooting', false);
  const timer = grunt.getData('fireTimer');
  if (timer) {
    timer.remove();
  }
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
    // T2 game-feel: rota queda sólida y visible — body ON (staticSprite, sin
    // mover el cuerpo ni refreshBody), 'turret-broke' sin destroy.
    // Score +10 solo al romper (re-golpes retornan arriba por `dead`).
    if (turret.body) {
      turret.body.enable = true;
    }
    scene.registry.set('score', scene.registry.get('score') + 10);
    turret.play('turret-broke');
    // T4 sonidos: muerte de torreta (volumen SFX 0.8; el golpe no mortal sigue mudo).
    scene.sound.play('snd_explosion_ground', { volume: 0.8 });
    return true;
  }
  turret.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  scene.time.delayedCall(120, () => {
    if (turret.active && !turret.getData('dead')) {
      turret.clearTint();
    }
  });
  return false;
}
