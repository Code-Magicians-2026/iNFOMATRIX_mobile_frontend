import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { TokenDto } from '@/src/features/auth/dto/auth.dto';
import type { AuthSession } from '@/src/features/auth/models/auth-session.model';
import { authService } from '@/src/integration/services/authService';
import type { UserProfile, UserRole } from '@/shared/models/mvp-contracts.model';

interface AuthState {
  session: AuthSession | null;
  currentUser: UserProfile | null;
  role: UserRole | null;
  selectedChildId: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  confirmEmail: (email: string, token: string) => Promise<void>;
  completePasswordReset: (email: string, newPassword: string) => Promise<void>;
  createSessionFromToken: (token: TokenDto, fallbackEmail?: string) => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  setSelectedChildId: (childId: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

type PersistedAuthEnvelope = {
  session: AuthSession | null;
  currentUser: UserProfile | null;
  role: UserRole | null;
  selectedChildId: string | null;
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
  isNonEmptyString(value.refreshToken) &&
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

const buildSessionFromToken = (token: TokenDto, fallbackEmail?: string): AuthSession => {
  if (!token.accessToken || !token.refreshToken) {
    throw new Error('Сервер не повернув токени доступу.');
  }

  const email = token.email ?? fallbackEmail ?? null;
  if (!email) {
    throw new Error('Сервер не повернув email користувача.');
  }

  return {
    email,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
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
          isHydrated: true,
        });
        return;
      }

      const session = isValidSession(parsed.session) ? parsed.session : null;
      const persistedRole = isRole(parsed.role) ? parsed.role : null;
      const persistedUser = isValidUserProfile(parsed.currentUser) ? parsed.currentUser : null;

      if (!session) {
        set({
          session: null,
          currentUser: null,
          role: null,
          selectedChildId: null,
          isHydrated: true,
        });
        return;
      }

      const resolvedRole: UserRole = persistedRole ?? persistedUser?.role ?? 'child';
      const currentUser = buildUserFromSession(session, resolvedRole, persistedUser?.id, persistedUser);
      const selectedChildId =
        readSelectedChildId(parsed.selectedChildId, resolvedRole) ??
        (resolvedRole === 'adult' ? currentUser.activeChildId ?? null : null);

      set({
        session,
        currentUser,
        role: resolvedRole,
        selectedChildId,
        isHydrated: true,
      });
    } catch {
      set({
        session: null,
        currentUser: null,
        role: null,
        selectedChildId: null,
        isHydrated: true,
      });
    }
  },

  register: async (fullName: string, email: string, password: string) => {
    await authService.register({ fullName, email, password });
  },

  login: async (email: string, password: string) => {
    const token = await authService.login({ email, password });
    await get().createSessionFromToken(token, email);
  },

  confirmEmail: async (email: string, token: string) => {
    const response = await authService.confirmEmail({ email, token });
    await get().createSessionFromToken(response, email);
  },

  completePasswordReset: async (email: string, newPassword: string) => {
    const response = await authService.resetPassword({ email, newPassword });
    await get().createSessionFromToken(response, email);
  },

  createSessionFromToken: async (token: TokenDto, fallbackEmail?: string) => {
    const session = buildSessionFromToken(token, fallbackEmail);
    const previousUser = get().currentUser;
    const nextRole: UserRole = get().role ?? previousUser?.role ?? 'child';
    const nextUser = buildUserFromSession(session, nextRole, token.userId, previousUser);
    const nextSelectedChildId =
      nextRole === 'adult' ? get().selectedChildId ?? nextUser.activeChildId ?? null : null;

    const payload: PersistedAuthEnvelope = {
      session,
      currentUser: nextUser,
      role: nextRole,
      selectedChildId: nextSelectedChildId,
    };

    set(payload);
    await persistState(payload);
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
    });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
}));

export default useAuthStore;

