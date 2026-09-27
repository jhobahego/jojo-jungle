import Phaser from 'phaser';

// T2: press-start con assets de titlescreen. Al pulsar tecla/clic pasa a Preload.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.image('title-bg', 'assets/titlescreen/main_title_bg.png');
    this.load.image('title-logo', 'assets/titlescreen/main_title_title.png');
    // Tira 1206x23 = 6 repeticiones de 201x23; se muestra 1 unidad a escala 1:1.
    this.load.spritesheet('press-start', 'assets/titlescreen/press_start_strip.png', {
      frameWidth: 201,
      frameHeight: 23,
    });
  }

  create() {
    const cx = 240;

    if (this.textures.exists('title-bg')) {
      this.add.image(cx, 135, 'title-bg');
    }
    if (this.textures.exists('title-logo')) {
      this.add.image(cx, 70, 'title-logo');
    }
    if (this.textures.exists('press-start')) {
      this.add.image(cx, 210, 'press-start', 0);
    } else {
      this.add
        .text(cx, 210, 'press start', { fontSize: '16px', color: '#ffffff' })
        .setOrigin(0.5);
    }

    const start = () => this.scene.start('Preload');
    this.input.keyboard.once('keydown', start);
    this.input.once('pointerdown', start);
  }
}
