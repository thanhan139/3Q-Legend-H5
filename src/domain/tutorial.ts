import type { GameCommand } from '../cloud/gameProtocol';
import type { SaveV2 } from './types';

export const TUTORIAL_VERSION = 1;
export const TUTORIAL_STEPS = ['welcome', 'starter_heroes', 'formation', 'campaign', 'battle_intro',
  'battle', 'rewards', 'inventory', 'upgrade', 'lobby_tour', 'summon_intro', 'welfare_intro', 'arena_intro', 'done'] as const;
export type TutorialStep = typeof TUTORIAL_STEPS[number];
export interface TutorialProgress {
  tutorialVersion: number;
  tutorialStep: TutorialStep;
  tutorialCompleted: boolean;
  tutorialSkipped: boolean;
  battleReceipt?: { requestId: string; rewards: string[]; firstClear: boolean };
}
export const newTutorial = (): TutorialProgress => ({ tutorialVersion: TUTORIAL_VERSION,
  tutorialStep: 'welcome', tutorialCompleted: false, tutorialSkipped: false });
export const legacyTutorial = (): TutorialProgress => ({ tutorialVersion: 0,
  tutorialStep: 'done', tutorialCompleted: true, tutorialSkipped: false });
export const tutorialActive = (value: TutorialProgress) => !value.tutorialCompleted && !value.tutorialSkipped;
export function playerName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.normalize('NFC').trim().replace(/ +/g, ' ');
  return Array.from(name).length >= 2 && Array.from(name).length <= 24 && /^[\p{L}\p{M}\p{N} ]+$/u.test(name)
    ? name : undefined;
}
const advance = (value: TutorialProgress, step: TutorialStep): TutorialProgress => ({ ...value,
  tutorialStep: step, tutorialCompleted: step === 'done' });

/** Only the server calls this reducer to authorize and atomically persist a transition. */
export function tutorialTransition(progress: TutorialProgress, command: GameCommand,
  before: SaveV2, after: SaveV2, receipt: unknown, requestId: string): TutorialProgress | undefined {
  if (command.type === 'tutorial') {
    if (!tutorialActive(progress) || command.version !== progress.tutorialVersion || command.step !== progress.tutorialStep)
      return undefined;
    if (command.action === 'skip') return { ...progress, tutorialSkipped: true };
    if (command.action === 'name') return progress.tutorialStep === 'welcome' && playerName(command.name)
      ? advance(progress, 'starter_heroes') : undefined;
    if (command.action !== 'next') return undefined;
    const next: Partial<Record<TutorialStep, TutorialStep>> = {
      starter_heroes: 'formation', campaign: 'battle_intro', battle_intro: 'battle', rewards: 'inventory',
      inventory: 'upgrade', lobby_tour: 'summon_intro', summon_intro: 'welfare_intro',
      welfare_intro: 'arena_intro', arena_intro: 'done',
    };
    const step = next[progress.tutorialStep];
    return step ? advance(progress, step) : undefined;
  }
  if (!tutorialActive(progress)) return progress;
  if (progress.tutorialVersion !== TUTORIAL_VERSION) return undefined;
  if (progress.tutorialStep === 'formation' && command.type === 'formation' && command.slot === 0 &&
      command.heroId === 'zhang-fei' && after.formation[0] === 'zhang-fei' && receipt === true)
    return advance(progress, 'campaign');
  if (progress.tutorialStep === 'battle' && command.type === 'battle' && command.ticket.stageId === '1-1') {
    const result = receipt as { winner?: string; rewards?: string[]; firstClear?: boolean };
    return result?.winner === 'player' && after.clearedStages.includes('1-1')
      ? { ...advance(progress, 'rewards'), battleReceipt: { requestId, rewards: result.rewards ?? [], firstClear: result.firstClear === true } } : progress;
  }
  if (progress.tutorialStep === 'upgrade' && command.type === 'upgrade' && command.heroId === 'zhang-fei' &&
      (after.heroExp['zhang-fei'] ?? 0) > (before.heroExp['zhang-fei'] ?? 0) && receipt === true)
    return advance(progress, 'lobby_tour');
  return undefined;
}
