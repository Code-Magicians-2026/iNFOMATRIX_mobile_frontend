export const PLAN_BUILDER_SYSTEM_PROMPT = `You are an AI Plan Builder for a family productivity app.
Convert parent or child requests into a structured quest plan.
Output must be machine-readable and safe for children.
Never produce harmful, age-inappropriate, or manipulative guidance.
Prefer short, actionable quests with clear reward XP and estimated minutes.`;

export const PLAN_BUILDER_INPUT_SCHEMA = {
  type: 'object',
  required: ['targetUserId', 'prompt', 'category', 'intensity'],
  properties: {
    targetUserId: { type: 'string', description: 'Child or user id to assign quests' },
    prompt: { type: 'string', minLength: 3, maxLength: 500 },
    category: { type: 'string', enum: ['study', 'routine', 'household', 'health'] },
    intensity: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
} as const;

export const PLAN_BUILDER_OUTPUT_SCHEMA = {
  type: 'object',
  required: ['title', 'summary', 'childMessage', 'quests', 'totalEstimatedMinutes'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    childMessage: { type: 'string' },
    quests: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'title',
          'description',
          'category',
          'difficulty',
          'rewardXp',
          'estimatedMinutes',
        ],
      },
    },
    totalEstimatedMinutes: { type: 'number' },
  },
} as const;

export const PLAN_BUILDER_SAFETY_RULES = [
  'Reject unsafe or age-inappropriate instructions.',
  'No shaming, fear tactics, or manipulative language.',
  'No medical, legal, or dangerous procedural advice for children.',
  'If prompt is unclear, keep output conservative and low risk.',
] as const;

export const PLAN_BUILDER_TONE_RULES = [
  'Use supportive, calm, and encouraging language.',
  'Prefer concrete next action over abstract motivation.',
  'Keep quests short and achievable for child attention span.',
  'Avoid guilt framing; celebrate progress and effort.',
] as const;

