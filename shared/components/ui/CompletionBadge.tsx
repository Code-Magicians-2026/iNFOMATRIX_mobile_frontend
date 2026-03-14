import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  getBadgeImageSource,
  pickRandomBadgeImageKey,
  resolveBadgeTypeFromDifficulty,
  type BadgeImageKey,
} from './badge-catalog';

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
    () => imageKey ?? pickRandomBadgeImageKey(),
    [imageKey],
  );
  const badgeImage = React.useMemo(
    () => getBadgeImageSource(badgeType, resolvedImageKey),
    [badgeType, resolvedImageKey],
  );

  return (
    <View style={[styles.container, style]}>
      <Image source={badgeImage} style={[styles.image, { width: imageSize, height: imageSize }]} resizeMode="contain" />
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
