import React from 'react';

import useLanguageStore from '@/context/Language-store';
import { translate, type TranslationKey, type TranslationParams } from '@/src/i18n/translations';

export const useI18n = () => {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const isLanguageHydrated = useLanguageStore((s) => s.isHydrated);

  const t = React.useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
    [language],
  );

  return {
    language,
    setLanguage,
    isLanguageHydrated,
    t,
  };
};
