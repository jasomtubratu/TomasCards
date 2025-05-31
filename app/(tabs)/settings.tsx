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
import { AppSettings, SortOption, ThemeMode } from '@/utils/types';
import { loadSettings, saveSettings, loadCards, saveCards } from '@/utils/storage';
import { useTheme } from '@/hooks/useTheme';
import { lightHaptic, mediumHaptic } from '@/utils/feedback';

export default function SettingsScreen() {
  const { colors, themeMode } = useTheme();
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
    await mediumHaptic();

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete all loyalty cards? This action cannot be undone.')) {
        await deleteAllCards();
      }
      return;
    }

    Alert.alert(
      'Delete All Cards',
      'Are you sure you want to delete all loyalty cards? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteAllCards,
        },
      ]
    );
  };

  // Delete all cards
  const deleteAllCards = async () => {
    await saveCards([]);
    await mediumHaptic();
  };

  const handleThemeChange = async (newTheme: ThemeMode) => {
    await lightHaptic();
    await updateSettings({
      ...settings,
      themeMode: newTheme,
    });

  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundDark }]} contentContainerStyle={styles.content}>
      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>My Account</Text>

        <View style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}>
          <View style={styles.settingLeft}>
            <User size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                Log In / Sign Up
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Manage your account and sync cards across devices
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance</Text>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={() => handleThemeChange('light')}
        >
          <View style={styles.settingLeft}>
            <Sun size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Light Mode</Text>
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
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Dark Mode</Text>
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
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>System</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Follow system appearance settings
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
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Data Management</Text>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={confirmDeleteAllCards}
        >
          <View style={styles.settingLeft}>
            <Trash2 size={24} color={colors.error} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Delete All Cards</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Permanently remove all loyalty cards
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>

        <View style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}>
          <View style={styles.settingLeft}>
            <Info size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Version</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                TomasCards v1.0.0 ALPHA
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}>
          <View style={styles.settingLeft}>
            <Coffee size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Support Development</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Help keep this app ad-free. Your support is appreciated! 
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