import React from 'react';

import useAuthStore from '@/context/Auth-store';
import AdultTabNavigator from '@/src/navigation/AdultTabNavigator';
import ChildTabNavigator from '@/src/navigation/ChildTabNavigator';
import { resolveNavigationRole } from '@/src/navigation/navigation-config';
import { LoadingState, ScreenContainer } from '@/shared/components/ui';

export default function RoleBasedNavigator() {
  const role = useAuthStore((s) => s.role);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setRole = useAuthStore((s) => s.setRole);
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
        <LoadingState label="Loading app flow..." />
      </ScreenContainer>
    );
  }

  return resolvedRole === 'adult' ? <AdultTabNavigator /> : <ChildTabNavigator />;
}
