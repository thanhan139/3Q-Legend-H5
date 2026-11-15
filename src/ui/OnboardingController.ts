import Phaser from 'phaser';
import { cloudRepository, supabase } from '../cloud/cloudRepository';
import { initialAccount } from '../cloud/accountDialog';
import { playerName, tutorialActive, type TutorialStep } from '../domain/tutorial';
import { gameStore } from '../domain/store';
import { HERO_BY_ID } from '../data/heroes';
import { atlasOrder, PORTRAITS, ROLE_LABEL } from './heroPresentation';
import { tutorialTarget } from './tutorialTargets';

const route = (step: TutorialStep, help = false): { scene: string; data?: object } => {
  if (step === 'welcome') return { scene: 'Tutorial' };
  if (step === 'starter_heroes' || step === 'upgrade') return { scene: 'Heroes', data: { heroId: 'zhang-fei' } };
  if (step === 'formation') return { scene: 'Formation', data: { slot: 0 } };
  if (step === 'campaign' || (help && (step === 'battle' || step === 'battle_intro'))) return { scene: 'Campaign', data: { stageId: '1-1', showDetail: true } };
  if (step === 'battle' || step === 'battle_intro') return { scene: 'Battle', data: { stageId: '1-1' } };
  if (step === 'rewards') return { scene: 'Result', data: { stageId: '1-1', winner: 'player', tutorialReview: true } };
  if (step === 'inventory') return { scene: 'Inventory' };
  return { scene: 'Lobby' };
};
const messages: Partial<Record<TutorialStep, string>> = {
  welcome: 'Loạn thế nổi lên, bá tánh đang chờ một minh chủ. Ta là Gia Cát Lượng. Xin cho biết tôn danh của Chúa Công!',
  formation: 'Chọn ô tuyến trước đầu tiên, rồi chạm Trương Phi bên phải để xác nhận bố trận. Hộ Vệ chịu đòn phía trước; Hỗ Trợ ở phía sau.',
  campaign: 'Chinh Chiến là hành trình mở ải và nhận thưởng. Chạm Khiêu Chiến để bước vào trận 1-1.',
  battle_intro: 'Tướng tự hành động theo tốc độ. Thanh máu cho biết sinh lực; thanh nộ đầy sẽ dùng kỹ năng. Có thể tăng tốc ×2 hoặc bỏ qua để tính cùng kết quả trận.',
  battle: 'Đội quân đang giao chiến. Hãy quan sát tướng tuyến trước bảo vệ đồng đội. Kết quả và phần thưởng sẽ được máy chủ xác nhận.',
  rewards: 'Chiến thắng đầu tiên! Máy chủ đã ghi phần thưởng dưới đây vào tiến trình. Chỉ nhận thưởng vượt ải lần đầu một lần.',
  inventory: 'Đồng và Vàng là tiền tệ. EXP Tướng, Chìa Khóa, đá và mảnh nằm trong Túi Đồ. EXP vừa nhận dùng để nâng tướng.',
  upgrade: 'Chạm Tăng cấp để dùng EXP nâng Trương Phi. Chỉ số tăng giúp đội quân vượt những ải tiếp theo.',
  lobby_tour: 'Sảnh là nơi trở về sau mỗi chuyến chinh chiến. Tại đây có ví tiền, đội hình, Võ Tướng và Túi Đồ.',
  summon_intro: 'Chiêu Mộ mở sau khi vượt ải 1-3. Dùng Chìa Khóa trong Túi Đồ; tướng trùng đổi thành mảnh. Chưa cần chiêu mộ lúc này.',
  welfare_intro: 'Phúc Lợi tổng hợp Điểm Danh và Nhiệm Vụ. Mỗi phần thưởng đều có điều kiện, hãy quay lại kiểm tra sau chuyến chinh chiến.',
  arena_intro: 'Đấu Trường là PvP bất đồng bộ: đăng ký phòng thủ rồi khiêu chiến người chơi khác. Cần tài khoản email đã xác minh và kết nối online.',
};

