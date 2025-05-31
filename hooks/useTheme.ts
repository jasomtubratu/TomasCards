import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { loadSettings } from '@/utils/storage';
import { LIGHT_COLORS, DARK_COLORS } from '@/constants/Colors';
import type { ThemeMode } from '@/utils/types';

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [colors, setColors] = useState(DARK_COLORS);

  useEffect(() => {
    loadSettings().then(settings => {
      setThemeMode(settings.themeMode || 'system');
    });
  }, []);

  useEffect(() => {
    const isDark = themeMode === 'system' 
      ? systemColorScheme === 'dark'
      : themeMode === 'dark';

    setColors(isDark ? DARK_COLORS : LIGHT_COLORS);
  }, [themeMode, systemColorScheme]);

  return {
    colors,
    isDark: colors === DARK_COLORS,
    themeMode,
  };
}