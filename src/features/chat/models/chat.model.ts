export type ChatRole = 'user' | 'agent';

export interface ChatThread {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}
