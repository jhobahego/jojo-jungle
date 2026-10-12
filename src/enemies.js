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
  grunt.setData('shooting', true);
  grunt.setVelocityX(0);
  grunt.play('grunt-shoot');
  fireEnemyBullet(scene, group, grunt.x + dir * 12, grunt.y, dir, 0, ENEMY_BULLET_SPEED);
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
    if (turret.body) {
      turret.body.enable = false;
    }
    scene.registry.set('score', scene.registry.get('score') + 10);
    turret.play('turret-broke');
    turret.once('animationcomplete-turret-broke', () => {
      if (turret.active) {
        turret.destroy();
      }
    });
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
