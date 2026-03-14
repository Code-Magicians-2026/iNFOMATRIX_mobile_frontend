import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  getBadgeImageSource,
  normalizeBadgeImageKey,
  pickRandomBadgeImageKey,
  resolveBadgeTypeFromDifficulty,
  type BadgeImageKey,
} from './badge-catalog';

const BADGE_FALLBACK_SOURCE = require('../../../assets/images/icon.png');

type CompletionBadgeProps = {
  difficulty: string;
  style?: StyleProp<ViewStyle>;
  imageSize?: number;
  showLabel?: boolean;
  labelStyle?: StyleProp<TextStyle>;
  imageKey?: BadgeImageKey;
};

const CompletionBadge = ({
  difficulty,
  style,
  imageSize = 44,
  showLabel = true,
  labelStyle,
  imageKey,
}: CompletionBadgeProps) => {
  const badgeType = resolveBadgeTypeFromDifficulty(difficulty);
  const badgeLabel = badgeType === 'basic' ? 'Basic badge unlocked' : 'Fire badge unlocked';
  const resolvedImageKey = React.useMemo(
    () => normalizeBadgeImageKey(imageKey ?? '') ?? pickRandomBadgeImageKey(),
    [imageKey],
  );
  const [activeImageKey, setActiveImageKey] = React.useState<BadgeImageKey>(resolvedImageKey);
  const [isImageFailed, setIsImageFailed] = React.useState(false);
  const hasRetriedRef = React.useRef(false);

  React.useEffect(() => {
    setActiveImageKey(resolvedImageKey);
    setIsImageFailed(false);
    hasRetriedRef.current = false;
  }, [resolvedImageKey]);

  const badgeImage = React.useMemo(
    () => getBadgeImageSource(badgeType, activeImageKey),
    [activeImageKey, badgeType],
  );

  const handleImageError = React.useCallback(() => {
    if (!hasRetriedRef.current) {
      hasRetriedRef.current = true;
      setActiveImageKey('ref1');
      return;
    }

    setIsImageFailed(true);
  }, []);

  const effectiveImageSource = React.useMemo(() => {
    if (isImageFailed) {
      return BADGE_FALLBACK_SOURCE;
    }

    return badgeImage;
  }, [badgeImage, isImageFailed]);

  return (
    <View style={[styles.container, style]}>
      <ExpoImage
        source={effectiveImageSource}
        style={[styles.image, { width: imageSize, height: imageSize }]}
        contentFit="contain"
        onError={handleImageError}
      />
      {showLabel ? (
        <Text style={[styles.label, labelStyle]} allowFontScaling>
          {badgeLabel}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    backgroundColor: '#f4f6f8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    elevation: 1,
  },
  image: {
    width: 44,
    height: 44,
  },
  label: {
    flex: 1,
    color: '#1a1a1a',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default CompletionBadge;
