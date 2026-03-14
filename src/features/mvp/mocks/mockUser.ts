import type { AvatarStats, UserProfile } from '@/shared/models/mvp-contracts.model';

export const mockUserProfile: UserProfile = {
  id: 'user-1',
  fullName: 'Alex Infomatrix',
  email: 'alex@infomatrix.app',
  role: 'adult',
  level: 4,
  xp: 860,
  streak: 6,
  avatarType: 'cyber-scholar',
};

export const mockAvatarStats: AvatarStats = {
  health: 71,
  study: 83,
  sport: 58,
  productivity: 79,
};
