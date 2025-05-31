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
import { Import as SortAsc, Vibrate, Fingerprint, Trash2, Coffee, Info, User } from 'lucide-react-native';
import { AppSettings, SortOption } from '@/utils/types';
import { loadSettings, saveSettings, loadCards, saveCards } from '@/utils/storage';
import { COLORS } from '@/constants/Colors';
import { lightHaptic, mediumHaptic } from '@/utils/feedback';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    sortOption: 'alphabetical',
    hapticFeedback: true,
    secureWithBiometrics: false,
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

  // Toggle sort option
  const toggleSortOption = async () => {
    await lightHaptic();
    const options: SortOption[] = ['alphabetical', 'recent', 'lastUsed'];
    const currentIndex = options.indexOf(settings.sortOption);
    const nextIndex = (currentIndex + 1) % options.length;

    await updateSettings({
      ...settings,
      sortOption: options[nextIndex],
    });
  };

  // Toggle haptic feedback
  const toggleHapticFeedback = async () => {
    await lightHaptic();
    await updateSettings({
      ...settings,
      hapticFeedback: !settings.hapticFeedback,
    });
  };

  // Toggle biometric security
  const toggleBiometricSecurity = async () => {
    await lightHaptic();

    // In a real app, we would check if biometrics are available here

    await updateSettings({
      ...settings,
      secureWithBiometrics: !settings.secureWithBiometrics,
    });
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Account</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <User size={24} color={COLORS.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>
                Log In / Sign Up
              </Text>
              <Text style={styles.settingDescription}>
                Manage your account and sync cards across devices
              </Text>
            </View>
          </View>
        </View>

      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={confirmDeleteAllCards}
        >
          <View style={styles.settingLeft}>
            <Trash2 size={24} color={COLORS.error} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Delete All Cards</Text>
              <Text style={styles.settingDescription}>
                Permanently remove all loyalty cards
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Info size={24} color={COLORS.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Version</Text>
              <Text style={styles.settingDescription}>
                TomasCards v1.0.0 ALPHA
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Coffee size={24} color={COLORS.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Support Development</Text>
              <Text style={styles.settingDescription}>
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
    backgroundColor: COLORS.backgroundDark,
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
    color: COLORS.textPrimary,
    marginBottom: 16,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.backgroundMedium,
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
    color: COLORS.textPrimary,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.accent,
  },
});