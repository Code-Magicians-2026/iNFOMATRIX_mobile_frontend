import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import usePlansStore from '@/context/Plans-store';
import { ApiError } from '@/src/features/auth/api/client';
import type { TokenDto } from '@/src/features/auth/dto/auth.dto';
import type { AuthSession } from '@/src/features/auth/models/auth-session.model';
import { authService } from '@/src/integration/services/authService';
import type { UserProfile, UserRole } from '@/shared/models/mvp-contracts.model';

interface FamilySummary {
  id: string | null;
  name: string | null;
}

interface RegisterChildInput {
  firstName: string;
  lastName: string;
  password: string;
}

interface AuthState {
  session: AuthSession | null;
  currentUser: UserProfile | null;
  role: UserRole | null;
  selectedChildId: string | null;
  family: FamilySummary | null;
  pendingFamilyName: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  confirmEmail: (email: string, token: string) => Promise<void>;
  completePasswordReset: (email: string, newPassword: string) => Promise<void>;
  createSessionFromToken: (token: TokenDto, fallbackEmail?: string) => Promise<void>;
  setCurrentUserProgress: (input: {
    userId: string;
    xp: number;
    level: number;
    streak?: number;
  }) => Promise<void>;
  refreshFamily: () => Promise<FamilySummary | null>;
  registerChild: (payload: RegisterChildInput) => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  setSelectedChildId: (childId: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

type PersistedAuthEnvelope = {
  session: AuthSession | null;
  currentUser: UserProfile | null;
  role: UserRole | null;
  selectedChildId: string | null;
  family: FamilySummary | null;
  pendingFamilyName: string | null;
};

const STORAGE_KEY = 'AUTH_SESSION';
const FORCE_ADULT_EMAILS = new Set(['vindener.tv@gmail.com']);
const FORCE_CHILD_PARENT_EMAIL_BY_CHILD_EMAIL = {
  'vindener.tv+bogdan@gmail.com': 'vindener.tv@gmail.com',
} as const;
const FORCE_CHILD_EMAILS = new Set(Object.keys(FORCE_CHILD_PARENT_EMAIL_BY_CHILD_EMAIL));

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeEmail = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const shouldForceAdultRole = (email: string | null | undefined): boolean =>
  FORCE_ADULT_EMAILS.has(normalizeEmail(email));

const shouldForceChildRole = (email: string | null | undefined): boolean =>
  FORCE_CHILD_EMAILS.has(normalizeEmail(email));

const resolveRoleWithSpecialEmailRules = (
  role: UserRole,
  email: string | null | undefined,
): UserRole => {
  if (shouldForceAdultRole(email)) {
    return 'adult';
  }

  if (shouldForceChildRole(email)) {
    return 'child';
  }

  return role;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRole = (value: unknown): value is UserRole => value === 'adult' || value === 'child';

const isValidSession = (value: unknown): value is AuthSession =>
  isObject(value) &&
  isNonEmptyString(value.email) &&
  isNonEmptyString(value.accessToken) &&
  (value.refreshToken === null || isNonEmptyString(value.refreshToken)) &&
  typeof value.expiresIn === 'number' &&
  isNonEmptyString(value.tokenType);

const isValidUserProfile = (value: unknown): value is UserProfile =>
  isObject(value) &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.fullName) &&
  isNonEmptyString(value.email) &&
  isRole(value.role) &&
  typeof value.level === 'number' &&
  typeof value.xp === 'number' &&
  typeof value.streak === 'number' &&
  isNonEmptyString(value.avatarType);

const isValidFamilySummary = (value: unknown): value is FamilySummary =>
  isObject(value) &&
  (value.id === null || isNonEmptyString(value.id)) &&
  (value.name === null || isNonEmptyString(value.name));

const buildSessionFromToken = (token: TokenDto, fallbackEmail?: string): AuthSession => {
  if (!token.accessToken) {
    throw new Error('Сервер не повернув access token.');
  }

  const email = token.email ?? fallbackEmail ?? null;
  if (!email) {
    throw new Error('Сервер не повернув email користувача.');
  }

  return {
    email,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? null,
    expiresIn: token.expiresIn,
    tokenType: token.tokenType ?? 'Bearer',
  };
};

const fallbackNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] ?? 'User';
  const normalized = localPart.replace(/[._-]+/g, ' ').trim();
  if (!normalized) {
    return 'User';
  }

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(' ');
};

const normalizeUserId = (email: string) => {
  const normalized = email
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'local-user';
};

