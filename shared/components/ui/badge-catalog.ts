import type { ImageSourcePropType } from 'react-native';

export type BadgeType = 'basic' | 'fire';

export const BADGE_IMAGE_KEYS = [
  'ref1',
  'ref2',
  'ref3',
  'ref4',
  'ref5',
  'ref6',
  'ref7',
  'ref8',
  'ref9',
  'ref10',
  'ref11',
  'ref12',
  'ref13',
  'ref14',
  'ref15',
] as const;

export type BadgeImageKey = (typeof BADGE_IMAGE_KEYS)[number];

const LEGACY_BADGE_IMAGE_KEY_MAP: Record<string, BadgeImageKey> = {
  basic_star: 'ref1',
  basic_medal: 'ref2',
  basic_target: 'ref3',
  basic_shield: 'ref4',
  basic_lightning: 'ref5',
  fire_flame: 'ref1',
  fire_rocket: 'ref2',
  fire_crown: 'ref3',
  fire_trophy: 'ref4',
  fire_streak: 'ref5',
};

const BADGE_IMAGE_SOURCES: Record<BadgeType, Record<BadgeImageKey, ImageSourcePropType>> = {
  basic: {
    ref1: require('../../../assets/images/budges/basic/ref1.png'),
    ref2: require('../../../assets/images/budges/basic/ref2.png'),
    ref3: require('../../../assets/images/budges/basic/ref3.png'),
    ref4: require('../../../assets/images/budges/basic/ref4.png'),
    ref5: require('../../../assets/images/budges/basic/ref5.png'),
    ref6: require('../../../assets/images/budges/basic/ref6.png'),
    ref7: require('../../../assets/images/budges/basic/ref7.png'),
    ref8: require('../../../assets/images/budges/basic/ref8.png'),
    ref9: require('../../../assets/images/budges/basic/ref9.png'),
    ref10: require('../../../assets/images/budges/basic/ref10.png'),
    ref11: require('../../../assets/images/budges/basic/ref11.png'),
    ref12: require('../../../assets/images/budges/basic/ref12.png'),
    ref13: require('../../../assets/images/budges/basic/ref13.png'),
    ref14: require('../../../assets/images/budges/basic/ref14.png'),
    ref15: require('../../../assets/images/budges/basic/ref15.png'),
  },
  fire: {
    ref1: require('../../../assets/images/budges/fire/ref1.png'),
    ref2: require('../../../assets/images/budges/fire/ref2.png'),
    ref3: require('../../../assets/images/budges/fire/ref3.png'),
    ref4: require('../../../assets/images/budges/fire/ref4.png'),
    ref5: require('../../../assets/images/budges/fire/ref5.png'),
    ref6: require('../../../assets/images/budges/fire/ref6.png'),
    ref7: require('../../../assets/images/budges/fire/ref7.png'),
    ref8: require('../../../assets/images/budges/fire/ref8.png'),
    ref9: require('../../../assets/images/budges/fire/ref9.png'),
    ref10: require('../../../assets/images/budges/fire/ref10.png'),
    ref11: require('../../../assets/images/budges/fire/ref11.png'),
    ref12: require('../../../assets/images/budges/fire/ref12.png'),
    ref13: require('../../../assets/images/budges/fire/ref13.png'),
    ref14: require('../../../assets/images/budges/fire/ref14.png'),
    ref15: require('../../../assets/images/budges/fire/ref15.png'),
  },
};

export const isBadgeImageKey = (value: string): value is BadgeImageKey =>
  (BADGE_IMAGE_KEYS as readonly string[]).includes(value);

export const normalizeBadgeImageKey = (value: string): BadgeImageKey | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (isBadgeImageKey(normalized)) {
    return normalized;
  }

  return LEGACY_BADGE_IMAGE_KEY_MAP[normalized] ?? null;
};

export const resolveBadgeTypeFromDifficulty = (difficulty: string): BadgeType => {
  const normalizedDifficulty = difficulty.trim().toLowerCase();

  if (
    normalizedDifficulty === 'medium' ||
    normalizedDifficulty === 'hard' ||
    normalizedDifficulty === 'high'
  ) {
    return 'fire';
  }

  return 'basic';
};

export const pickRandomBadgeImageKey = (): BadgeImageKey => {
  const randomIndex = Math.floor(Math.random() * BADGE_IMAGE_KEYS.length);
  return BADGE_IMAGE_KEYS[randomIndex] ?? BADGE_IMAGE_KEYS[0];
};

export const getBadgeImageSource = (
  badgeType: BadgeType,
  imageKey: BadgeImageKey,
): ImageSourcePropType => BADGE_IMAGE_SOURCES[badgeType][imageKey];