/** DOM spotlight sits over the existing canvas; holes preserve original Phaser hit targets. */
export class OnboardingController {
  private readonly layer = document.createElement('div');
  private readonly connection = document.createElement('div');
  private previous = '';
  private rendered = '';
  private help?: TutorialStep;
  private starterIndex = 0;
  private slotSelected = false;
  private sending = false;
  private error = '';
  private gated = false;
  private paused: string[] = [];
  private portrait?: string;
  private nameDraft?: string;
  private owner?: string;
  private returnToLobby = false;

  constructor(private readonly game: Phaser.Game) {
    this.layer.className = 'tutorial-layer';
    this.connection.className = 'connection-gate';
    this.connection.hidden = true;
    document.body.append(this.layer, this.connection);
    const tick = () => this.update();
    const offline = () => { if (cloudRepository.active && !document.querySelector('.account-dialog[open]')) this.blockConnection(); };
    const failure = () => { if (this.currentScene() && !document.querySelector('.account-dialog[open]')) this.blockConnection(); };
    const target = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (this.help) return;
      if (id === `hero.card.${['zhang-fei', 'guan-yu', 'liu-bei'][this.starterIndex]}`) {
        this.starterIndex = Math.min(3, this.starterIndex + 1); this.rendered = '';
      }
      if (id === 'formation.slot.0') { this.slotSelected = true; this.rendered = ''; }
    };
    const help = (event: Event) => {
      this.help = (event as CustomEvent<TutorialStep>).detail;
      this.previous = ''; this.rendered = ''; this.update();
    };
    const press = () => {
      this.layer.querySelector('.tutorial-spotlight')?.animate(
        [{ filter: 'brightness(1)' }, { filter: 'brightness(1.8)' }, { filter: 'brightness(1)' }], { duration: 180 });
    };
    this.game.events.on(Phaser.Core.Events.POST_STEP, tick);
    window.addEventListener('offline', offline);
    window.addEventListener('3q:connection-error', failure);
    window.addEventListener('3q:tutorial-target', target);
    window.addEventListener('3q:help', help);
    game.canvas.addEventListener('pointerdown', press);
    game.events.once(Phaser.Core.Events.DESTROY, () => {
      this.layer.remove(); this.connection.remove();
      window.removeEventListener('offline', offline);
      window.removeEventListener('3q:connection-error', failure);
      window.removeEventListener('3q:tutorial-target', target);
      window.removeEventListener('3q:help', help);
      game.canvas.removeEventListener('pointerdown', press);
    });
  }

  private currentScene() { return this.game.scene.getScenes(true).find(scene => scene.sys.settings.key !== 'Boot'); }

  private update() {
    if (this.owner !== cloudRepository.uid) {
      this.owner = cloudRepository.uid; this.help = undefined; this.starterIndex = 0;
      this.slotSelected = false; this.nameDraft = undefined; this.previous = ''; this.rendered = '';
    }
    if (this.gated) {
      for (const scene of this.game.scene.getScenes(true)) {
        const key = scene.sys.settings.key;
        if (key !== 'Boot' && !this.paused.includes(key)) { this.paused.push(key); scene.scene.pause(); }
      }
      return;
    }
    const progress = cloudRepository.tutorial;
    if (this.returnToLobby && this.currentScene()) {
      this.returnToLobby = false; this.currentScene()?.scene.start('Lobby');
    }
    if (!cloudRepository.active || !progress || (!this.help && !tutorialActive(progress))) {
      this.layer.replaceChildren(); this.rendered = ''; this.previous = ''; return;
    }
    if (!navigator.onLine) { this.blockConnection(); return; }
    let scene = this.currentScene();
    // Boot awaits authentication (including migration/recovery dialogs).
    if (!scene) return;
    const step = this.help ?? progress.tutorialStep;
    const retryBattle = step === 'battle' && scene.sys.settings.key === 'Result';
    const destination = retryBattle ? { scene: 'Result' } : route(step, Boolean(this.help));
    const signature = `${cloudRepository.uid}:${this.help ? 'help' : progress.tutorialVersion}:${step}`;
    if (signature !== this.previous) {
      const previous = this.previous;
      this.previous = signature; this.rendered = ''; this.error = '';
      const restartBattle = previous.endsWith(':battle_intro') && step === 'battle';
      if (scene.sys.settings.key !== destination.scene || restartBattle) {
        scene.scene.start(destination.scene, destination.data);
        return;
      }
    }
    scene = this.currentScene();
    if (!scene || scene.sys.settings.key !== destination.scene) return;
    let targetId = '';
    if (step === 'starter_heroes' && this.starterIndex < 3) targetId = `hero.card.${['zhang-fei', 'guan-yu', 'liu-bei'][this.starterIndex]}`;
    if (step === 'formation') targetId = this.slotSelected ? 'formation.hero.zhang-fei' : 'formation.slot.0';
    if (step === 'campaign') targetId = 'campaign.enter';
    if (step === 'upgrade') targetId = 'hero.upgrade';
    if (step === 'rewards') targetId = 'result.rewards';
    if (retryBattle) targetId = 'result.retry';
    if (step === 'summon_intro') targetId = 'lobby.5';
    if (step === 'welfare_intro') targetId = 'lobby.0';
    if (step === 'arena_intro') targetId = 'lobby.7';
    const bounds = targetId ? tutorialTarget(scene, targetId) : undefined;
    // Async scene creation must finish before exposing an interactive target.
    if (targetId && !bounds && !this.help) {
      this.layer.replaceChildren();
      const blocker = document.createElement('div'); blocker.className = 'tutorial-loading';
      blocker.textContent = 'Đang chuẩn bị hướng dẫn…'; this.layer.append(blocker); this.rendered = ''; return;
    }
    const rect = this.game.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    Object.assign(this.layer.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    const key = `${signature}:${scene.sys.settings.key}:${rect.width}:${rect.height}:${bounds?.x}:${bounds?.y}:${this.starterIndex}:${this.slotSelected}:${this.sending}:${this.error}`;
    if (key === this.rendered) return;
    this.rendered = key;
    this.render(scene, step, bounds, rect.width / 1280);
  }

  private render(scene: Phaser.Scene, step: TutorialStep, bounds: Phaser.Geom.Rectangle | undefined, scale: number) {
    this.layer.replaceChildren();
    const surface = document.createElement('div'); surface.className = 'tutorial-surface';
    surface.style.transform = `scale(${scale})`;
    this.layer.append(surface);
    const box = bounds ? { x: Math.max(0, bounds.x - 8), y: Math.max(0, bounds.y - 8),
      w: Math.min(1280, bounds.width + 16), h: Math.min(720, bounds.height + 16) } : undefined;
    const shade = (x: number, y: number, w: number, h: number) => {
      const part = document.createElement('div'); part.className = 'tutorial-shade';
      Object.assign(part.style, { left: `${x}px`, top: `${y}px`, width: `${Math.max(0,w)}px`, height: `${Math.max(0,h)}px` });
      surface.append(part);
    };
    if (box) {
      shade(0, 0, 1280, box.y); shade(0, box.y + box.h, 1280, 720 - box.y - box.h);
      shade(0, box.y, box.x, box.h); shade(box.x + box.w, box.y, 1280 - box.x - box.w, box.h);
      const ring = document.createElement('div'); ring.className = 'tutorial-spotlight';
      Object.assign(ring.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
      if (this.help || ['summon_intro', 'welfare_intro', 'arena_intro'].includes(step)) ring.style.pointerEvents = 'auto';
      surface.append(ring);
      const arrow = document.createElement('div'); arrow.className = 'tutorial-arrow'; arrow.textContent = '▼';
      Object.assign(arrow.style, { left: `${box.x + box.w / 2 - 20}px`, top: `${Math.max(4,box.y - 51)}px` }); surface.append(arrow);
    } else if (step !== 'battle') shade(0, 0, 1280, 720);
    const card = document.createElement('section'); card.className = 'tutorial-card'; card.setAttribute('aria-label', 'Hướng dẫn của quân sư');
    card.style.top = step === 'welcome' ? '165px' : box && box.y > 350 ? '110px' : '425px';
    card.style.left = box && box.x > 650 ? '40px' : '320px';
    if (box) {
      const above = box.y, below = 720 - box.y - box.h;
      const top = above >= below ? 18 : box.y + box.h + 16;
      card.style.top = `${top}px`;
      card.style.maxHeight = `${Math.max(120, Math.min(290, (above >= below ? above - 34 : below - 30)))}px`;
    }
    if (step === 'battle') { card.style.top = '110px'; card.style.left = '25px'; }
    const heading = document.createElement('strong'); heading.textContent = this.help ? 'TRỢ GIÚP · GIA CÁT LƯỢNG' : 'QUÂN SƯ · GIA CÁT LƯỢNG';
    card.append(heading);
    if (!this.portrait && scene.textures.exists(PORTRAITS)) this.portrait = scene.textures.getBase64(PORTRAITS, atlasOrder.indexOf('zhuge-liang'));
    if (this.portrait) { const image = document.createElement('img'); image.src = this.portrait; image.alt = 'Gia Cát Lượng'; card.append(image); }
    const text = document.createElement('p');
    if (step === 'starter_heroes' && this.help) {
      text.textContent = 'Trương Phi là Hộ Vệ chịu đòn tuyến trước; Quan Vũ là Đấu Sĩ gây sát thương; Lưu Bị là Hỗ Trợ hồi phục. Chọn tướng phù hợp để bảo vệ đội quân.';
    } else if (step === 'starter_heroes') {
      const id = ['zhang-fei', 'guan-yu', 'liu-bei'][Math.min(this.starterIndex, 2)];
      const hero = HERO_BY_ID[id];
      text.textContent = this.starterIndex < 3 ? `${hero.name} · ${ROLE_LABEL[hero.role]}. ${id === 'zhang-fei'
        ? 'Hộ Vệ che chắn cho đồng đội phía sau.' : id === 'guan-yu' ? 'Đấu Sĩ gây sát thương, cùng Trương Phi giữ tuyến trước.' : 'Hỗ Trợ hồi phục cho đội quân.'} Chạm chân dung để xem tướng.`
        : 'Ba võ tướng đã sẵn sàng đồng hành. Tiếp theo, hãy cùng bố trí đội hình.';
    } else text.textContent = step === 'battle' && scene.sys.settings.key === 'Result'
      ? 'Trận này chưa thắng. Không mất tài nguyên khởi đầu. Chạm Thử Lại để cùng đội quân tiếp tục ải 1-1.' : messages[step] ?? '';
    if (this.help && ['formation','campaign','upgrade'].includes(step)) text.textContent += ' Đây là phần xem lại; không cần thực hiện giao dịch.';
    card.append(text);
    let name: HTMLInputElement | undefined;
    if (step === 'welcome' && !this.help) {
      const label = document.createElement('label'); label.textContent = 'Tên Chúa Công (2–24 ký tự)';
      name = document.createElement('input'); name.type = 'text'; name.setAttribute('autocomplete', 'nickname'); name.maxLength = 48;
      name.value = this.nameDraft ?? gameStore.snapshot.playerName; label.append(name); card.append(label);
      name.addEventListener('input', () => { this.nameDraft = name?.value; });
      name.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) void this.act('name', name?.value); });
    }
    if (step === 'rewards') {
      const reward = document.createElement('p'); reward.className = 'tutorial-receipt';
      reward.textContent = cloudRepository.tutorial?.battleReceipt?.rewards.join(' · ') || 'Xem tài nguyên đã xác nhận trong Túi Đồ.'; card.append(reward);
    }
    const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = this.error; card.append(status);
    const actions = document.createElement('div'); actions.className = 'tutorial-actions';
    const button = (label: string, fn: () => void, disabled = false) => {
      const control = document.createElement('button'); control.textContent = label; control.disabled = disabled || this.sending;
      control.onclick = fn; actions.append(control);
    };
    const gameplay = ['formation', 'campaign', 'battle', 'upgrade'].includes(step);
    if (this.help) {
      button('Về Trợ Giúp', () => { this.help = undefined; this.previous = ''; this.layer.replaceChildren(); scene.scene.start('Tutorial', { help: true }); });
    } else {
      if (!gameplay) button(step === 'welcome' ? 'Khởi hành' : step === 'battle_intro' ? 'Bắt đầu trận' : step === 'arena_intro' ? 'Hoàn thành' : 'Tiếp tục',
        () => { void this.act(step === 'welcome' ? 'name' : 'next', name?.value); }, step === 'starter_heroes' && this.starterIndex < 3);
      button('Bỏ qua hướng dẫn', () => { if (window.confirm('Bỏ qua hướng dẫn? Tài nguyên và tiến trình đã nhận vẫn được giữ.')) void this.act('skip'); });
    }
    card.append(actions); surface.append(card);
  }

  private async act(action: 'name' | 'next' | 'skip', name?: string) {
    if (this.sending) return;
    if (action === 'name' && !playerName(name)) { this.error = 'Tên gồm 2–24 chữ, số hoặc khoảng trắng.'; this.rendered = ''; return; }
    const progress = cloudRepository.tutorial;
    if (!progress) return;
    this.sending = true; this.error = '';
    try {
      await cloudRepository.execute({ type: 'tutorial', version: progress.tutorialVersion, step: progress.tutorialStep, action, ...(name !== undefined ? { name } : {}) });
      if (action === 'skip' || cloudRepository.tutorial?.tutorialCompleted) this.returnToLobby = true;
    } catch (error) { this.error = error instanceof Error ? error.message : 'Chưa thể xác nhận bước hướng dẫn.'; }
    finally { this.sending = false; this.rendered = ''; }
  }

  private blockConnection() {
    if (this.gated) return;
    this.gated = true; this.connection.hidden = false; this.connection.replaceChildren();
    const card = document.createElement('section'); card.className = 'account-card';
    const title = document.createElement('h1'); title.textContent = 'Không thể kết nối máy chủ';
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    status.textContent = 'Chưa xác nhận được tiến trình. Kết nối lại và thử lại; dữ liệu đã lưu được giữ nguyên.';
    const retry = document.createElement('button'); retry.textContent = 'Thử lại';
    retry.onclick = async () => {
      retry.disabled = true;
      try {
        if (!navigator.onLine || !supabase) throw new Error('Chưa có kết nối mạng.');
        if (cloudRepository.busy) throw new Error('Đang đối chiếu giao dịch. Hãy thử lại sau giây lát.');
        const result = await supabase.auth.getUser();
        if (result.error && ![401,403,404].includes(result.error.status ?? 0)) throw result.error;
        if (!result.data.user || result.data.user.is_anonymous || !result.data.user.email_confirmed_at ||
          result.data.user.id !== cloudRepository.uid) {
          const previousOwner = cloudRepository.uid;
          cloudRepository.disconnect();
          this.connection.hidden = true;
          await initialAccount();
          if (cloudRepository.uid !== previousOwner) { location.reload(); return; }
        } else await cloudRepository.refresh();
        this.gated = false; this.connection.hidden = true;
        for (const key of this.paused) if (this.game.scene.isPaused(key)) this.game.scene.resume(key);
        this.paused = []; this.previous = ''; this.rendered = '';
      } catch (error) {
        this.connection.hidden = false;
        status.textContent = error instanceof Error ? error.message : 'Chưa thể kết nối. Hãy thử lại.';
      } finally { retry.disabled = false; }
    };
    card.append(title, status, retry); this.connection.append(card);
  }
}
