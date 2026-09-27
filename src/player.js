import Phaser from 'phaser';

// T3: John — correr, saltar, agachar. Movimiento siempre por body (setVelocity),
// salto solo con body.blocked.down. Disparo queda para T4.

export const JOHN_SPEED = 120;
export const JOHN_JUMP = 280;

// Hitboxes en coords de frame: de pie frame 26x22, agachado frame 26x26.
const BODY_STAND = { w: 18, h: 20, ox: 4, oy: 2 };
const BODY_CROUCH = { w: 18, h: 14, ox: 4, oy: 12 };

function ensureAnims(scene) {
  const anims = scene.anims;
  if (!anims.exists('john-idle')) {
    anims.create({
      key: 'john-idle',
      frames: anims.generateFrameNumbers('john-idle-anim', { start: 0, end: 4 }),
      frameRate: 6,
      repeat: -1,
    });
  }
  if (!anims.exists('john-run')) {
    anims.create({
      key: 'john-run',
      frames: anims.generateFrameNumbers('john-run-anim', { start: 0, end: 9 }),
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!anims.exists('john-jump')) {
    anims.create({
      key: 'john-jump',
      frames: anims.generateFrameNumbers('john-jump-anim', { start: 0, end: 8 }),
      frameRate: 12,
      repeat: 0,
    });
  }
  if (!anims.exists('john-crouch')) {
    anims.create({
      key: 'john-crouch',
      frames: anims.generateFrameNumbers('john-crouch-anim', { start: 0, end: 1 }),
      frameRate: 4,
      repeat: -1,
    });
  }
}

function setBody(player, preset) {
  player.body.setSize(preset.w, preset.h);
  player.body.setOffset(preset.ox, preset.oy);
}

export function createJohn(scene, x, y) {
  ensureAnims(scene);
  const player = scene.physics.add.sprite(x, y, 'john-idle-anim', 0);
  player.setCollideWorldBounds(true);
  setBody(player, BODY_STAND);
  player.play('john-idle');
  player.setData('crouching', false);
  return player;
}

export function updateJohn(player, input) {
  const { cursors, keys } = input;
  const body = player.body;
  const onGround = body.blocked.down;

  const crouchHeld = cursors.down.isDown || keys.S.isDown || keys.X.isDown;
  const leftHeld = cursors.left.isDown || keys.A.isDown;
  const rightHeld = cursors.right.isDown || keys.D.isDown;
  const jumpPressed =
    Phaser.Input.Keyboard.JustDown(cursors.up) ||
    Phaser.Input.Keyboard.JustDown(keys.W) ||
    Phaser.Input.Keyboard.JustDown(keys.SPACE) ||
    Phaser.Input.Keyboard.JustDown(keys.Z);

  // Agachado: quieto en el sitio, hitbox baja.
  if (onGround && crouchHeld) {
    if (!player.getData('crouching')) {
      player.setData('crouching', true);
      setBody(player, BODY_CROUCH);
    }
    body.setVelocityX(0);
    player.play('john-crouch', true);
    return;
  }
  if (player.getData('crouching')) {
    player.setData('crouching', false);
    setBody(player, BODY_STAND);
  }

  if (leftHeld && !rightHeld) {
    body.setVelocityX(-JOHN_SPEED);
    player.setFlipX(true);
  } else if (rightHeld && !leftHeld) {
    body.setVelocityX(JOHN_SPEED);
    player.setFlipX(false);
  } else {
    body.setVelocityX(0);
  }

  if (jumpPressed && onGround) {
    body.setVelocityY(-JOHN_JUMP);
    player.play('john-jump', true);
  } else if (onGround) {
    if (leftHeld !== rightHeld) {
      player.play('john-run', true);
    } else {
      player.play('john-idle', true);
    }
  } else {
    player.play('john-jump', true);
  }
}
