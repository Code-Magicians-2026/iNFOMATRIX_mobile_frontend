import {
  createChildMock,
  getChildrenMock,
  type CreateChildMockInput,
} from '@/src/features/mvp/services';
import type { ChildProfile } from '@/shared/models/mvp-contracts.model';

export type CreateChildInput = CreateChildMockInput;

export const childrenService = {
  getChildren: async (): Promise<ChildProfile[]> => getChildrenMock(),

  createChild: async (input: CreateChildInput): Promise<ChildProfile> =>
    createChildMock(input),
};
