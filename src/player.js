import Phaser from 'phaser';

// T3: John — correr, saltar, agachar. Movimiento siempre por body (setVelocity),
// salto solo con body.blocked.down. Disparo queda para T4.

export const JOHN_SPEED = 120;
export const JOHN_JUMP = 280;
// T1 animaciones-john: ms que la pose de disparo sobrevive a idle/run.
export const JOHN_SHOOT_HOLD = 250;
// T3 animaciones-john: ms que la pose de golpe sobrevive a idle/run/jump.
// john-hit son 2f a 8fps ≈ 250ms, igual que el hold de disparo.
export const JOHN_HIT_HOLD = 250;

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
      // Solo el frame 1 (agachado): el frame 0 es pose de pie y en loop
      // generaba el ciclo parado/agachado. Pose estática, sin loop.
      frames: anims.generateFrameNumbers('john-crouch-anim', { start: 1, end: 1 }),
      frameRate: 4,
      repeat: 0,
    });
  }
  if (!anims.exists('john-stand-shoot')) {
    anims.create({
      key: 'john-stand-shoot',
      frames: anims.generateFrameNumbers('john-stand-shoot-anim', { start: 0, end: 1 }),
      frameRate: 8,
      repeat: 0,
    });
  }
  if (!anims.exists('john-run-shoot')) {
    anims.create({
      key: 'john-run-shoot',
      frames: anims.generateFrameNumbers('john-run-shoot-anim', { start: 0, end: 9 }),
      frameRate: 10,
      repeat: -1,
    });
  }
  if (!anims.exists('john-crouch-shoot')) {
    anims.create({
      key: 'john-crouch-shoot',
      frames: anims.generateFrameNumbers('john-crouch-shoot-anim', { start: 0, end: 1 }),
      frameRate: 8,
      repeat: 0,
    });
  }
  if (!anims.exists('john-land')) {
    anims.create({
      key: 'john-land',
      frames: anims.generateFrameNumbers('john-land-anim', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: 0,
    });
  }
  if (!anims.exists('john-hit')) {
    anims.create({
      key: 'john-hit',
      frames: anims.generateFrameNumbers('john-hit-anim', { start: 0, end: 1 }),
      frameRate: 8,
      repeat: 0,
    });
  }
  if (!anims.exists('john-dead')) {
    anims.create({
      key: 'john-dead',
      frames: anims.generateFrameNumbers('john-dead-anim', { start: 0, end: 9 }),
      frameRate: 10,
      repeat: 0,
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
  player.setData('wasGrounded', true);
  return player;
}

export function updateJohn(player, input) {
  // T3 animaciones-john: muerto ignora input para no pisar 'john-dead'.
  if (!player.active || player.getData('dead')) {
    return;
  }
  const { cursors, keys, now } = input;
  // T2 controles-movimiento: reserva de apuntado arriba, sin efecto visible.
  player.setData('aimUp', cursors.up.isDown || keys.W.isDown);
  const body = player.body;
  const realGround = body.blocked.down;
  const t = now ?? 0;
  // Ventana de hold: mientras esté vigente, idle/run no pisan la pose
  // de disparo (play() detiene la anim actual al frame siguiente).
  const shooting = t < (player.getData('shootUntil') ?? 0);
  // T3: mismo hold para el golpe — sin esto, knockback + idle/run/jump
  // pisan 'john-hit' al frame siguiente y el feedback dura ~16ms.
  // Prioridad: hit > shoot > land > idle/run.
  const hitting = t < (player.getData('hitUntil') ?? 0);

  // Agachado por hold (S/↓): el toggle se descartó — el hold nunca
  // estuvo roto (el ciclo era el frame 0 de pie dentro del loop de crouch).
  const crouchHeld = cursors.down.isDown || keys.S.isDown;
  const leftHeld = cursors.left.isDown || keys.A.isDown;
  const rightHeld = cursors.right.isDown || keys.D.isDown;

  // T3 animaciones-john: agachado con histéresis — una vez agachado y con
  // la tecla held, se mantiene aunque blocked.down parpadee varios frames
  // (los gaps reseteaban la hitbox stand↔crouch y generaban el flicker).
  // Solo se sale soltando la tecla o con impulso real hacia arriba
  // (knockback de T3 / salto, velocity.y < -50).
  const keepCrouch =
    player.getData('crouching') && crouchHeld && body.velocity.y >= -50;
  const onGround = realGround || keepCrouch;

  // T2: flanco aire→suelo para 'john-land' (3f, no loop, no bloquea input).
  // Usa contacto real (no el suelo efectivo) para no re-disparar landUntil.
  const prevGrounded = player.getData('wasGrounded');
  const justLanded = prevGrounded === false && realGround;
  player.setData('wasGrounded', realGround);
  if (justLanded) {
    // 3f a 10fps ≈ 300ms: la pose sobrevive a idle/run como el hold de disparo.
    player.setData('landUntil', t + 300);
    // T3 sonidos: aterrizaje en el flanco aire→suelo (volumen SFX 0.8).
    player.scene.sound.play('snd_landing', { volume: 0.8 });
  }
  const landing = t < (player.getData('landUntil') ?? 0);

  const jumpPressed =
    Phaser.Input.Keyboard.JustDown(keys.X) ||
    Phaser.Input.Keyboard.JustDown(keys.SPACE);

  // Agachado: quieto en el sitio, hitbox baja.
  if (onGround && crouchHeld) {
    if (!player.getData('crouching')) {
      player.setData('crouching', true);
      setBody(player, BODY_CROUCH);
    }
    body.setVelocityX(0);
    // T2 (hold de disparo) + T3 (hold de golpe): sin estos guards la rama
    // agachada pisa la pose al frame siguiente.
    if (hitting) {
      player.play('john-hit', true);
    } else if (shooting) {
      player.play('john-crouch-shoot', true);
    } else {
      player.play('john-crouch', true);
    }
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
    // T3 sonidos: salto (volumen SFX 0.8).
    player.scene.sound.play('snd_jump', { volume: 0.8 });
  } else if (onGround) {
    if (hitting) {
      player.play('john-hit', true);
    } else if (shooting) {
      player.play(leftHeld !== rightHeld ? 'john-run-shoot' : 'john-stand-shoot', true);
    } else if (landing) {
      player.play('john-land', true);
    } else if (leftHeld !== rightHeld) {
      player.play('john-run', true);
    } else {
      player.play('john-idle', true);
    }
    // T3 sonidos: pasos alternados con cadencia ≥250ms solo corriendo en suelo
    // (gate de cadencia, no por frame; estado físico, no la anim en curso).
    if (leftHeld !== rightHeld) {
      const lastStep = player.getData('lastStepAt') ?? -1000;
      if (t - lastStep >= 250) {
        const next = player.getData('stepAlt') === 1 ? 2 : 1;
        player.setData('stepAlt', next);
        player.setData('lastStepAt', t);
        player.scene.sound.play(`snd_step${next}`, { volume: 0.8 });
      }
    }
  } else if (hitting) {
    player.play('john-hit', true);
  } else {
    player.play('john-jump', true);
  }
}
