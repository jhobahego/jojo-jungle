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

export function createGrunt(scene, x, y) {
  const grunt = scene.physics.add.sprite(x, y, 'grunt-anim', 0);
  grunt.setCollideWorldBounds(true);
  grunt.body.setSize(20, 20);
  grunt.setData({
    hp: 1,
    dir: 1,
    minX: GRUNT_PATROL.minX,
    maxX: GRUNT_PATROL.maxX,
    fireTimer: null,
    dead: false,
  });
  grunt.setVelocityX(GRUNT_SPEED);
  return grunt;
}

export function updateGrunt(grunt) {
  if (!grunt.active || grunt.getData('dead')) {
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
}

export function createTurret(scene, x, y) {
  const turret = scene.physics.add.staticImage(x, y, 'turret-anim', 0);
  turret.setData({ hp: 2, fireTimer: null, dead: false });
  return turret;
}

export function fireEnemyBullet(scene, group, x, y, dirX, speed) {
  const bullet = group.get(x, y, 'enemy-bullet', 0);
  if (!bullet) {
    return;
  }
  bullet.enableBody(true, x, y, true, true);
  bullet.setData('spawnX', x);
  bullet.setVelocity(dirX * speed, 0);
  bullet.body.setAllowGravity(false);
}

export function gruntFire(scene, group, grunt, john) {
  if (!grunt.active || grunt.getData('dead')) {
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
  fireEnemyBullet(scene, group, grunt.x + dir * 12, grunt.y, dir, ENEMY_BULLET_SPEED);
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
  const dx = john.x - turret.x;
  // T3 (deuda combate): la tira trae 8 ángulos de cañón (verificado en
  // SpriteSheets/enemy/turret.png: 0 = izquierda, 1 = arriba-izq, 2 = arriba,
  // 3 = arriba-der, 4 = derecha, 5 = abajo-der, 6 = abajo, 7 = abajo-izq).
  // El juego dispara en horizontal, así que se elige frame por el signo de
  // dx (setFrame en vez de flipX para respetar el arte original); frame 0
  // (izquierda) por defecto cuando dx <= 0.
  turret.setFrame(dx > 0 ? 4 : 0);
  const dir = dx === 0 ? 1 : Math.sign(dx);
  fireEnemyBullet(scene, group, turret.x + dir * 12, turret.y, dir, ENEMY_BULLET_SPEED - 10);
}

// Devuelve true si el enemigo murió con este impacto.
export function damageGrunt(scene, grunt) {
  if (!grunt.active || grunt.getData('dead')) {
    return false;
  }
  grunt.setData('dead', true);
  const timer = grunt.getData('fireTimer');
  if (timer) {
    timer.remove();
  }
  grunt.destroy();
  scene.registry.set('score', scene.registry.get('score') + 10);
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
    turret.destroy();
    scene.registry.set('score', scene.registry.get('score') + 10);
    return true;
  }
  turret.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
  scene.time.delayedCall(120, () => {
    if (turret.active) {
      turret.clearTint();
    }
  });
  return false;
}
