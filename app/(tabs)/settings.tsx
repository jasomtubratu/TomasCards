import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { Import as SortAsc, Vibrate, Fingerprint, Trash2, Coffee, Info, User, Moon, Sun, Monitor } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppSettings, SortOption, ThemeMode } from '@/utils/types';
import { loadSettings, saveSettings, loadCards, saveCards } from '@/utils/storage';
import { useTheme } from '@/hooks/useTheme';
import LanguageSelector from '@/components/LanguageSelector';
import { lightHaptic } from '@/utils/feedback';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, themeMode, setThemeMode } = useTheme();
  const [settings, setSettings] = useState<AppSettings>({
    sortOption: 'alphabetical',
    hapticFeedback: true,
    secureWithBiometrics: false,
    themeMode: 'system',
  });

  // Load settings
  useEffect(() => {
    const fetchSettings = async () => {
      const userSettings = await loadSettings();
      setSettings(userSettings);
    };
    fetchSettings();
  }, []);

  // Update settings when changes are made
  const updateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // Delete all cards
  const confirmDeleteAllCards = async () => {
    await lightHaptic();

    if (Platform.OS === 'web') {
      if (confirm(t('settings.deleteAll.confirm'))) {
        await deleteAllCards();
      }
      return;
    }

    Alert.alert(
      t('settings.deleteAll.title'),
      t('settings.deleteAll.confirm'),
      [
        {
          text: t('common.buttons.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.buttons.delete'),
          style: 'destructive',
          onPress: deleteAllCards,
        },
      ]
    );
  };

  // Delete all cards
  const deleteAllCards = async () => {
    await saveCards([]);
    await lightHaptic();
  };

  const handleThemeChange = async (newTheme: ThemeMode) => {
    if (Platform.OS !== 'web') {
      await lightHaptic();
    }
    await updateSettings({
      ...settings,
      themeMode: newTheme,
    });
    setThemeMode(newTheme);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundDark }]} contentContainerStyle={styles.content}>
      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('settings.sections.account')}
        </Text>

        <View style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}>
          <View style={styles.settingLeft}>
            <User size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.sections.account')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('settings.login')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Language Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('settings.sections.appearance')}
        </Text>
        
        <LanguageSelector />

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={() => handleThemeChange('light')}
        >
          <View style={styles.settingLeft}>
            <Sun size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.theme.light')}
              </Text>
            </View>
          </View>
          {settings.themeMode === 'light' && (
            <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={() => handleThemeChange('dark')}
        >
          <View style={styles.settingLeft}>
            <Moon size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.theme.dark')}
              </Text>
            </View>
          </View>
          {settings.themeMode === 'dark' && (
            <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={() => handleThemeChange('system')}
        >
          <View style={styles.settingLeft}>
            <Monitor size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.theme.system')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('settings.theme.systemDescription')}
              </Text>
            </View>
          </View>
          {settings.themeMode === 'system' && (
            <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('settings.sections.data')}
        </Text>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={confirmDeleteAllCards}
        >
          <View style={styles.settingLeft}>
            <Trash2 size={24} color={colors.error} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.deleteAll.title')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('settings.deleteAll.description')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('settings.sections.about')}
        </Text>

        <View style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}>
          <View style={styles.settingLeft}>
            <Info size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.version', { version: '1.0.0 ALPHA' })}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}>
          <View style={styles.settingLeft}>
            <Coffee size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.support.title')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('settings.support.description')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 48 : 0,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});