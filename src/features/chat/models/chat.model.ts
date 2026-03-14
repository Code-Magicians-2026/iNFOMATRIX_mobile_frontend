import type { ChatMessage, ChatRole } from '@/shared/models/mvp-contracts.model';

export type { ChatMessage, ChatRole };

export interface ChatThread {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
}
