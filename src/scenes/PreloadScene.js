import Phaser from 'phaser';

// T2: carga solo lo MVP con barra vía progress/complete y rama de error con reintento.
const MVP_ASSETS = [
  ['john-idle', 'assets/player/john_idle.png'],
  ['john-run', 'assets/player/john_run.png'],
  ['john-jump', 'assets/player/john_jump.png'],
  ['john-crouch', 'assets/player/john_crouch.png'],
  ['john-shoot', 'assets/player/john_stand_shooting.png'],
  ['john-static', 'assets/player/john_static.png'],
  ['grunt-idle', 'assets/enemy/grunt_idle.png'],
  ['turret', 'assets/enemy/turret.png'],
  ['jungle-bg1', 'assets/background/jungle_paralax_bg1.png'],
  ['jungle-bg2', 'assets/background/jungle_paralax_bg2.png'],
  ['tileset-jungle', 'assets/tileset.png'],
  ['life-unit', 'assets/ui/life_unit.png'],
];

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
