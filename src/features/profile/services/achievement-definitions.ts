export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic';
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_quest',
    title: 'First Quest',
    description: 'Complete your first quest.',
    icon: 'medal-outline',
    category: 'Quest',
    rarity: 'common',
  },
  {
    id: 'step_master',
    title: 'Step Master',
    description: 'Complete a quest with all steps finished.',
    icon: 'list-outline',
    category: 'Execution',
    rarity: 'common',
  },
  {
    id: 'photo_reporter',
    title: 'Photo Reporter',
    description: 'Complete a quest with a photo report.',
    icon: 'camera-outline',
    category: 'Report',
    rarity: 'rare',
  },
  {
    id: 'reward_hunter',
    title: 'Reward Hunter',
    description: 'Complete a quest with a reward configured.',
    icon: 'gift-outline',
    category: 'Reward',
    rarity: 'rare',
  },
  {
    id: 'three_day_streak',
    title: '3-Day Streak',
    description: 'Reach a 3 day streak.',
    icon: 'flame-outline',
    category: 'Consistency',
    rarity: 'rare',
  },
  {
    id: 'quest_explorer',
    title: 'Quest Explorer',
    description: 'Complete 5 quests.',
    icon: 'map-outline',
    category: 'Milestone',
    rarity: 'epic',
  },
  {
    id: 'family_helper',
    title: 'Family Helper',
    description: 'Complete your first family quest.',
    icon: 'people-outline',
    category: 'Family',
    rarity: 'common',
  },
  {
    id: 'ai_adventurer',
    title: 'AI Adventurer',
    description: 'Complete a quest generated with AI.',
    icon: 'sparkles-outline',
    category: 'AI',
    rarity: 'epic',
  },
  {
    id: 'scene_scout',
    title: 'Scene Scout',
    description: 'Attach your first photo to an AI prompt.',
    icon: 'camera-outline',
    category: 'AI',
    rarity: 'common',
  },
  {
    id: 'detail_hunter',
    title: 'Detail Hunter',
    description: 'Attach a high-detail photo to an AI prompt.',
    icon: 'scan-outline',
    category: 'AI',
    rarity: 'rare',
  },
  {
    id: 'eagle_eye',
    title: 'Eagle Eye',
    description: 'Attach a 6MP+ photo to an AI prompt.',
    icon: 'eye-outline',
    category: 'AI',
    rarity: 'epic',
  },
];

const definitionsById = new Map(ACHIEVEMENT_DEFINITIONS.map((definition) => [definition.id, definition]));

export const getAchievementDefinitionById = (id: string): AchievementDefinition | null =>
  definitionsById.get(id) ?? null;
