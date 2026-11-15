import type { BattleUnit } from '../domain/battle';

export interface ArenaOpponent { uid: string; name: string; power: number; points: number; formation: (string | null)[] }
export interface ArenaView {
  status: 'ok';
  season: number;
  endsAt: string;
  enrolled: boolean;
  points: number | null;
  rank: number | null;
  remaining: number;
  opponents: ArenaOpponent[];
  board: (Omit<ArenaOpponent, 'uid' | 'formation'> & { rank: number })[];
  history: { request_id: string; defender_name: string; won: boolean; delta: number; played_at: string }[];
  reward: { season: number; gold: number; claimed: boolean } | null;
}
export interface ArenaResult { status: 'ok'; won: boolean; points: number; delta: number; replay: BattleUnit[] }
export type ArenaRequest = { action: 'view' | 'publish' } |
  { action: 'claim'; season: number } | { action: 'challenge'; opponent: string; requestId: string };
