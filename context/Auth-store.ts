import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

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
};

const STORAGE_KEY = 'AUTH_SESSION';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

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

const extractFamilySummary = (payload: unknown, depth = 0): FamilySummary | null => {
  if (depth > 3 || payload === null || payload === undefined) {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const parsed = extractFamilySummary(item, depth + 1);
      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  if (!isObject(payload)) {
    return null;
  }

  const id = pickFirstString(payload, [
    'id',
    'familyId',
    'familyID',
    'Id',
    'FamilyId',
    'FamilyID',
  ]);
  const name = pickFirstString(payload, ['name', 'familyName', 'Name', 'FamilyName']);
  if (id || name) {
    return {
      id: id ?? null,
      name: name ?? null,
    };
  }

  const nestedCandidates = [
    payload.family,
    payload.data,
    payload.result,
    payload.item,
    payload.items,
    payload.value,
  ];

  for (const candidate of nestedCandidates) {
    const parsed = extractFamilySummary(candidate, depth + 1);
    if (parsed) {
      return parsed;
    }
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
  createdByAdultId: existingUser?.createdByAdultId,
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
        };

        set({ ...migratedState, pendingFamilyName: null, isHydrated: true });
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

      if (!session) {
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

      const resolvedRole: UserRole = persistedRole ?? persistedUser?.role ?? 'adult';
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
        pendingFamilyName: null,
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
    set({
      pendingFamilyName: resolvedFamilyName,
      family: null,
    });
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
    const previousUser = get().currentUser;
    const nextRole: UserRole = get().role ?? previousUser?.role ?? 'adult';
    const nextUser = buildUserFromSession(session, nextRole, token.userId, previousUser);
    const nextSelectedChildId =
      nextRole === 'adult' ? get().selectedChildId ?? nextUser.activeChildId ?? null : null;

    const payload: PersistedAuthEnvelope = {
      session,
      currentUser: nextUser,
      role: nextRole,
      selectedChildId: nextSelectedChildId,
      family: get().family,
    };

    set(payload);
    await persistState(payload);
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
    const pendingFamilyName = get().pendingFamilyName;
    if (!family?.id && pendingFamilyName) {
      await authService.createFamily({ name: pendingFamilyName }, session.accessToken);
      family = await get().refreshFamily();
    }

    if (!family?.id) {
      family = await get().refreshFamily();
    }

    if (!family?.id) {
      throw new Error('Не вдалося визначити ID сімʼї. Оновіть профіль сімʼї та спробуйте ще раз.');
    }

    await authService.registerChild(
      {
        firstName: payload.firstName,
        lastName: payload.lastName,
        password: payload.password,
        familyId: family.id,
      },
      session.accessToken,
    );
  },

  setRole: async (role: UserRole) => {
    const session = get().session;
    const currentUser = get().currentUser;
    const nextUser = session
      ? buildUserFromSession(session, role, currentUser?.id, currentUser)
      : {
          ...(currentUser ?? buildLocalUser(role)),
          role,
          activeChildId: role === 'adult' ? currentUser?.activeChildId : undefined,
        };

    const nextSelectedChildId =
      role === 'adult' ? get().selectedChildId ?? nextUser.activeChildId ?? null : null;

    const payload: PersistedAuthEnvelope = {
      session,
      currentUser: nextUser,
      role,
      selectedChildId: nextSelectedChildId,
      family: get().family,
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
  },
}));

export default useAuthStore;
