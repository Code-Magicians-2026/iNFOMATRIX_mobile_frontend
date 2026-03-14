import React from 'react';
import {
  Linking,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';

const UPGRADE_PLAN_URL = 'https://informatix-frontend.netlify.app/#price';

type UpgradePlanBannerProps = {
  style?: StyleProp<ViewStyle>;
  onOpenFailed?: () => void;
};

const UpgradePlanBanner = ({ style, onOpenFailed }: UpgradePlanBannerProps) => {
  const colors = useThemeStore((s) => s.colors);
  const { isTablet } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);

  const handlePress = React.useCallback(async () => {
    try {
      await Linking.openURL(UPGRADE_PLAN_URL);
    } catch {
      onOpenFailed?.();
    }
  }, [onOpenFailed]);

  return (
    <Pressable
      onPress={() => {
        void handlePress();
      }}
      style={[
        styles.banner,
        {
          backgroundColor: '#fff4e7',
          borderColor: '#f7c37a',
        },
        style,
      ]}
      android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
      accessibilityRole="button"
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} allowFontScaling>
          Need higher limits?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} allowFontScaling>
          Upgrade your usage plan and unlock more features.
        </Text>
        <View style={styles.ctaBadge}>
          <Text style={styles.ctaLabel} allowFontScaling>
            View pricing
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const getStyles = (isTablet: boolean) =>
  StyleSheet.create({
    banner: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 2,
      minHeight: isTablet ? 120 : 108,
      justifyContent: 'center',
    },
    content: {
      gap: 8,
      paddingHorizontal: isTablet ? 18 : 14,
      paddingVertical: isTablet ? 16 : 13,
    },
    title: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: '800',
    },
    subtitle: {
      fontSize: isTablet ? 14 : 13,
      fontWeight: '500',
      lineHeight: isTablet ? 20 : 18,
    },
    ctaBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      backgroundColor: '#ff2d55',
      paddingHorizontal: 12,
      minHeight: 30,
      justifyContent: 'center',
    },
    ctaLabel: {
      color: '#ffffff',
      fontSize: isTablet ? 13 : 12,
      fontWeight: '800',
    },
  });

export default UpgradePlanBanner;
