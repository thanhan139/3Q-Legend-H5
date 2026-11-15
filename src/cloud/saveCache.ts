import type { CloudSave, GameIntent } from './gameProtocol';
import type { SaveV2 } from '../domain/types';

export type PendingCommand = Extract<GameIntent, { action: 'command' }>;

export interface AccountSave {
  confirmed?: CloudSave;
  offline?: SaveV2;
  offlineRevision?: string;
  pending?: PendingCommand;
  conflict?: boolean;
}

export class SaveCache {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'>, private readonly prefix: string) {}

  read(uid: string): AccountSave {
    try {
      const value = JSON.parse(this.storage.getItem(this.key(uid)) ?? '{}') as AccountSave;
      return value && typeof value === 'object' ? value : {};
    } catch { return {}; }
  }

  update(uid: string, change: (save: AccountSave) => AccountSave): AccountSave {
    const save = change(this.read(uid));
    this.storage.setItem(this.key(uid), JSON.stringify(save));
    return save;
  }

  private key(uid: string) { return `${this.prefix}:${uid}`; }
}

export function confirmSave(record: AccountSave, confirmed: CloudSave): AccountSave {
  if (record.confirmed && BigInt(record.confirmed.revision) > BigInt(confirmed.revision)) return record;
  return { ...record, confirmed };
}
