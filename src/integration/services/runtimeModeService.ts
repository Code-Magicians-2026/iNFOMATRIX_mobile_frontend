let demoModeEnabled = false;

export const runtimeModeService = {
  isDemoModeEnabled: (): boolean => demoModeEnabled,
  enableDemoMode: () => {
    demoModeEnabled = true;
  },
  disableDemoMode: () => {
    demoModeEnabled = false;
  },
};

