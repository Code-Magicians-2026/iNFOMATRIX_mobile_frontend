import type { ChildProfile } from '@/shared/models/mvp-contracts.model';

export const mockChildren: ChildProfile[] = [
  {
    id: 'child-1',
    fullName: 'Marta Horizon',
    age: 10,
    interests: ['math', 'robotics'],
    notes: 'Works best with short gamified sessions.',
    createdByAdultId: 'adult-1',
    level: 3,
    xp: 360,
    streak: 4,
  },
  {
    id: 'child-2',
    fullName: 'Oleh Quester',
    age: 12,
    interests: ['science', 'reading'],
    notes: 'Responds well to challenge-based tasks.',
    createdByAdultId: 'adult-1',
    level: 2,
    xp: 190,
    streak: 2,
  },
];
