import type { ChatMessage } from '@/shared/models/mvp-contracts.model';

export const mockChat: ChatMessage[] = [
  {
    id: 'chat-msg-1',
    role: 'agent',
    text: 'Привіт! Скинь задачу, і я перетворю її в quest.',
    createdAt: '2026-03-13T09:00:00.000Z',
  },
  {
    id: 'chat-msg-2',
    role: 'user',
    text: 'Треба підготуватися до демо і зробити 2 ключові екрани.',
    createdAt: '2026-03-13T09:01:00.000Z',
  },
  {
    id: 'chat-msg-3',
    role: 'agent',
    text: 'Прийнято. Розіб`ємо це на два квести зі зрозумілими нагородами XP.',
    createdAt: '2026-03-13T09:01:30.000Z',
  },
];
