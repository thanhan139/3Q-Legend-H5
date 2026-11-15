import type { CampaignStage } from '../domain/types';

const OPPONENTS = ['hua-xiong','dian-wei','xiahou-dun','gan-ning','da-qiao','cao-cao'];
const BOSS_IDS = ['xiahou-dun', 'cao-cao', 'cao-cao'];

export function stageOpponents(stage: CampaignStage): string[] {
  const enemies = OPPONENTS.slice(0, stage.enemyCount);
  if (stage.stage === 5) enemies[enemies.length - 1] = BOSS_IDS[stage.chapter - 1];
  return enemies;
}

export const STAGES: readonly CampaignStage[] = Array.from({length:3}, (_,chapterIndex) =>
  Array.from({length:5}, (_,stageIndex) => {
    const chapter=chapterIndex+1; const stage=stageIndex+1;
    return {
      id:`${chapter}-${stage}`, chapter, stage,
      name:chapter===1?'Loạn Thế Khởi Đầu':chapter===2?'Chiến Dịch Kinh Châu':'Anh Hùng Hội Tụ',
      enemyCount:chapter===1?3:chapter===2?(stage<3?4:5):6,
      enemyLevel:1+chapterIndex*5+stageIndex,
      goldReward:200+chapterIndex*180+stageIndex*60,
      goldKeysReward:stage===3?5:0,
      trainingReward: 300 + chapterIndex * 100 + (stage === 5 ? 200 : 0)
    };
  })
).flat();

// Milestone rewards are granted once after first clear, even if a user replays a stage.
export const HERO_MILESTONES: Readonly<Record<string,string>> = {
  '2-1':'zhao-yun', '2-4':'huang-yueying', '3-1':'ma-chao'
};
export const SUMMON_UNLOCK_STAGE = '1-3';
export function nextStage(id:string): CampaignStage | undefined {
  const index=STAGES.findIndex(stage=>stage.id===id);
  return index<0?undefined:STAGES[index+1];
}
