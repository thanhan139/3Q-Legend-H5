import { UiScene } from '../ui/UiScene';

export class TopupScene extends UiScene {
  constructor() { super('Topup'); }

  create() {
    this.scene.start('Info', { page: 'Topup' });
  }
}
