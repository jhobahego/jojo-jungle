import Phaser from 'phaser';
import { createJohn, updateJohn } from '../player.js';
import {
  BULLET_RANGE,
  GRUNT_FIRE_DELAY,
  TURRET_FIRE_DELAY,
  createGrunt,
  updateGrunt,
  createTurret,
  gruntFire,
  turretFire,
  damageGrunt,
  damageTurret,
  isOnCameraPlusMargin,
} from '../enemies.js';

// T3: nivel jungla — suelo/plataformas estáticas (rectángulos temporales),
// parallax de 2 capas, John con Arcade + gravedad, cámara follow con lerp.
// T4: disparo de John, grunt + torreta, daño/muerte, caída al vacío y game over.
// T5: HUD lanzado en paralelo; vidas/score/ammo viven en registry.
const BULLET_MAX = 12;
export default class PlayScene extends Phaser.Scene {
  constructor() {
    super('Play');
  }

  init() {
    // Estado de run: se resetea aquí, no en el constructor.
    this.levelWidth = 960;
    this.levelHeight = 270;
    this.spawn = { x: 60, y: 200 };
    // T4: vidas y puntos del run (T5 los mostrará en el HUD).
    this.registry.set('hp', 3);
    this.registry.set('score', 0);
    // T5: ammo = balas disponibles del pool (se gasta al disparar,
    // se devuelve al reciclarse o impactar cada bala de John).
    this.registry.set('ammo', BULLET_MAX);
  }

