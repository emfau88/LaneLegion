import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.input.topOnly = true;
    this.scene.start('MainMenu');
  }
}
