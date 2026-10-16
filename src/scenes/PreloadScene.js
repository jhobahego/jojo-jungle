import Phaser from 'phaser';

// T2: carga solo lo MVP con barra vía progress/complete y rama de error con reintento.
const MVP_ASSETS = [
  ['john-idle', 'assets/player/john_idle.png'],
  ['john-run', 'assets/player/john_run.png'],
  ['john-jump', 'assets/player/john_jump.png'],
  ['john-crouch', 'assets/player/john_crouch.png'],
  ['john-shoot', 'assets/player/john_stand_shooting.png'],
  ['john-run-shoot', 'assets/player/john_run_shoot.png'],
  ['john-crouch-shoot', 'assets/player/john_crouch_shoot.png'],
  ['john-land', 'assets/player/john_landing.png'],
  ['john-hit', 'assets/player/john_hithurt.png'],
  ['john-dead', 'assets/player/john_defeated.png'],
  ['john-static', 'assets/player/john_static.png'],
  ['grunt-idle', 'assets/enemy/grunt_idle.png'],
  ['grunt-run', 'assets/enemy/grunt_run.png'],
  ['grunt-shoot', 'assets/enemy/grunt_shoot.png'],
  ['grunt-death', 'assets/enemy/grunt_death.png'],
  ['turret', 'assets/enemy/turret.png'],
  ['turret-broke', 'assets/enemy/turret_broke.png'],
  ['jungle-bg1', 'assets/background/jungle_paralax_bg1.png'],
  ['jungle-bg2', 'assets/background/jungle_paralax_bg2.png'],
  ['tileset-jungle', 'assets/tileset.png'],
  ['life-unit', 'assets/ui/life_unit.png'],
];

// T1 (specs/sonidos.md): 11 .ogg acá + snd_click precargado en Boot
// (suena en Boot, antes de que Preload exista; no duplicar la carga).
const SOUND_ASSETS = [
  ['snd_jump', 'assets/sounds/snd_jump.ogg'],
  ['snd_landing', 'assets/sounds/snd_landing.ogg'],
  ['snd_step1', 'assets/sounds/snd_step1.ogg'],
  ['snd_step2', 'assets/sounds/snd_step2.ogg'],
  ['snd_rifle_shot', 'assets/sounds/snd_rifle_shot.ogg'],
  ['snd_reload_clip', 'assets/sounds/snd_reload_clip.ogg'],
  ['snd_hurt', 'assets/sounds/snd_hurt.ogg'],
  ['snd_explosion_ground', 'assets/sounds/snd_explosion_ground.ogg'],
  ['snd_main_theme', 'assets/sounds/snd_main_theme.ogg'],
  ['snd_end_drums', 'assets/sounds/snd_end_drums.ogg'],
  ['snd_select', 'assets/sounds/snd_select.ogg'],
];

