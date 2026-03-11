import React from 'react';
import { Dimensions, type ScaledSize, useWindowDimensions } from 'react-native';

type Orientation = 'portrait' | 'landscape';

const getOrientation = (window: ScaledSize): Orientation =>
  window.width >= window.height ? 'landscape' : 'portrait';

const getResponsiveSpacing = (width: number): number => Math.max(16, Math.min(40, width * 0.05));

const useResponsiveLayout = () => {
  const { width, height } = useWindowDimensions();
  const [orientation, setOrientation] = React.useState<Orientation>(() =>
    getOrientation(Dimensions.get('window')),
  );

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setOrientation(getOrientation(window));
    });

    return () => subscription.remove();
  }, []);

  const isTablet = width >= 768;
  const spacing = getResponsiveSpacing(width);
  const isLandscape = orientation === 'landscape';
  const cardMaxWidth = isTablet ? Math.min(width * 0.72, 620) : 380;

  return {
    width,
    height,
    orientation,
    isLandscape,
    isTablet,
    spacing,
    cardMaxWidth,
  };
};

export default useResponsiveLayout;
