export type UserRole = 'adult' | 'child';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdByAdultId?: string;
  activeChildId?: string;
  level: number;
  xp: number;
  streak: number;
  avatarType: string;
}

export interface ChildProfile {
  id: string;
  fullName: string;
  age: number;
  interests?: string[];
  notes?: string;
  createdByAdultId: string;
  level: number;
  xp: number;
  streak: number;
}

export interface CapturedPhoto {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  previewUri?: string;
}

export interface PlanRequest {
  id: string;
  targetUserId: string;
  prompt: string;
  category?: string;
  intensity?: string;
  photo?: CapturedPhoto;
  status: string;
}

export type QuestStepStatus = 'pending' | 'completed';

export type QuestStatus = 'draft' | 'active' | 'completed' | 'archived';
export type QuestRewardType = 'money' | 'screen_time' | 'treat' | 'activity' | 'custom';
export type QuestPhotoSyncStatus = 'not_sent' | 'pending' | 'sent';
export type QuestPhotosSyncStatus = 'local_only' | 'pending_sync' | 'synced';

export interface QuestPhoto {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  createdAt: string;
  syncStatus?: QuestPhotoSyncStatus;
}

export interface QuestStep {
  id: string;
  questId: string;
  title: string;
  description?: string;
  order: number;
  status: QuestStepStatus;
  completedAt?: string;
}

export interface Quest {
  id: string;
  assignedToUserId: string;
  title: string;
  description: string;
  // Legacy field kept optional for old mock payload compatibility.
  category?: string;
  difficulty: string;
  rewardXp: number;
  rewardType?: QuestRewardType;
  rewardTitle?: string;
  rewardDescription?: string;
  rewardValue?: number | null;
  rewardCurrencyOrUnit?: string | null;
  rewardUpdatedAt?: string;
  estimatedMinutes: number;
  status: QuestStatus;
  beforePhoto?: QuestPhoto | null;
  afterPhoto?: QuestPhoto | null;
  reportPhotoRequired?: boolean;
  photosSyncStatus?: QuestPhotosSyncStatus;
  visionSummary?: string | null;
  visionSummaryCheckedAt?: string | null;
  stepsCount?: number;
  completedStepsCount?: number;
  steps?: QuestStep[];
  // Legacy MVP fields still used by existing screens.
  originalTask?: string;
  createdAt?: string;
  completedAt?: string;
  archivedAt?: string;
}

export interface GeneratedPlan {
  id: string;
  title: string;
  summary: string;
  childMessage: string;
  quests: Quest[];
  totalEstimatedMinutes: number;
  status: string;
}

export interface ProgressSummary {
  userId: string;
  level: number;
  xp: number;
  streak: number;
  completedQuestsCount: number;
  activeQuestsCount: number;
  stats: Record<string, number>;
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
