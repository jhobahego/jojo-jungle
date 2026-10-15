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
