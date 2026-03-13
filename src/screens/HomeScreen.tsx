import React from 'react';
import { StyleSheet, Text } from 'react-native';

import useAuthStore from '@/context/Auth-store';
import useThemeStore from '@/context/Theme-store';
import useResponsiveLayout from '@/hooks/use-responsive-layout';
import {
  EmptyState,
  PrimaryButton,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/shared/components/ui';

const HomeScreen = () => {
  const colors = useThemeStore((s) => s.colors);
  const userEmail = useAuthStore((s) => s.session?.email ?? 'guest');
  const { isTablet } = useResponsiveLayout();
  const styles = React.useMemo(() => getStyles(isTablet), [isTablet]);
  const [mvpHintVisible, setMvpHintVisible] = React.useState(false);

  return (
    <ScreenContainer centered>
      <SectionHeader title="Home" subtitle={`Welcome back, ${userEmail}`} />

      <StatCard title="Today's Progress" subtitle="Track your momentum for today.">
        <Text style={[styles.metric, { color: colors.text }]} allowFontScaling>
          Completed quests today: 0
        </Text>
        <Text style={[styles.metric, { color: colors.text }]} allowFontScaling>
          XP today: 0
        </Text>
      </StatCard>

      <PrimaryButton
        label="Add task"
        onPress={() => setMvpHintVisible(true)}
      />

      {mvpHintVisible ? (
        <EmptyState
          title="Draft task created"
          description="MVP step 1: quest generation wiring is the next step."
        />
      ) : null}
    </ScreenContainer>
  );
};

const getStyles = (isTablet: boolean) =>
  StyleSheet.create({
    metric: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: '500',
    },
  });

export default HomeScreen;
