import React from 'react';
import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type CompletionBadgeProps = {
  difficulty: string;
  style?: StyleProp<ViewStyle>;
  imageSize?: number;
  showLabel?: boolean;
  labelStyle?: StyleProp<TextStyle>;
};

type BadgeType = 'basic' | 'fire';

const BADGE_IMAGES: Record<BadgeType, ImageSourcePropType[]> = {
  basic: [
    require('../../../assets/images/budges/basic/ref1.png'),
    require('../../../assets/images/budges/basic/ref2.png'),
    require('../../../assets/images/budges/basic/ref3.png'),
    require('../../../assets/images/budges/basic/ref4.png'),
    require('../../../assets/images/budges/basic/ref5.png'),
    require('../../../assets/images/budges/basic/ref6.png'),
    require('../../../assets/images/budges/basic/ref7.png'),
    require('../../../assets/images/budges/basic/ref8.png'),
    require('../../../assets/images/budges/basic/ref9.png'),
    require('../../../assets/images/budges/basic/ref10.png'),
    require('../../../assets/images/budges/basic/ref11.png'),
    require('../../../assets/images/budges/basic/ref12.png'),
    require('../../../assets/images/budges/basic/ref13.png'),
    require('../../../assets/images/budges/basic/ref14.png'),
    require('../../../assets/images/budges/basic/ref15.png'),
  ],
  fire: [
    require('../../../assets/images/budges/fire/ref1.png'),
    require('../../../assets/images/budges/fire/ref2.png'),
    require('../../../assets/images/budges/fire/ref3.png'),
    require('../../../assets/images/budges/fire/ref4.png'),
    require('../../../assets/images/budges/fire/ref5.png'),
    require('../../../assets/images/budges/fire/ref6.png'),
    require('../../../assets/images/budges/fire/ref7.png'),
    require('../../../assets/images/budges/fire/ref8.png'),
    require('../../../assets/images/budges/fire/ref9.png'),
    require('../../../assets/images/budges/fire/ref10.png'),
    require('../../../assets/images/budges/fire/ref11.png'),
    require('../../../assets/images/budges/fire/ref12.png'),
    require('../../../assets/images/budges/fire/ref13.png'),
    require('../../../assets/images/budges/fire/ref14.png'),
    require('../../../assets/images/budges/fire/ref15.png'),
  ],
};

const resolveBadgeType = (difficulty: string): BadgeType => {
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

const CompletionBadge = ({
  difficulty,
  style,
  imageSize = 44,
  showLabel = true,
  labelStyle,
}: CompletionBadgeProps) => {
  const badgeType = resolveBadgeType(difficulty);
  const badgeLabel = badgeType === 'basic' ? 'Basic badge unlocked' : 'Fire badge unlocked';
  const badgeImage = React.useMemo(() => {
    const options = BADGE_IMAGES[badgeType];
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex] ?? options[0];
  }, [badgeType]);

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
