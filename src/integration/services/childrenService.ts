import useAuthStore from '@/context/Auth-store';
import { ApiError } from '@/src/features/auth/api/client';
import { authService } from '@/src/integration/services/authService';
import type { RegisterChildRequestDto } from '@/src/features/auth/dto/auth.dto';
import type { ChildProfile } from '@/shared/models/mvp-contracts.model';

export type CreateChildInput = RegisterChildRequestDto;
const CHILDREN_CACHE_TTL_MS = 20_000;
type GetChildrenOptions = {
  forceRefresh?: boolean;
};

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

const cloneChildProfile = (child: ChildProfile): ChildProfile => ({
  ...child,
  interests: child.interests ? [...child.interests] : undefined,
});

const cloneChildren = (children: ChildProfile[]) => children.map(cloneChildProfile);

const isUnauthorizedError = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

const tryRefreshAccessToken = async (): Promise<string | null> => {
  const authState = useAuthStore.getState();
  const session = authState.session;
  if (!session?.accessToken || !session.refreshToken) {
    return null;
  }

  try {
    const token = await authService.refreshToken({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    await authState.createSessionFromToken(token, session.email);
    return useAuthStore.getState().session?.accessToken ?? null;
  } catch {
    return null;
  }
};

const withAuthRecovery = async <T>(request: (accessToken: string) => Promise<T>): Promise<{
  payload: T;
  accessToken: string;
}> => {
  const initialAccessToken = useAuthStore.getState().session?.accessToken;
  if (!initialAccessToken) {
    throw new Error('Для виконання запиту потрібна авторизація.');
  }

  try {
    const payload = await request(initialAccessToken);
    return { payload, accessToken: initialAccessToken };
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      throw error;
    }

    const refreshedAccessToken = await tryRefreshAccessToken();
    if (!refreshedAccessToken || refreshedAccessToken === initialAccessToken) {
      throw error;
    }

    const payload = await request(refreshedAccessToken);
    return { payload, accessToken: refreshedAccessToken };
  }
};

let childrenCache:
  | {
      accessToken: string;
      fetchedAt: number;
      children: ChildProfile[];
    }
  | null = null;

let inFlightChildrenRequest:
  | {
      accessToken: string;
      promise: Promise<ChildProfile[]>;
      requestId: number;
    }
  | null = null;
let childrenRequestId = 0;

export const childrenService = {
  getChildren: async (options: GetChildrenOptions = {}): Promise<ChildProfile[]> => {
    const accessToken = useAuthStore.getState().session?.accessToken;
    if (!accessToken) {
      throw new Error('Для отримання списку дітей потрібна авторизація.');
    }

    const forceRefresh = options.forceRefresh === true;
    const now = Date.now();
    const isFreshCache =
      !forceRefresh &&
      childrenCache?.accessToken === accessToken &&
      now - childrenCache.fetchedAt < CHILDREN_CACHE_TTL_MS;
    if (isFreshCache && childrenCache) {
      return cloneChildren(childrenCache.children);
    }

    if (!forceRefresh && inFlightChildrenRequest?.accessToken === accessToken) {
      const children = await inFlightChildrenRequest.promise;
      return cloneChildren(children);
    }

    const requestId = childrenRequestId + 1;
    childrenRequestId = requestId;
    let resolvedRequestAccessToken = accessToken;
    const requestPromise = (async () => {
      const { payload: response, accessToken: resolvedAccessToken } = await withAuthRecovery(
        (token) => authService.getFamilyChildren(token),
      );
      resolvedRequestAccessToken = resolvedAccessToken;
      const rawChildren = extractChildrenList(response);
      return rawChildren
        .map((item, index) => toChildProfile(item, index))
        .filter((item): item is ChildProfile => item !== null);
    })();

    inFlightChildrenRequest = {
      accessToken,
      promise: requestPromise,
      requestId,
    };

    try {
      const children = await requestPromise;
      if (inFlightChildrenRequest?.requestId === requestId) {
        childrenCache = {
          accessToken: resolvedRequestAccessToken,
          fetchedAt: Date.now(),
          children: cloneChildren(children),
        };
      }
      return cloneChildren(children);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 504 || error.status === 408) &&
        childrenCache?.accessToken === accessToken
      ) {
        return cloneChildren(childrenCache.children);
      }

      throw error;
    } finally {
      if (inFlightChildrenRequest?.requestId === requestId) {
        inFlightChildrenRequest = null;
      }
    }
  },

  createChild: async (input: CreateChildInput): Promise<ChildProfile> => {
    const session = useAuthStore.getState().session;
    if (!session?.accessToken) {
      throw new Error('Для створення дитини потрібна авторизація.');
    }

    await withAuthRecovery((token) => authService.registerChild(input, token));
    childrenCache = null;
    inFlightChildrenRequest = null;
    const children = await childrenService.getChildren({ forceRefresh: true });
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