  preload() {
    // Spritesheets para las anims (T2 cargó estos PNG como image con otras keys).
    this.load.spritesheet('john-idle-anim', 'assets/player/john_idle.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    this.load.spritesheet('john-run-anim', 'assets/player/john_run.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    this.load.spritesheet('john-jump-anim', 'assets/player/john_jump.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    this.load.spritesheet('john-crouch-anim', 'assets/player/john_crouch.png', {
      frameWidth: 26,
      frameHeight: 26,
    });
    // T4: balas y enemigos (reusan PNG ya copiados con keys propias).
    this.load.spritesheet('john-bullet', 'assets/player/weapon_bullet.png', {
      frameWidth: 8,
      frameHeight: 8,
    });
    this.load.spritesheet('enemy-bullet', 'assets/enemy/enemy_weapon_bullet.png', {
      frameWidth: 8,
      frameHeight: 8,
    });
    this.load.spritesheet('grunt-anim', 'assets/enemy/grunt_idle.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    this.load.spritesheet('turret-anim', 'assets/enemy/turret.png', {
      frameWidth: 18,
      frameHeight: 18,
    });
  }

  create() {
    this.physics.world.setBounds(0, 0, this.levelWidth, this.levelHeight);

    // Cielo: relleno sólido tras el parallax (las PNG jungla traen
    // transparencia arriba/abajo; sin esto se ve el fondo del canvas).
    // Color muestreado de background_color.png (#51a8ff).
    this.add.rectangle(240, 135, 480, 270, 0x51a8ff).setScrollFactor(0);

    // Parallax: fijos a cámara, se desplazan por tilePosition en update().
    this.bgFar = this.add
      .tileSprite(240, 135, 480, 270, 'jungle-bg1')
      .setScrollFactor(0);
    this.bgNear = this.add
      .tileSprite(240, 135, 480, 270, 'jungle-bg2')
      .setScrollFactor(0);

    // Suelo + plataformas: rectángulos temporales con body estático.
    // El suelo se parte en dos para dejar un foso mortal (x 600..680).
    this.platforms = this.physics.add.staticGroup();
    this.addPlatform(300, 255, 600, 30, 0x2d6a4f);
    this.addPlatform(820, 255, 280, 30, 0x2d6a4f);
    this.addPlatform(300, 190, 120, 16, 0x40916c);
    this.addPlatform(560, 150, 120, 16, 0x40916c);
    this.addPlatform(790, 190, 140, 16, 0x40916c);

    this.john = createJohn(this, this.spawn.x, this.spawn.y);
    // Sin world bounds abajo: el foso y los bordes caen al vacío (daño).
    this.john.setCollideWorldBounds(false);
    this.physics.add.collider(this.john, this.platforms);

    // T4: enemigos.
    this.grunt = createGrunt(this, 500, 200);
    this.physics.add.collider(this.grunt, this.platforms);
    this.turret = createTurret(this, 880, 231);

    // T4: balas con pool.
    this.bullets = this.physics.add.group({ maxSize: BULLET_MAX });
    this.enemyBullets = this.physics.add.group({ maxSize: 20 });

    // T4: overlaps (uno por pareja, solo en create).
    this.physics.add.overlap(this.bullets, this.grunt, (bullet, grunt) =>
      this.onJohnBulletVsGrunt(bullet, grunt),
    );
    this.physics.add.overlap(this.bullets, this.turret, (bullet, turret) =>
      this.onJohnBulletVsTurret(bullet, turret),
    );
    this.physics.add.overlap(this.enemyBullets, this.john, (john, bullet) =>
      this.onEnemyBulletVsJohn(john, bullet),
    );
    this.physics.add.overlap(this.john, this.grunt, (john, grunt) =>
      this.hitJohn(grunt.x),
    );
    this.physics.add.overlap(this.john, this.turret, (john, turret) =>
      this.hitJohn(turret.x),
    );

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,Z,X');
    // T4: disparo único con C o clic.
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.input.on('pointerdown', () => this.fireJohn());

    // T4: cadencia enemiga.
    this.grunt.setData(
      'fireTimer',
      this.time.addEvent({
        delay: GRUNT_FIRE_DELAY,
        loop: true,
        callback: () => gruntFire(this, this.enemyBullets, this.grunt, this.john),
      }),
    );
    this.turret.setData(
      'fireTimer',
      this.time.addEvent({
        delay: TURRET_FIRE_DELAY,
        loop: true,
        callback: () => turretFire(this, this.enemyBullets, this.turret, this.john),
      }),
    );

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.levelWidth, this.levelHeight);
    cam.startFollow(this.john, false, 0.08, 0.08);

    // T5: HUD en paralelo (launch, no start); se detiene al salir de Play
    // para no quedar flotando sobre GameOver.
    this.scene.launch('HUD');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop('HUD');
    });
  }

  addPlatform(x, y, w, h, color) {
    const rect = this.add.rectangle(x, y, w, h, color);
    this.physics.add.existing(rect, true);
    this.platforms.add(rect);
    return rect;
  }

  update() {
    updateJohn(this.john, { cursors: this.cursors, keys: this.keys });
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
      this.fireJohn();
    }
    updateGrunt(this.grunt);
    this.recycleBullets(this.bullets);
    this.recycleBullets(this.enemyBullets);
    // Caída al vacío = daño + respawn (o game over si no quedan vidas).
    if (this.john.active && this.john.y > this.levelHeight + 60) {
      this.damageJohn(null, true);
    }
    const scrollX = this.cameras.main.scrollX;
    this.bgFar.tilePositionX = scrollX * 0.3;
    this.bgNear.tilePositionX = scrollX * 0.6;
  }

  // T4: disparo de John (pool, una bala por pulsación).
  fireJohn() {
    if (!this.john.active) {
      return;
    }
    const dir = this.john.flipX ? -1 : 1;
    const x = this.john.x + dir * 14;
    const y = this.john.y - 2;
    const bullet = this.bullets.get(x, y, 'john-bullet', 0);
    if (!bullet) {
      return;
    }
    bullet.enableBody(true, x, y, true, true);
    bullet.setData('spawnX', x);
    bullet.setVelocityX(dir * 340);
    bullet.body.setAllowGravity(false);
    // T5: gastar ammo (el HUD escucha changedata-ammo).
    this.registry.set('ammo', this.registry.get('ammo') - 1);
  }

  killBullet(bullet) {
    bullet.disableBody(true, true);
  }

  // T5: devolver ammo al pool (solo balas de John).
  refundAmmo() {
    this.registry.set('ammo', this.registry.get('ammo') + 1);
  }

  // Los callbacks de overlap de Arcade reciben (sprite, hijo-del-grupo),
  // no en el orden de registro (probado con trazas): se resuelve cada rol
  // por pertenencia al pool en vez de asumir posiciones.
  resolveJohnBullet(a, b) {
    if (this.bullets.contains(a)) {
      return { bullet: a, victim: b };
    }
    return { bullet: b, victim: a };
  }

  onJohnBulletVsGrunt(a, b) {
    const { bullet, victim: grunt } = this.resolveJohnBullet(a, b);
    if (!bullet.active) {
      return;
    }
    // T2 (deuda combate): sin daño fuera de cámara; la bala se recicla con refund.
    if (!isOnCameraPlusMargin(this, bullet.x) || !isOnCameraPlusMargin(this, grunt.x)) {
      this.killBullet(bullet);
      this.refundAmmo();
      return;
    }
    this.killBullet(bullet);
    this.refundAmmo();
    damageGrunt(this, grunt);
  }

  onJohnBulletVsTurret(a, b) {
    const { bullet, victim: turret } = this.resolveJohnBullet(a, b);
    if (!bullet.active) {
      return;
    }
    // T2 (deuda combate): sin daño fuera de cámara; la bala se recicla con refund.
    if (!isOnCameraPlusMargin(this, bullet.x) || !isOnCameraPlusMargin(this, turret.x)) {
      this.killBullet(bullet);
      this.refundAmmo();
      return;
    }
    this.killBullet(bullet);
    this.refundAmmo();
    damageTurret(this, turret);
  }

  onEnemyBulletVsJohn(john, bullet) {
    if (!bullet.active || !john.active) {
      return;
    }
    // T2 (deuda combate): sin daño fuera de cámara; la bala se descarta sin hitJohn.
    if (!isOnCameraPlusMargin(this, bullet.x) || !isOnCameraPlusMargin(this, john.x)) {
      this.killBullet(bullet);
      return;
    }
    const sourceX = bullet.x;
    this.killBullet(bullet);
    this.hitJohn(sourceX);
  }

  // T4: John recibe un golpe (toque enemigo o bala): daño + knockback breve.
  hitJohn(sourceX) {
    if (!this.john.active || this.john.getData('invuln')) {
      return;
    }
    this.damageJohn(sourceX, false);
  }

  damageJohn(sourceX, respawn) {
    const hp = this.registry.get('hp') - 1;
    this.registry.set('hp', hp);
    if (hp <= 0) {
      this.scene.start('GameOver');
      return;
    }
    if (respawn) {
      this.john.setPosition(this.spawn.x, this.spawn.y);
      this.john.setVelocity(0, 0);
    } else if (sourceX !== null) {
      const dir = this.john.x >= sourceX ? 1 : -1;
      this.john.setVelocity(dir * 220, -180);
    }
    // Invulnerabilidad breve con parpadeo para no encadenar golpes.
    this.john.setData('invuln', true);
    this.tweens.killTweensOf(this.john);
    this.tweens.add({
      targets: this.john,
      alpha: 0.3,
      duration: 90,
      yoyo: true,
      repeat: 10,
    });
    this.time.delayedCall(1000, () => {
      if (this.john.active) {
        this.john.setData('invuln', false);
        this.john.setAlpha(1);
      }
    });
  }

  recycleBullets(group) {
    for (const bullet of group.getChildren()) {
      if (!bullet.active) {
        continue;
      }
      const spawnX = bullet.getData('spawnX');
      const outOfRange =
        typeof spawnX === 'number' && Math.abs(bullet.x - spawnX) > BULLET_RANGE;
      if (
        outOfRange ||
        bullet.x < -30 ||
        bullet.x > this.levelWidth + 30 ||
        bullet.y < -30 ||
        bullet.y > this.levelHeight + 90
      ) {
        this.killBullet(bullet);
        // T5: solo las balas de John devuelven ammo.
        if (group === this.bullets) {
          this.refundAmmo();
        }
      }
    }
  }
}
