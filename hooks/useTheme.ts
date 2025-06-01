import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { loadSettings, saveSettings } from '@/utils/storage';
import { LIGHT_COLORS, DARK_COLORS } from '@/constants/Colors';
import type { ThemeMode, AppSettings } from '@/utils/types';

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

  const updateThemeMode = async (newThemeMode: ThemeMode) => {
    setThemeMode(newThemeMode);
    const settings = await loadSettings();
    await saveSettings({
      ...settings,
      themeMode: newThemeMode,
    });
  };

  return {
    colors,
    isDark: colors === DARK_COLORS,
    themeMode,
    setThemeMode: updateThemeMode,
  };
}