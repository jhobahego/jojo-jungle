import Phaser from 'phaser';

// T4: game-over con asset de titlescreen. Reintentar vuelve a Play,
// cuyo init() resetea el estado de run.
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  preload() {
    // Panel 1280x180 = 4 repeticiones de 320x180; se muestra 1 a escala 1:1.
    this.load.spritesheet('gameover', 'assets/titlescreen/GameOverScreen.png', {
      frameWidth: 320,
      frameHeight: 180,
    });
  }

  create() {
    if (this.textures.exists('gameover')) {
      this.add.image(240, 120, 'gameover', 0);
    } else {
      this.add
        .text(240, 120, 'mission failed', { fontSize: '24px', color: '#ff5555' })
        .setOrigin(0.5);
    }
    this.add
      .text(240, 245, 'pulsa tecla o clic para reintentar', {
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const retry = () => this.scene.start('Play');
    this.input.keyboard.once('keydown', retry);
    this.input.once('pointerdown', retry);
  }
}
