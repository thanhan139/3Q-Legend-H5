export interface PlayerProfile {
  name: string;
  uid: string;
  server: string;
  level: number;
  power: string;
  avatar: string;
}

/** Native modal keeps touch/focus inside the popup and blocks the canvas beneath it. */
export function openLobbyDialog(kind: 'profile' | 'vip' | 'guild' | 'world', profile: PlayerProfile,
  actions: { account(): Promise<void>; logout(): Promise<void>; closed(): void }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'lobby-dialog';
  const card = document.createElement('section'); card.className = 'lobby-dialog-card';
  dialog.append(card);
  let working = false;
  let disposed = false;
  const remove = () => {
    if (disposed) return;
    disposed = true;
    dialog.close(); dialog.remove(); actions.closed();
  };
  const close = () => { if (!working) remove(); };
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text: string, parent: HTMLElement = card) => {
    const node = document.createElement(tag); node.textContent = text; parent.append(node); return node;
  };
  const control = (label: string, callback: () => void, parent: HTMLElement = card) => {
    const button = element('button', label, parent); button.type = 'button'; button.onclick = callback; return button;
  };
  const title = element('h2', ''); title.id = 'lobby-dialog-title';
  dialog.setAttribute('aria-labelledby', title.id);
  const exit = control('×', close); exit.className = 'lobby-dialog-close'; exit.setAttribute('aria-label', 'Đóng');
  const body = element('div', ''); body.className = 'lobby-dialog-body';
  const notice = element('p', '', body); notice.className = 'lobby-dialog-notice'; notice.setAttribute('role', 'status');
  const unavailable = () => { notice.textContent = 'Tính năng đang hoàn thiện. Hiện chưa khả dụng.'; };

  if (kind === 'profile') {
    title.textContent = 'HỒ SƠ CHÚA CÔNG';
    const identity = element('div', '', body); identity.className = 'lobby-profile-identity';
    const avatar = document.createElement('img'); avatar.src = profile.avatar; avatar.alt = 'Avatar hiện tại'; identity.append(avatar);
    const summary = element('div', '', identity);
    element('span', 'CHÚA CÔNG', summary).className = 'lobby-eyebrow';
    element('h3', profile.name, summary);
    element('p', 'Chân dung theo tướng đại diện hiện tại', summary);
    const details = element('dl', '', body); details.className = 'lobby-profile-details';
    for (const [label, value] of [['UID', profile.uid], ['Máy chủ', profile.server],
      ['Cấp', String(profile.level)], ['Lực chiến', profile.power]]) {
      const row = element('div', '', details); element('dt', label, row); element('dd', value, row);
    }
    const buttons = element('div', '', body); buttons.className = 'lobby-dialog-actions';
    control('Đổi avatar · Sắp ra mắt', unavailable, buttons);
    control('Thông tin tài khoản', () => { close(); void actions.account(); }, buttons);
    control('Đăng xuất', () => {
      buttons.hidden = true;
      const confirm = element('div', '', body); confirm.className = 'lobby-logout-confirm';
      element('p', 'Đăng xuất tài khoản này? Tiến trình online vẫn được giữ.', confirm);
      const cancel = control('Ở lại', () => { confirm.remove(); buttons.hidden = false; }, confirm);
      const submit = control('Xác nhận đăng xuất', () => {
        working = true; submit.disabled = true; cancel.disabled = true; exit.disabled = true;
        notice.textContent = 'Đang đăng xuất…';
        void actions.logout().catch(() => {
          if (disposed) return;
          working = false; submit.disabled = false; cancel.disabled = false; exit.disabled = false;
          notice.textContent = 'Không thể đăng xuất. Vui lòng thử lại.';
        });
      }, confirm);
      cancel.focus();
    }, buttons).classList.add('lobby-danger');
  } else if (kind === 'vip') {
    title.textContent = 'ĐẶC QUYỀN VIP';
    element('span', 'CHƯA KHẢ DỤNG', body).className = 'lobby-vip-badge';
    element('h3', 'Cấp VIP · Chưa cấu hình', body);
    element('p', 'Hệ thống VIP và thanh toán thật chưa được triển khai. Không phát sinh giao dịch hoặc cấp quà từ màn hình này.', body);
    const progress = element('section', '', body); progress.className = 'lobby-vip-section';
    element('h4', 'Tiến trình nạp', progress);
    const track = element('div', '', progress); track.className = 'lobby-vip-track'; track.setAttribute('aria-hidden', 'true');
    element('p', 'Chưa có dữ liệu nạp hoặc mốc VIP được phê duyệt.', progress);
    for (const [heading, message, label] of [
      ['Quyền lợi theo mốc', 'Các cấp và quyền lợi sẽ hiển thị khi có cấu hình chính thức.', 'Xem quyền lợi'],
      ['Quà VIP', 'Chưa có cấu hình quà. Không có phần thưởng để nhận.', 'Thông tin quà VIP'],
    ]) {
      const section = element('section', '', body); section.className = 'lobby-vip-section';
      element('h4', heading, section); element('p', message, section); control(label, unavailable, section);
    }
    const payment = control('Nạp · Chưa khả dụng', () => undefined, body); payment.disabled = true;
    payment.title = 'Chưa tích hợp thanh toán';
  } else {
    title.textContent = kind === 'guild' ? 'BANG HỘI' : 'THẾ GIỚI';
    element('h3', 'Đang hoàn thiện', body);
    element('p', kind === 'guild' ? 'Bang Hội sẽ mở khi có hệ thống máy chủ bang hội.'
      : 'Bản đồ Thế Giới sẽ mở khi nội dung được triển khai.', body);
    control('Đã hiểu', close, body);
  }
  document.body.append(dialog); dialog.showModal(); exit.focus();
  return remove;
}
