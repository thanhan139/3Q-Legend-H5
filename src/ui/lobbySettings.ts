const KEY = '3q-lobby-preferences';
export type LobbySettings = { music: boolean; sfx: boolean; effects: boolean; quality: 'Thấp' | 'Cao' };

export function readLobbySettings(): LobbySettings {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { music: data.music === true, sfx: data.sfx !== false, effects: data.effects !== false,
      quality: data.quality === 'Thấp' ? 'Thấp' : 'Cao' };
  } catch {
    return { music: false, sfx: true, effects: true, quality: 'Cao' };
  }
}

export function writeLobbySettings(settings: LobbySettings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Settings still apply this session. */ }
}