const resolveForcedCreatedByAdultId = (
  email: string,
  role: UserRole,
  existingCreatedByAdultId?: string,
): string | undefined => {
  if (existingCreatedByAdultId) {
    return existingCreatedByAdultId;
  }

  if (role !== 'child') {
    return undefined;
  }

  const parentEmail =
    FORCE_CHILD_PARENT_EMAIL_BY_CHILD_EMAIL[
      normalizeEmail(email) as keyof typeof FORCE_CHILD_PARENT_EMAIL_BY_CHILD_EMAIL
    ];

  if (!parentEmail) {
    return undefined;
  }

  return `user-${normalizeUserId(parentEmail)}`;
};

const pickFirstString = (
  source: Record<string, unknown>,
  keys: string[],
): string | null => {
  for (const key of keys) {
    if (isNonEmptyString(source[key])) {
      return source[key];
    }
  }

  return null;
};

const extractFamilySummary = (
  payload: unknown,
  depth = 0,
  withinFamilyBranch = false,
): FamilySummary | null => {
  if (depth > 4 || payload === null || payload === undefined) {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const parsed = extractFamilySummary(item, depth + 1, withinFamilyBranch);
      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  if (!isObject(payload)) {
    return null;
  }

  const explicitFamilyId = pickFirstString(payload, [
    'familyId',
    'familyID',
    'family_id',
    'FamilyId',
    'FamilyID',
    'Family_Id',
  ]);
  const explicitFamilyName = pickFirstString(payload, [
    'familyName',
    'family_name',
    'FamilyName',
    'Family_Name',
  ]);
  if (explicitFamilyId || explicitFamilyName) {
    return {
      id: explicitFamilyId ?? null,
      name: explicitFamilyName ?? null,
    };
  }

  const nestedCandidates: Array<{ value: unknown; nextWithinFamilyBranch: boolean }> = [
    { value: payload.family, nextWithinFamilyBranch: true },
    { value: payload.families, nextWithinFamilyBranch: true },
    { value: payload.data, nextWithinFamilyBranch: withinFamilyBranch },
    { value: payload.result, nextWithinFamilyBranch: withinFamilyBranch },
    { value: payload.item, nextWithinFamilyBranch: withinFamilyBranch },
    { value: payload.items, nextWithinFamilyBranch: withinFamilyBranch },
    { value: payload.value, nextWithinFamilyBranch: withinFamilyBranch },
  ];

  for (const candidate of nestedCandidates) {
    const parsed = extractFamilySummary(
      candidate.value,
      depth + 1,
      candidate.nextWithinFamilyBranch,
    );
    if (parsed) {
      return parsed;
    }
  }

  const genericName = pickFirstString(payload, ['name', 'Name']);
  const genericId = pickFirstString(payload, ['id', 'Id']);
  if (genericName || (withinFamilyBranch && genericId)) {
    return {
      id: genericId ?? null,
      name: genericName ?? null,
    };
  }

  return null;
};

const resolveFamilyName = (lastName: string) => {
  const normalizedLastName = lastName.trim();
  if (normalizedLastName.length > 0) {
    return `${normalizedLastName}'s`;
  }

  return 'My Family';
};

const isUnauthorizedError = (error: unknown) =>
  error instanceof ApiError && (error.status === 401 || error.status === 403);

const isFamilyNotFoundError = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    const normalizedMessage = error.message.trim().toLowerCase();
    return normalizedMessage.includes('family') && normalizedMessage.includes('not found');
  }

  if (error instanceof Error) {
    const normalizedMessage = error.message.trim().toLowerCase();
    return normalizedMessage.includes('family') && normalizedMessage.includes('not found');
  }

  return false;
};

const normalizeProgressNumber = (value: number, fallback: number, min: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.round(value))
    : fallback;

const buildLocalUser = (role: UserRole): UserProfile => ({
  id: `local-${role}`,
  fullName: role === 'adult' ? 'Parent Profile' : 'Child Profile',
  email: `${role}@local.infomatrix`,
  role,
  level: 1,
  xp: 0,
  streak: 0,
  avatarType: role === 'adult' ? 'mentor' : 'adventurer',
});

const buildUserFromSession = (
  session: AuthSession,
  role: UserRole,
  userId?: string,
  existingUser?: UserProfile | null,
): UserProfile => ({
  id: userId ?? existingUser?.id ?? `user-${normalizeUserId(session.email)}`,
  fullName: existingUser?.fullName ?? fallbackNameFromEmail(session.email),
  email: session.email,
  role,
  createdByAdultId: resolveForcedCreatedByAdultId(session.email, role, existingUser?.createdByAdultId),
  activeChildId: role === 'adult' ? existingUser?.activeChildId : undefined,
  level: existingUser?.level ?? 1,
  xp: existingUser?.xp ?? 0,
  streak: existingUser?.streak ?? 0,
  avatarType: existingUser?.avatarType ?? (role === 'adult' ? 'mentor' : 'adventurer'),
});

