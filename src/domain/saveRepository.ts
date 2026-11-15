import type { SaveV2 } from './types';

export interface SaveRepository {
  read(): string | null;
  write(save: SaveV2): void;
}

const STORAGE_KEY = '3q-legend-h5-save-v1';
export const localSaveRepository: SaveRepository = {
  read: () => localStorage.getItem(STORAGE_KEY),
  write: save => localStorage.setItem(STORAGE_KEY, JSON.stringify(save)),
};
