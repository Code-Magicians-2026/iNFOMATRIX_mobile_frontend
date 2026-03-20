import React from 'react';

import useAuthStore from '@/context/Auth-store';
import AdultTabNavigator from '@/src/navigation/AdultTabNavigator';
import ChildTabNavigator from '@/src/navigation/ChildTabNavigator';
import { useI18n } from '@/src/i18n/useI18n';
import { resolveNavigationRole } from '@/src/navigation/navigation-config';
import { LoadingState, ScreenContainer } from '@/shared/components/ui';

export default function RoleBasedNavigator() {
  const role = useAuthStore((s) => s.role);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setRole = useAuthStore((s) => s.setRole);
  const { t } = useI18n();
  const resolvedRole = resolveNavigationRole({ isHydrated, role });

  React.useEffect(() => {
    if (!isHydrated || role !== null) {
      return;
    }

    void setRole('child');
  }, [isHydrated, role, setRole]);

  if (resolvedRole === 'loading') {
    return (
      <ScreenContainer centered>
        <LoadingState label={t('navigation.loadingFlow')} />
      </ScreenContainer>
    );
  }

  return resolvedRole === 'adult' ? <AdultTabNavigator /> : <ChildTabNavigator />;
}