const persistState = async (payload: PersistedAuthEnvelope) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
};

const readSelectedChildId = (rawValue: unknown, role: UserRole | null) => {
  if (role !== 'adult' || !isNonEmptyString(rawValue)) {
    return null;
  }

  return rawValue;
};

const readPendingFamilyName = (rawValue: unknown): string | null =>
  isNonEmptyString(rawValue) ? rawValue.trim() : null;

const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  currentUser: null,
  role: null,
  selectedChildId: null,
  family: null,
  pendingFamilyName: null,
  isHydrated: false,

  hydrate: async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (!value) {
        set({
          session: null,
          currentUser: null,
          role: null,
          selectedChildId: null,
          family: null,
          pendingFamilyName: null,
          isHydrated: true,
        });
        return;
      }

      const parsed = JSON.parse(value) as unknown;

      // Legacy payload: AuthSession only.
      if (isValidSession(parsed)) {
        const legacyRole: UserRole = 'child';
        const legacyUser = buildUserFromSession(parsed, legacyRole);
        const migratedState: PersistedAuthEnvelope = {
          session: parsed,
          currentUser: legacyUser,
          role: legacyRole,
          selectedChildId: null,
          family: null,
          pendingFamilyName: null,
        };

        set({ ...migratedState, isHydrated: true });
        await persistState(migratedState);
        return;
      }

      if (!isObject(parsed)) {
        set({
          session: null,
          currentUser: null,
          role: null,
          selectedChildId: null,
          family: null,
          pendingFamilyName: null,
          isHydrated: true,
        });
        return;
      }

      const session = isValidSession(parsed.session) ? parsed.session : null;
      const persistedRole = isRole(parsed.role) ? parsed.role : null;
      const persistedUser = isValidUserProfile(parsed.currentUser) ? parsed.currentUser : null;
      const persistedFamily = isValidFamilySummary(parsed.family) ? parsed.family : null;
      const persistedPendingFamilyName = readPendingFamilyName(parsed.pendingFamilyName);

      if (!session) {
        set({
          session: null,
          currentUser: null,
          role: persistedRole,
          selectedChildId: null,
          family: null,
          pendingFamilyName: persistedPendingFamilyName,
          isHydrated: true,
        });
        return;
      }

      const resolvedRole = resolveRoleWithSpecialEmailRules(
        persistedRole ?? persistedUser?.role ?? 'adult',
        session.email,
      );
      const currentUser = buildUserFromSession(session, resolvedRole, persistedUser?.id, persistedUser);
      const selectedChildId =
        readSelectedChildId(parsed.selectedChildId, resolvedRole) ??
        (resolvedRole === 'adult' ? currentUser.activeChildId ?? null : null);

      set({
        session,
        currentUser,
        role: resolvedRole,
        selectedChildId,
        family: persistedFamily,
        pendingFamilyName: persistedPendingFamilyName,
        isHydrated: true,
      });
    } catch {
      set({
        session: null,
        currentUser: null,
        role: null,
        selectedChildId: null,
        family: null,
        pendingFamilyName: null,
        isHydrated: true,
      });
    }
  },

  register: async (firstName: string, lastName: string, email: string, password: string) => {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const resolvedFamilyName = resolveFamilyName(normalizedLastName);

    await authService.register({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email,
      password,
    });

    // Family creation should not block account registration.
    const pendingPayload: PersistedAuthEnvelope = {
      session: null,
      currentUser: null,
      role: 'adult',
      selectedChildId: null,
      family: null,
      pendingFamilyName: resolvedFamilyName,
    };

    set({
      role: 'adult',
      selectedChildId: null,
      pendingFamilyName: resolvedFamilyName,
      family: null,
    });
    await persistState(pendingPayload);
  },

  login: async (email: string, password: string) => {
    const token = await authService.login({ email, password });
    await get().createSessionFromToken(token, email);
    void (async () => {
      let shouldClearPendingFamilyName = false;

      try {
        const currentSession = get().session;
        const pendingFamilyName = get().pendingFamilyName;
        if (currentSession && pendingFamilyName) {
          try {
            await authService.createFamily({ name: pendingFamilyName }, currentSession.accessToken);
            shouldClearPendingFamilyName = true;
          } catch {}
        }

        try {
          const family = await get().refreshFamily();
          if (family?.id || family?.name) {
            shouldClearPendingFamilyName = true;
          }
        } catch {}
      } finally {
        if (shouldClearPendingFamilyName) {
          set({ pendingFamilyName: null });
        }

        const snapshot = get();
        const payload: PersistedAuthEnvelope = {
          session: snapshot.session,
          currentUser: snapshot.currentUser,
          role: snapshot.role,
          selectedChildId: snapshot.selectedChildId,
          family: snapshot.family,
          pendingFamilyName: snapshot.pendingFamilyName,
        };

        if (payload.session) {
          await persistState(payload);
        }
      }
    })().catch(() => {});
  },

  confirmEmail: async (email: string, token: string) => {
    const response = await authService.confirmEmail({ email, token });
    await get().createSessionFromToken(response, email);
    // Do not block UI transition after successful confirmation.
    void (async () => {
      let shouldClearPendingFamilyName = false;

      try {
        const currentSession = get().session;
        const pendingFamilyName = get().pendingFamilyName;
        if (currentSession && pendingFamilyName) {
          try {
            await authService.createFamily({ name: pendingFamilyName }, currentSession.accessToken);
            shouldClearPendingFamilyName = true;
          } catch {}
        }

        try {
          const family = await get().refreshFamily();
          if (family?.id || family?.name) {
            shouldClearPendingFamilyName = true;
          }
        } catch {}
      } finally {
        if (shouldClearPendingFamilyName) {
          set({ pendingFamilyName: null });
        }

        const snapshot = get();
        const payload: PersistedAuthEnvelope = {
          session: snapshot.session,
          currentUser: snapshot.currentUser,
          role: snapshot.role,
          selectedChildId: snapshot.selectedChildId,
          family: snapshot.family,
          pendingFamilyName: snapshot.pendingFamilyName,
        };

        if (payload.session) {
          await persistState(payload);
        }
      }
    })().catch(() => {});
  },

  completePasswordReset: async (email: string, newPassword: string) => {
    const response = await authService.resetPassword({ email, newPassword });
    await get().createSessionFromToken(response, email);
    try {
      await get().refreshFamily();
    } catch {}
  },

  createSessionFromToken: async (token: TokenDto, fallbackEmail?: string) => {
    const session = buildSessionFromToken(token, fallbackEmail);
    const previousSession = get().session;
    const isSameSessionIdentity =
      previousSession?.email.trim().toLowerCase() === session.email.trim().toLowerCase();
    const shouldCarryPendingFamilyName = !previousSession || isSameSessionIdentity;
    const previousUser = get().currentUser;
    const nextRole = resolveRoleWithSpecialEmailRules(
      get().role ?? previousUser?.role ?? 'adult',
      session.email,
    );
    const nextUser = buildUserFromSession(session, nextRole, token.userId, previousUser);
    const nextSelectedChildId =
      nextRole === 'adult'
        ? isSameSessionIdentity
          ? get().selectedChildId ?? nextUser.activeChildId ?? null
          : nextUser.activeChildId ?? null
        : null;

    const payload: PersistedAuthEnvelope = {
      session,
      currentUser: nextUser,
      role: nextRole,
      selectedChildId: nextSelectedChildId,
      family: isSameSessionIdentity ? get().family : null,
      pendingFamilyName: shouldCarryPendingFamilyName ? get().pendingFamilyName : null,
    };

    set(payload);
    await persistState(payload);
  },

  setCurrentUserProgress: async (input) => {
    const currentUser = get().currentUser;
    if (!currentUser || currentUser.id !== input.userId) {
      return;
    }

    const nextXp = normalizeProgressNumber(input.xp, currentUser.xp, 0);
    const nextLevel = normalizeProgressNumber(input.level, currentUser.level, 1);
    const nextStreak = normalizeProgressNumber(input.streak ?? currentUser.streak, currentUser.streak, 0);

    if (
      currentUser.xp === nextXp &&
      currentUser.level === nextLevel &&
      currentUser.streak === nextStreak
    ) {
      return;
    }

    const nextUser: UserProfile = {
      ...currentUser,
      xp: nextXp,
      level: nextLevel,
      streak: nextStreak,
    };

    const payload: PersistedAuthEnvelope = {
      session: get().session,
      currentUser: nextUser,
      role: get().role,
      selectedChildId: get().selectedChildId,
      family: get().family,
      pendingFamilyName: get().pendingFamilyName,
    };

    set({
      currentUser: nextUser,
    });

    if (payload.session) {
      await persistState(payload);
    }
  },

  refreshFamily: async () => {
    const session = get().session;
    if (!session) {
      set({ family: null });
      return null;
    }

    let family: FamilySummary | null = null;

    try {
      const familyResponse = await authService.getFamily(session.accessToken);
      family = extractFamilySummary(familyResponse);
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        throw error;
      }
    }

    const snapshot = get();
    const payload: PersistedAuthEnvelope = {
      session: snapshot.session,
      currentUser: snapshot.currentUser,
      role: snapshot.role,
      selectedChildId: snapshot.selectedChildId,
      family,
      pendingFamilyName: snapshot.pendingFamilyName,
    };

    set({ family });
    await persistState(payload);

    return family;
  },

  registerChild: async (payload: RegisterChildInput) => {
    const session = get().session;
    if (!session) {
      throw new Error('Для додавання дитини потрібно увійти у свій акаунт.');
    }

    let family = get().family;
    try {
      family = await get().refreshFamily();
    } catch {}

    const pendingFamilyName = get().pendingFamilyName;
    if (!family?.id && pendingFamilyName) {
      await authService.createFamily({ name: pendingFamilyName }, session.accessToken);
      family = await get().refreshFamily();
    }

    if (!family?.id) {
      family = await get().refreshFamily();
    }

    if (!family?.id) {
      const fallbackFamilyName =
        pendingFamilyName ??
        family?.name?.trim() ??
        resolveFamilyName(payload.lastName);
      await authService.createFamily({ name: fallbackFamilyName }, session.accessToken);
      family = await get().refreshFamily();
      set({ pendingFamilyName: null });
    }

    if (!family?.id) {
      throw new Error('Не вдалося визначити ID сімʼї. Оновіть профіль сімʼї та спробуйте ще раз.');
    }

    if (!uuidPattern.test(family.id)) {
      throw new Error('ID сімʼї має бути UUID. Оновіть дані сімʼї та спробуйте знову.');
    }

    const registerWithFamilyId = async (familyId: string) => {
      await authService.registerChild(
        {
          firstName: payload.firstName,
          lastName: payload.lastName,
          password: payload.password,
          familyId,
        },
        session.accessToken,
      );
    };

    try {
      await registerWithFamilyId(family.id);
    } catch (error) {
      if (!isFamilyNotFoundError(error)) {
        throw error;
      }

      try {
        const refreshedFamily = await get().refreshFamily();
        const refreshedFamilyId = refreshedFamily?.id?.trim() ?? null;
        if (refreshedFamilyId && refreshedFamilyId !== family.id) {
          await registerWithFamilyId(refreshedFamilyId);
          return;
        }
      } catch {}

      throw error;
    }
  },

  setRole: async (role: UserRole) => {
    const session = get().session;
    const resolvedRole = resolveRoleWithSpecialEmailRules(role, session?.email ?? null);
    const currentUser = get().currentUser;
    const nextUser = session
      ? buildUserFromSession(session, resolvedRole, currentUser?.id, currentUser)
      : {
          ...(currentUser ?? buildLocalUser(resolvedRole)),
          role: resolvedRole,
          activeChildId: resolvedRole === 'adult' ? currentUser?.activeChildId : undefined,
        };

    const nextSelectedChildId =
      resolvedRole === 'adult' ? get().selectedChildId ?? nextUser.activeChildId ?? null : null;

    const payload: PersistedAuthEnvelope = {
      session,
      currentUser: nextUser,
      role: resolvedRole,
      selectedChildId: nextSelectedChildId,
      family: get().family,
      pendingFamilyName: get().pendingFamilyName,
    };

    set(payload);

    if (session) {
      await persistState(payload);
    }
  },

  setSelectedChildId: async (childId: string | null) => {
    if (get().role !== 'adult') {
      return;
    }

    const normalizedChildId = childId && childId.trim().length > 0 ? childId.trim() : null;
    const currentUser = get().currentUser;
    const payload: PersistedAuthEnvelope = {
      session: get().session,
      currentUser: currentUser
        ? {
            ...currentUser,
            activeChildId: normalizedChildId ?? undefined,
          }
        : currentUser,
      role: 'adult',
      selectedChildId: normalizedChildId,
      family: get().family,
      pendingFamilyName: get().pendingFamilyName,
    };

    set(payload);

    if (payload.session) {
      await persistState(payload);
    }
  },

  logout: async () => {
    set({
      session: null,
      currentUser: null,
      role: null,
      selectedChildId: null,
      family: null,
      pendingFamilyName: null,
    });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
    await usePlansStore.getState().clear();
  },
}));

export default useAuthStore;