// Pausa (spec escenario-pausa T1): cursor UI, carga aditiva.
// 'fnt_wonder32_custom.png' se probó como título y pinta el charset
// completo sobre el menú (1102x30 sin .fnt): no se carga ni se usa.

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
    this.failed = 0;
  }

  preload() {
    const cx = 240;
    const cy = 135;

    this.add
      .text(cx, 90, 'cargando...', { fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);

    const box = this.add.graphics();
    box.fillStyle(0x000000, 0.6);
    box.fillRect(cx - 130, cy - 15, 260, 30);

    const bar = this.add.graphics();
    const label = this.add
      .text(cx, cy + 32, '0%', { fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5);

    this.failed = 0;
    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0xffffff, 1);
      bar.fillRect(cx - 122, cy - 9, 244 * value, 18);
      label.setText(`${Math.round(value * 100)}%`);
    });
    this.load.on('loaderror', () => {
      this.failed += 1;
    });
    this.load.on('complete', (_loader, _done, totalFailed) => {
      this.failed = totalFailed;
      box.destroy();
      bar.destroy();
    });

    for (const [key, url] of MVP_ASSETS) {
      this.load.image(key, url);
    }

    for (const [key, url] of SOUND_ASSETS) {
      this.load.audio(key, url);
    }

    this.load.image('pause-cursor', 'assets/ui/gun_icon.png');

    // T3 game-feel: gate de fx (solo esos 4; keys fx-* distintas a las de
    // PlayScene.preload para evitar 'Texture key already in use').
    // Play carga 'bullet-fly-anim'/'bullet-impact-anim' como spritesheet;
    // las partículas las usa T6 (spritesheet 2x2 si T5 lo confirma).
    this.load.image('fx-bullet-impact', 'assets/fx/bullet_impact.png');
    this.load.image('fx-particles-grunt', 'assets/fx/particles_grunt.png');
    this.load.image('fx-particles-turret', 'assets/fx/particles_turret.png');
    this.load.image('fx-particles-explosion', 'assets/fx/particles_explosion.png');
    // T4 game-feel: gates de dust (Play carga 'run-dust-anim'/'jump-dust-anim'
    // como spritesheet con otra key para evitar 'Texture key already in use').
    this.load.image('fx-run-dust', 'assets/fx/run_dust.png');
    this.load.image('fx-jump-dust', 'assets/fx/jump_dust.png');

    // T6 game-feel: medición PIL solo-lectura (criterio: cada celda con
    // >=1 px opaco y ninguna frontera corta un componente conectado).
    // - bullet_impact 100x20 -> 5f 20x20 (fronteras 20/40 limpias; aro del
    //   f3 roza 1px la frontera x=60 y chispas del f4 la x=80 — despreciable;
    //   25x20 corta los aros por la mitad, peor). Confirma provisional T3.
    // - particles_grunt/turret/explosion/dirt 12x2 -> 6f 2x2 CONFIRMADO
    //   (cada celda es un color sólido; fila 1 duplica la 0; turret f6 es
    //   chispa multicolor — sirve igual como frame aleatorio).
    // - explosion_smoke 864x72 -> 12f 72x72, frame 12 vacío (disipación
    //   total; todas las fronteras caen en columnas de ceros). División
    //   estrictamente válida sin celdas vacías: 6f 144x72 (T10 elige rango).
    // - explosion_red 260x22 -> 10f 26x22 (fronteras limpias, todas no
    //   vacías; f10 = 1px residuo de disipación).
    // - run_dust 108x18 -> 6f 18x18, frame 6 vacío (puff 0-4 + fin).
    //   Confirma provisional T4 (Play 'run-dust-anim' ya usa 18x18).
    // - jump_dust 204x10 -> 6f 34x10, frame 6 vacío (puff 0-4 + fin).
    //   Confirma provisional T4 (Play 'jump-dust-anim' ya usa 34x10).
    // `shadow_char` NO se copia ni se carga. Sin anims ni uso todavía (T7/T10).
    this.load.spritesheet('fx-explosion-smoke', 'assets/fx/explosion_smoke.png', {
      frameWidth: 72,
      frameHeight: 72,
    });
    this.load.spritesheet('fx-explosion-red', 'assets/fx/explosion_red.png', {
      frameWidth: 26,
      frameHeight: 22,
    });
    this.load.spritesheet('fx-particles-dirt', 'assets/fx/particles_dirt.png', {
      frameWidth: 2,
      frameHeight: 2,
    });
  }

  create() {
    // Rama de error: no se arranca nivel roto, se ofrece reintento.
    if (this.failed > 0) {
      this.add
        .text(240, 110, 'error al cargar\npulsa para reintentar', {
          fontSize: '16px',
          color: '#ff5555',
          align: 'center',
        })
        .setOrigin(0.5);
      const retry = () => this.scene.restart();
      this.input.keyboard.once('keydown', retry);
      this.input.once('pointerdown', retry);
      return;
    }

    // Salida a Play (T3); el estado de run se resetea en Play.init().
    this.scene.start('Play');
  }
}
