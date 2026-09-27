import Phaser from 'phaser';

// T5: HUD in-canvas, lanzado en paralelo con launch (no con start).
// Vidas/score/ammo vía registry (changedata-*); ammo = balas disponibles
// del pool de Play. Sin DOM lateral.
export default class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  create() {
    const style = { fontSize: '12px', color: '#ffffff' };
    this.hpText = this.add.text(8, 6, '', style).setScrollFactor(0);
    this.scoreText = this.add
      .text(240, 6, '', style)
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
    this.ammoText = this.add
      .text(472, 6, '', style)
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.refreshAll();

    this.onHpChange = (parent, value) => this.hpText.setText(`HP:${value}`);
    this.onScoreChange = (parent, value) => this.scoreText.setText(`SCORE:${value}`);
    this.onAmmoChange = (parent, value) => this.ammoText.setText(`AMMO:${value}`);
    // En Phaser 4 los eventos changedata-* salen por registry.events
    // (el DataManager ya no es un EventEmitter).
    this.registry.events.on('changedata-hp', this.onHpChange);
    this.registry.events.on('changedata-score', this.onScoreChange);
    this.registry.events.on('changedata-ammo', this.onAmmoChange);

    // Al detener el HUD, soltar listeners del registry (vive a nivel juego).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-hp', this.onHpChange);
      this.registry.events.off('changedata-score', this.onScoreChange);
      this.registry.events.off('changedata-ammo', this.onAmmoChange);
    });
  }

  refreshAll() {
    this.hpText.setText(`HP:${this.registry.get('hp')}`);
    this.scoreText.setText(`SCORE:${this.registry.get('score')}`);
    this.ammoText.setText(`AMMO:${this.registry.get('ammo')}`);
  }
}
