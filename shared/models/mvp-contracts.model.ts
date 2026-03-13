export interface UserProfile {
  id: string;
  name: string;
  level: number;
  xp: number;
  streak: number;
  avatarType: string;
}

export interface Quest {
  id: string;
  title: string;
  originalTask: string;
  description: string;
  difficulty: string;
  rewardXp: number;
  status: string;
  category: string;
  createdAt: string;
}

export interface AvatarStats {
  health: number;
  study: number;
  sport: number;
  productivity: number;
}

export interface LeaderboardItem {
  userId: string;
  name: string;
  rank: number;
  xp: number;
  fairScore: number;
}

export type ChatRole = 'user' | 'agent';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
}
