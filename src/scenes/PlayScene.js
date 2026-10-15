import Phaser from 'phaser';
import { JOHN_FIRE_DELAY, JOHN_HIT_HOLD, JOHN_SHOOT_HOLD, RELOAD_DELAY, createJohn, updateJohn } from '../player.js';
import {
  BULLET_RANGE,
  GRUNT_FIRE_DELAY,
  TURRET_FIRE_DELAY,
  createGrunt,
  updateGrunt,
  createTurret,
  updateTurret,
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
// T3 game-feel: depth de fx de impacto (personajes 0/1, HUD en escena aparte).
export const FX_DEPTH = 10;
// T1 game-feel: desfase del clip de recarga respecto al último disparo (ms),
// para no solaparse con `snd_rifle_shot` y que se distinga.
const RELOAD_SFX_DELAY = 120;
// T4 game-feel: shake de daño a John (T15 lo centraliza en shakeCam).
export const HIT_SHAKE_MS = 120;
export const HIT_SHAKE_INTENSITY = 0.004;
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
    // T5: ammo = balas disponibles del cartucho (se gasta al disparar,
    // sin refund al impactar/expirar). T1 game-feel: cartucho == pool max
    // (BULLET_MAX es a la vez maxSize del grupo y capacidad del cartucho).
    this.registry.set('ammo', BULLET_MAX);
    // T1 game-feel: estado de cooldown + recarga (se publica en registry
    // para el HUD de T13).
    this.registry.set('reloading', false);
    this.reloading = false;
    this.lastShotAt = Number.NEGATIVE_INFINITY;
    this.reloadTimer = null;
    this.reloadSfxTimer = null;
    // T4 game-feel: flags de daño para el HUD de T13 (sin parpadeo).
    this.registry.set('invuln', false);
    this.registry.set('hitAt', 0);
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
    this.load.spritesheet(
      'john-stand-shoot-anim',
      'assets/player/john_stand_shooting.png',
      {
        frameWidth: 26,
        frameHeight: 22,
      },
    );
    this.load.spritesheet('john-run-shoot-anim', 'assets/player/john_run_shoot.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    this.load.spritesheet(
      'john-crouch-shoot-anim',
      'assets/player/john_crouch_shoot.png',
      {
        frameWidth: 26,
        frameHeight: 26,
      },
    );
    this.load.spritesheet('john-land-anim', 'assets/player/john_landing.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    this.load.spritesheet('john-hit-anim', 'assets/player/john_hithurt.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    // T3 animaciones-john: 'john-dead' usa john_defeated.png (10f 26x22) como
    // anim principal; john_dead.png (2f) queda copiado en public/ solo como
    // corpse final si la inspección visual lo pide (no se carga aquí).
    this.load.spritesheet('john-dead-anim', 'assets/player/john_defeated.png', {
      frameWidth: 26,
      frameHeight: 22,
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
    this.load.spritesheet('grunt-run-anim', 'assets/enemy/grunt_run.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    this.load.spritesheet('grunt-shoot-anim', 'assets/enemy/grunt_shoot.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    this.load.spritesheet('grunt-death-anim', 'assets/enemy/grunt_death.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    this.load.spritesheet('turret-anim', 'assets/enemy/turret.png', {
      frameWidth: 18,
      frameHeight: 18,
    });
    this.load.spritesheet('turret-broke-anim', 'assets/enemy/turret_broke.png', {
      frameWidth: 18,
      frameHeight: 18,
    });
    // T3 game-feel: bala animada (weapon_bullet 64x8 → 8f 8x8) e impacto
    // (bullet_impact 100x20 → 5f 20x20 provisional; T5 confirma el frame).
    this.load.spritesheet('bullet-fly-anim', 'assets/player/weapon_bullet.png', {
      frameWidth: 8,
      frameHeight: 8,
    });
    this.load.spritesheet('bullet-impact-anim', 'assets/fx/bullet_impact.png', {
      frameWidth: 20,
      frameHeight: 20,
    });
    // T4 game-feel: dust provisional pendiente de T5 (run 108x18 → 6f 18x18,
    // jump 204x10 → 6f 34x10; ambas divisiones exactas por 6).
    this.load.spritesheet('run-dust-anim', 'assets/fx/run_dust.png', {
      frameWidth: 18,
      frameHeight: 18,
    });
    this.load.spritesheet('jump-dust-anim', 'assets/fx/jump_dust.png', {
      frameWidth: 34,
      frameHeight: 10,
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
    // T2 game-feel: rota sólida y bajo John — collider físico (el daño va por
    // overlap con early-return si `dead`) y depth rota < John.
    this.john.setDepth(1);
    this.turret.setDepth(0);
    this.physics.add.collider(this.john, this.turret);

    // T4: balas con pool.
    this.bullets = this.physics.add.group({ maxSize: BULLET_MAX });
    this.enemyBullets = this.physics.add.group({ maxSize: 20 });

    // T3 game-feel: anims de bala e impacto (guarda anims.exists; si falta
    // la textura el fx se omite sin excepción en spawnBulletImpact).
    // Ajuste: un solo pase por vuelo (repeat 0) sincronizado a la duración
    // del vuelo — John 200px a 340px/s ≈ 588ms → 12fps; enemigas 200px a
    // 160/150px/s ≈ 1.25s → 6fps. play(key, true) al spawnear garantiza el
    // frame 0 y el impacto/reciclado corta la anim (no loopea nunca).
    if (!this.anims.exists('bullet-fly')) {
      this.anims.create({
        key: 'bullet-fly',
        frames: this.anims.generateFrameNumbers('bullet-fly-anim', { start: 0, end: 7 }),
        frameRate: 12,
        repeat: 0,
      });
    }
    if (!this.anims.exists('bullet-fly-enemy')) {
      this.anims.create({
        key: 'bullet-fly-enemy',
        frames: this.anims.generateFrameNumbers('bullet-fly-anim', { start: 0, end: 7 }),
        frameRate: 6,
        repeat: 0,
      });
    }
    if (!this.anims.exists('bullet-impact')) {
      this.anims.create({
        key: 'bullet-impact',
        frames: this.anims.generateFrameNumbers('bullet-impact-anim', { start: 0, end: 4 }),
        frameRate: 16,
        repeat: 0,
      });
    }
    // T4 game-feel: dust de correr/aterrizar (provisional; T5 confirma frames).
    // Guarda anims.exists: si falta la textura el fx se omite sin excepción.
    if (!this.anims.exists('run-dust')) {
      this.anims.create({
        key: 'run-dust',
        frames: this.anims.generateFrameNumbers('run-dust-anim', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      });
    }
    if (!this.anims.exists('jump-dust')) {
      this.anims.create({
        key: 'jump-dust',
        frames: this.anims.generateFrameNumbers('jump-dust-anim', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      });
    }

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
    this.physics.add.overlap(this.john, this.grunt, (john, grunt) => {
      if (grunt.getData('dead')) {
        return;
      }
      this.hitJohn(grunt.x);
    });
    this.physics.add.overlap(this.john, this.turret, (john, turret) => {
      if (turret.getData('dead')) {
        return;
      }
      this.hitJohn(turret.x);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,Z,X');
    // T1 game-feel: disparo en ráfaga con C o clic (izq./der.) mantenido.
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    // T1 game-feel: el botón derecho también dispara; se deshabilita el menú
    // contextual del canvas para que no estorbe (API verificada en v4.2.1).
    this.input.mouse.disableContextMenu();
    // T4: disparo único con C o clic. El clic de "Reanudar" es de la
    // escena Pause y nunca llega al input de Play pausado: sin flag.
    this.input.on('pointerdown', () => this.fireJohn());
    // Pausa con ESC/P: congela Play (su reloj pausa timers enemigos) y
    // abre Pause arriba; HUD queda congelado detrás. El toggle de vuelta
    // vive en Pause (la escena pausada no procesa input).
    this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    this.input.keyboard.on('keydown-P', () => this.pauseGame());

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

    // T2 sonidos: tema en loop una sola vez por run (guard anti-duplicado).
    if (!this.sound.isPlaying('snd_main_theme')) {
      this.sound.play('snd_main_theme', { loop: true, volume: 0.5 });
    }
  }

  addPlatform(x, y, w, h, color) {
    const rect = this.add.rectangle(x, y, w, h, color);
    this.physics.add.existing(rect, true);
    this.platforms.add(rect);
    return rect;
  }

  // Pausa (spec escenario-pausa T2): pause congela update + timers del
  // reloj propio (cadencia enemiga); launch abre Pause en paralelo arriba.
  pauseGame() {
    if (this.scene.isPaused('Play') || this.scene.isActive('Pause')) {
      return;
    }
    this.scene.pause('Play');
    this.scene.launch('Pause');
  }

  update() {
    updateJohn(this.john, { cursors: this.cursors, keys: this.keys, now: this.time.now });
    // T1 game-feel: ráfaga mientras C o el puntero están presionados; el
    // cooldown de fireJohn regula la cadencia (una pulsación suelta dispara una vez).
    // La escena pausada no corre update, así que el clic de "Reanudar" no dispara.
    {
      const pointer = this.input.activePointer;
      if (this.fireKey.isDown || pointer.isDown || pointer.rightButtonDown()) {
        this.fireJohn();
      }
    }
    updateGrunt(this.grunt);
    updateTurret(this.turret, this.john);
    this.recycleBullets(this.bullets);
    this.recycleBullets(this.enemyBullets);
    // Caída al vacío = daño + respawn (o game over si no quedan vidas).
    // T3: durante muerte no hay doble daño (respawn por foso sigue directo).
    if (this.john.active && !this.john.getData('dead') && this.john.y > this.levelHeight + 60) {
      this.damageJohn(null, true);
    }
    const scrollX = this.cameras.main.scrollX;
    this.bgFar.tilePositionX = scrollX * 0.3;
    this.bgNear.tilePositionX = scrollX * 0.6;
  }

  // T4: disparo de John (pool, una bala por pulsación).
  // T1 game-feel: orden estricto (1) cooldown 150ms / reloading → ignora
  // silencioso sin tocar lastShotAt; (2) pool.get null → aborta sin gastar
  // ammo ni cooldown; (3) gasta 1, fija lastShotAt, spawnea (punto exacto y
  // 'bullet-fly' los ponen T18/T3). Al vaciar inicia recarga 900ms con un
  // solo snd_reload_clip desfasado 120ms del último disparo.
  fireJohn() {
    // T3 animaciones-john: muerto ignora input (no dispara ni re-anima).
    if (!this.john.active || this.john.getData('dead')) {
      return;
    }
    // (1) Recargando o en cooldown: ignora (intentos en recarga silenciosos,
    // resto sin sonido ni bala, sin tocar lastShotAt).
    if (this.reloading) {
      return;
    }
    const now = this.time.now;
    if (now - this.lastShotAt < JOHN_FIRE_DELAY) {
      return;
    }
    const dir = this.john.flipX ? -1 : 1;
    const x = this.john.x + dir * 14;
    const y = this.john.y - 2;
    // (2) Pool agotado: aborta sin gastar ammo ni cooldown.
    const bullet = this.bullets.get(x, y, 'john-bullet', 0);
    if (!bullet) {
      return;
    }
    // (3) Spawn + gasto.
    bullet.enableBody(true, x, y, true, true);
    // T3 game-feel: reset visual (punto de spawn exacto lo fija T18; acá solo animar).
    // El frame 0 tiene la cabeza a la derecha: flipX espeja al disparar a la
    // izquierda para que la punta mire el sentido del vuelo.
    bullet.setRotation(0);
    bullet.setFlipX(dir < 0);
    bullet.clearTint();
    bullet.setAlpha(1);
    bullet.setScale(1);
    if (this.anims.exists('bullet-fly')) {
      // Sin `ignoreIfPlaying`: el pool reusa balas con la anim congelada en
      // el frame de muerte (casi siempre el 7, vacío); hay que reiniciar
      // siempre para garantizar frame 0 en cada spawn.
      bullet.play('bullet-fly');
    }
    bullet.setData('spawnX', x);
    bullet.setVelocityX(dir * 340);
    bullet.body.setAllowGravity(false);
    this.lastShotAt = now;
    // T3 sonidos: disparo de John (volumen SFX 0.8).
    this.sound.play('snd_rifle_shot', { volume: 0.8 });
    // T1 animaciones-john: feedback visual de disparo (no toca bala/spawn/ammo).
    // El hold evita que updateJohn lo pise con idle/run al frame siguiente.
    // T2: agachado usa 'john-crouch-shoot' sin levantarse ni cambiar hitbox.
    this.john.setData('shootUntil', this.time.now + JOHN_SHOOT_HOLD);
    if (this.john.getData('crouching')) {
      this.john.play('john-crouch-shoot', true);
    } else if (this.john.body.velocity.x !== 0) {
      this.john.play('john-run-shoot', true);
    } else {
      this.john.play('john-stand-shoot', true);
    }
    // T1 game-feel: gastar 1 ammo (el HUD escucha changedata-ammo); al
    // vaciar (no al reintentar) inicia recarga 900ms con un solo clip
    // desfasado 120ms para no solaparse con el último disparo (reloj de
    // Play: se congela en pausa; T16 cancela los handles en restart).
    const ammo = this.registry.get('ammo') - 1;
    this.registry.set('ammo', ammo);
    if (ammo <= 0) {
      this.reloading = true;
      this.registry.set('reloading', true);
      this.reloadSfxTimer = this.time.delayedCall(RELOAD_SFX_DELAY, () => {
        this.sound.play('snd_reload_clip', { volume: 0.8 });
        this.reloadSfxTimer = null;
      });
      this.reloadTimer = this.time.delayedCall(RELOAD_DELAY, () => {
        this.registry.set('ammo', BULLET_MAX);
        this.reloading = false;
        this.registry.set('reloading', false);
        this.reloadTimer = null;
      });
    }
  }

  killBullet(bullet) {
    bullet.disableBody(true, true);
  }

  // T3 game-feel: fx de impacto en el centro del body, autodestruible con
  // once(animationcomplete → destroy). Si falta la anim se omite sin excepción.
  spawnBulletImpact(x, y) {
    if (!this.anims.exists('bullet-impact')) {
      return;
    }
    const fx = this.add.sprite(x, y, 'bullet-impact-anim', 0);
    fx.setDepth(FX_DEPTH);
    fx.play('bullet-impact');
    fx.once('animationcomplete-bullet-impact', () => {
      fx.destroy();
    });
  }

  // T4 game-feel: dust a pies, autodestruible (una instancia por llamada;
  // el flanco lo regula player.js: aterrizaje real y pasos ≥250ms).
  // Origen abajo-centro: (x, y) es el punto de pies sobre el suelo, así el
  // puff apoya encima del piso en vez de hundirse (antes: centro en y+10).
  // flipX espeja según el facing de John. Si falta la anim se omite.
  spawnDust(kind, x, y, flipX = false) {
    const key = kind === 'jump' ? 'jump-dust' : 'run-dust';
    const tex = kind === 'jump' ? 'jump-dust-anim' : 'run-dust-anim';
    if (!this.anims.exists(key)) {
      return null;
    }
    const fx = this.add.sprite(x, y, tex, 0);
    fx.setOrigin(0.5, 1);
    fx.setFlipX(!!flipX);
    fx.setDepth(FX_DEPTH);
    fx.play(key);
    fx.once(`animationcomplete-${key}`, () => {
      fx.destroy();
    });
    return fx;
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
    if (!bullet.active || grunt.getData('dead')) {
      return;
    }
    // T2 (deuda combate): sin daño fuera de cámara; la bala se recicla
    // sin refund (T1 game-feel: el cartucho no devuelve ammo).
    if (!isOnCameraPlusMargin(this, bullet.x) || !isOnCameraPlusMargin(this, grunt.x)) {
      this.killBullet(bullet);
      return;
    }
    this.spawnBulletImpact(bullet.x, bullet.y);
    this.killBullet(bullet);
    damageGrunt(this, grunt);
  }

  onJohnBulletVsTurret(a, b) {
    const { bullet, victim: turret } = this.resolveJohnBullet(a, b);
    if (!bullet.active) {
      return;
    }
    // T2 game-feel: la rota absorbe balas sin score/daño/re-golpe ni tint
    // (el fx lo pone T3).
    if (turret.getData('dead')) {
      this.spawnBulletImpact(bullet.x, bullet.y);
      this.killBullet(bullet);
      return;
    }
    // T2 (deuda combate): sin daño fuera de cámara; la bala se recicla
    // sin refund (T1 game-feel: el cartucho no devuelve ammo).
    if (!isOnCameraPlusMargin(this, bullet.x) || !isOnCameraPlusMargin(this, turret.x)) {
      this.killBullet(bullet);
      return;
    }
    this.spawnBulletImpact(bullet.x, bullet.y);
    this.killBullet(bullet);
    damageTurret(this, turret);
  }

  onEnemyBulletVsJohn(john, bullet) {
    if (!bullet.active || !john.active || john.getData('dead')) {
      return;
    }
    // T2 (deuda combate): sin daño fuera de cámara; la bala se descarta sin hitJohn.
    if (!isOnCameraPlusMargin(this, bullet.x) || !isOnCameraPlusMargin(this, john.x)) {
      this.killBullet(bullet);
      return;
    }
    const sourceX = bullet.x;
    this.spawnBulletImpact(bullet.x, bullet.y);
    this.killBullet(bullet);
    this.hitJohn(sourceX);
  }

  // T4 game-feel: John recibe un golpe (toque enemigo o bala): solo animación
  // + shake, sin knockback ni parpadeo. El overlap ya es por bodies.
  hitJohn(sourceX) {
    // T3: sin doble daño durante muerte (guards active/dead/invuln vigentes).
    if (!this.john.active || this.john.getData('dead') || this.john.getData('invuln')) {
      return;
    }
    this.damageJohn(sourceX, false);
  }

  damageJohn(sourceX, respawn) {
    // T3: sin doble daño durante muerte; la rama mortal no crea timers.
    if (!this.john.active || this.john.getData('dead')) {
      return;
    }
    const hp = this.registry.get('hp') - 1;
    this.registry.set('hp', hp);
    // T3 sonidos: daño a John (volumen SFX 0.8; cubre hitJohn y caída al vacío).
    this.sound.play('snd_hurt', { volume: 0.8 });
    if (hp <= 0) {
      // T2 sonidos: cortar el tema al morir (GameOver pone los tambores).
      this.sound.stopByKey('snd_main_theme');
      // T3 animaciones-john: muerte animada (hitbox BODY_STAND vigente).
      // Igual que damageGrunt: body off inmediato + once(animationcomplete).
      this.john.setData('dead', true);
      this.tweens.killTweensOf(this.john);
      this.john.setAlpha(1);
      if (this.john.body) {
        this.john.body.enable = false;
        this.john.setVelocity(0, 0);
      }
      this.john.play('john-dead');
      this.john.once('animationcomplete-john-dead', () => {
        this.scene.start('GameOver');
      });
      return;
    }
    if (respawn) {
      // Caída al vacío con vidas: respawn directo sin anim de muerte, igual que hoy.
      // Se limpian los holds para no estampar poses viejas tras el teleport.
      this.john.setData('shootUntil', 0);
      this.john.setData('landUntil', 0);
      this.john.setData('hitUntil', 0);
      this.john.setPosition(this.spawn.x, this.spawn.y);
      this.john.setVelocity(0, 0);
    } else if (sourceX !== null) {
      // T4 game-feel: SIN knockback (conserva trayectoria en salto) ni bypass
      // por crouching: el overlap ya es por bodies. Solo anim + shake.
      // El hold evita que updateJohn lo pise con idle/run/jump al frame siguiente.
      this.john.setData('hitUntil', this.time.now + JOHN_HIT_HOLD);
      this.john.play('john-hit', true);
      // T4: shake directo (T15 lo centraliza en shakeCam). Forzado para que
      // se vea siempre (firma verificada en v4.2.1: shake(duration, intensity, force)).
      this.cameras.main.shake(HIT_SHAKE_MS, HIT_SHAKE_INTENSITY, true);
    }
    // T4 game-feel: invulnerabilidad 1000ms SIN parpadeo (alpha fijo en 1);
    // se publica en registry para el HUD de T13.
    this.john.setData('invuln', true);
    this.john.setAlpha(1);
    this.registry.set('invuln', true);
    this.registry.set('hitAt', this.time.now);
    this.time.delayedCall(1000, () => {
      if (this.john.active) {
        this.john.setData('invuln', false);
        this.john.setAlpha(1);
      }
      this.registry.set('invuln', false);
    });
  }

  recycleBullets(group) {
    for (const bullet of group.getChildren()) {
      if (!bullet.active) {
        continue;
      }
      const spawnX = bullet.getData('spawnX');
      const spawnY = bullet.getData('spawnY');
      const outOfRange =
        typeof spawnX === 'number' &&
        (typeof spawnY === 'number'
          ? Math.hypot(bullet.x - spawnX, bullet.y - spawnY) > BULLET_RANGE
          : Math.abs(bullet.x - spawnX) > BULLET_RANGE);
      if (
        outOfRange ||
        bullet.x < -30 ||
        bullet.x > this.levelWidth + 30 ||
        bullet.y < -30 ||
        bullet.y > this.levelHeight + 90
      ) {
        // T1 game-feel: expirar por rango no devuelve ammo (solo killBullet).
        this.killBullet(bullet);
      }
    }
  }
}
