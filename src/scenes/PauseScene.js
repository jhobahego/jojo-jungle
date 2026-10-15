import Phaser from 'phaser';

// Pausa (spec escenario-pausa T2): menú sobre Play pausado (HUD congelado
// detrás). Reanudar → stop + resume Play; Reiniciar → stop todo + start
// Play de cero (init resetea hp/score/ammo); Salir → stop todo + start Boot;
// Controles/Opciones → "Sin funcionalidad", se queda en el menú.
// Patrón GameOver: confirmación con snd_select, fallback a texto si el
// asset falta.
const OPTIONS = ['Reanudar', 'Reiniciar', 'Controles', 'Opciones', 'Salir'];

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
    this.selected = 0;
  }

  create() {
    this.selected = 0;

    // Fondo semitransparente sobre el juego congelado.
    this.add.rectangle(240, 135, 480, 270, 0x000000, 0.7);

    // Título en texto (la tira 'pause-font' es el charset completo
    // 1102x30 sin .fnt y pintaba el abecedario sobre el menú: no se usa).
    this.add
      .text(240, 40, 'PAUSA', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5);

    this.optionTexts = OPTIONS.map((label, i) => {
      const t = this.add
        .text(240, 105 + i * 25, label, { fontSize: '14px', color: '#ffffff' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.select(i));
      t.on('pointerdown', () => {
        this.select(i);
        this.confirm();
      });
      return t;
    });

    // Selector: gun_icon como cursor a la izquierda de la opción elegida.
    if (this.textures.exists('pause-cursor')) {
      this.cursor = this.add.image(0, 0, 'pause-cursor');
    } else {
      this.cursor = null;
    }

    this.info = this.add
      .text(240, 244, '', { fontSize: '12px', color: '#ffff00' })
      .setOrigin(0.5);

    this.updateCursor();

    this.input.keyboard.on('keydown-UP', () => this.select(this.selected - 1));
    this.input.keyboard.on('keydown-DOWN', () => this.select(this.selected + 1));
    this.input.keyboard.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard.on('keydown-SPACE', () => this.confirm());
    // Toggle: ESC/P acá reanuda (Play pausado no procesa su propio input).
    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    this.input.keyboard.on('keydown-P', () => this.resumeGame());
  }

  select(i) {
    this.selected = (i + OPTIONS.length) % OPTIONS.length;
    this.info.setText('');
    this.updateCursor();
  }

  updateCursor() {
    this.optionTexts.forEach((t, i) => {
      t.setColor(i === this.selected ? '#ffff00' : '#ffffff');
    });
    if (this.cursor) {
      const t = this.optionTexts[this.selected];
      this.cursor.setPosition(t.x - t.width / 2 - 16, t.y);
    }
  }

  confirm() {
    const choice = OPTIONS[this.selected];
    if (choice === 'Reanudar') {
      this.resumeGame();
    } else if (choice === 'Reiniciar') {
      this.sound.play('snd_select');
      this.scene.stop('Pause');
      this.scene.stop('HUD');
      this.scene.stop('Play');
      this.scene.start('Play');
    } else if (choice === 'Salir') {
      this.sound.play('snd_select');
      // Salir cierra TODO: el tema no vuelve solo a Boot y Play queda
      // pausado de fondo si no se frena acá (su SHUTDOWN ya suelta HUD).
      this.sound.stopByKey('snd_main_theme');
      this.scene.stop('Pause');
      this.scene.stop('HUD');
      this.scene.stop('Play');
      this.scene.start('Boot');
    } else {
      // Controles / Opciones: sin funcionalidad, se queda en el menú.
      this.info.setText('Sin funcionalidad');
    }
  }

  resumeGame() {
    this.sound.play('snd_select');
    this.scene.stop('Pause');
    this.scene.resume('Play');
  }
}
