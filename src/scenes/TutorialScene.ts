import { UiScene } from '../ui/UiScene';
import { LOBBY_ASSETS } from '../data/lobbyAssets';

export class TutorialScene extends UiScene {
  constructor() { super('Tutorial'); }
  create({ help = false }: { help?: boolean } = {}) {
    this.add.image(640, 360, LOBBY_ASSETS.palace.key).setDisplaySize(1280, 720);
    this.add.rectangle(640, 360, 1280, 720, 0x29121c, 0.55);
    this.text(640, 95, help ? 'TRỢ GIÚP CHÚA CÔNG' : 'LOẠN THẾ TAM QUỐC', 44, '#ffdd92',
      { fontFamily: 'Georgia, serif', fontStyle: 'bold' }).setOrigin(0.5);
    if (!help) return;
    const topics = [
      ['Tướng khởi đầu', 'starter_heroes'], ['Bố trận', 'formation'], ['Chinh Chiến và chiến đấu', 'campaign'],
      ['Túi Đồ', 'inventory'], ['Nâng cấp tướng', 'upgrade'], ['Sảnh và tính năng', 'lobby_tour'],
    ];
    topics.forEach(([label, step], index) => this.button(640, 207 + index * 64, 510, 51, label,
      () => window.dispatchEvent(new CustomEvent('3q:help', { detail: step })), 0x82372e, true, true));
    this.button(1128, 57, 206, 51, 'Về Sảnh', () => this.go('Lobby'), 0x82372e, true, true);
  }
}
