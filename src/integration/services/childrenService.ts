import useAuthStore from '@/context/Auth-store';
import { authService } from '@/src/integration/services/authService';
import type { RegisterChildRequestDto } from '@/src/features/auth/dto/auth.dto';
import type { ChildProfile } from '@/shared/models/mvp-contracts.model';

export type CreateChildInput = RegisterChildRequestDto;

type UnknownRecord = Record<string, unknown>;

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const toNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const toNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : undefined;
};

const pickString = (source: UnknownRecord, keys: string[]): string | null => {
  for (const key of keys) {
    const value = toNonEmptyString(source[key]);
    if (value) {
      return value;
    }
  }

  return null;
};

const buildFullName = (source: UnknownRecord): string | null => {
  const fullName = pickString(source, ['fullName', 'name', 'FullName', 'Name']);
  if (fullName) {
    return fullName;
  }

  const firstName = pickString(source, ['firstName', 'FirstName']);
  const lastName = pickString(source, ['lastName', 'LastName']);
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  return firstName ?? lastName;
};

const extractChildrenList = (payload: unknown, depth = 0): unknown[] => {
  if (depth > 4 || payload === null || payload === undefined) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isObject(payload)) {
    return [];
  }

  const nestedCandidates = [
    payload.children,
    payload.items,
    payload.data,
    payload.result,
    payload.value,
  ];

  for (const candidate of nestedCandidates) {
    const resolved = extractChildrenList(candidate, depth + 1);
    if (resolved.length > 0) {
      return resolved;
    }
  }

  return [payload];
};

const toChildProfile = (payload: unknown, index: number): ChildProfile | null => {
  if (!isObject(payload)) {
    return null;
  }

  const id =
    pickString(payload, ['id', 'childId', 'userId', 'Id', 'ChildId', 'UserId']) ??
    `api-child-${index + 1}`;
  const fullName = buildFullName(payload) ?? `Child ${index + 1}`;
  const age = toNumber(payload.age) ?? toNumber(payload.Age) ?? 10;
  const createdByAdultId =
    pickString(payload, ['createdByAdultId', 'adultId', 'parentId', 'CreatedByAdultId']) ??
    'adult-1';
  const level = toNumber(payload.level) ?? toNumber(payload.Level) ?? 1;
  const xp = toNumber(payload.xp) ?? toNumber(payload.Xp) ?? 0;
  const streak = toNumber(payload.streak) ?? toNumber(payload.Streak) ?? 0;

  return {
    id,
    fullName,
    age,
    interests: toStringArray(payload.interests ?? payload.Interests),
    notes: pickString(payload, ['notes', 'Notes']) ?? undefined,
    createdByAdultId,
    level,
    xp,
    streak,
  };
};

export const childrenService = {
  getChildren: async (): Promise<ChildProfile[]> => {
    const accessToken = useAuthStore.getState().session?.accessToken;
    if (!accessToken) {
      throw new Error('Для отримання списку дітей потрібна авторизація.');
    }

    const response = await authService.getFamilyChildren(accessToken);
    const rawChildren = extractChildrenList(response);
    return rawChildren
      .map((item, index) => toChildProfile(item, index))
      .filter((item): item is ChildProfile => item !== null);
  },

  createChild: async (input: CreateChildInput): Promise<ChildProfile> => {
    const accessToken = useAuthStore.getState().session?.accessToken;
    if (!accessToken) {
      throw new Error('Для створення дитини потрібна авторизація.');
    }

    await authService.registerChild(input, accessToken);
    const children = await childrenService.getChildren();
    const fullName = `${input.firstName} ${input.lastName}`.trim().toLowerCase();
    const resolved =
      children.find((child) => child.fullName.trim().toLowerCase() === fullName) ??
      children[children.length - 1];

    if (!resolved) {
      throw new Error('Дитину створено, але не вдалося оновити список дітей.');
    }

    return resolved;
  },
};
