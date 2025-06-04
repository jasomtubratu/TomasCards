import { useState, useEffect, use } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Trash2, Coffee, Info, User, Moon, Sun, Monitor } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppSettings, ThemeMode } from '@/utils/types';
import { loadSettings, saveSettings, saveCards } from '@/utils/storage';
import { useTheme } from '@/hooks/useTheme';
import LanguageSelector from '@/components/LanguageSelector';
import { lightHaptic } from '@/utils/feedback';
import ThemeSelector from '@/components/ThemeSelector';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode, setThemeMode } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [email, setEmail] = useState('');
  const [settings, setSettings] = useState<AppSettings>({
    sortOption: 'alphabetical',
    hapticFeedback: true,
    secureWithBiometrics: false,
    themeMode: 'system',
  });

  // Check if user is logged in
  useEffect(() => {
    const checkLoginStatus = async () => {
      setLoadingStatus(true);
      const token = await AsyncStorage.getItem('authToken');
      fetchUserData();
      setIsLoggedIn(!!token);

    };
    checkLoginStatus();
  }, []);

  // useEffect to load settings account username and refresh token from API
  function fetchUserData() {
    setLoadingStatus(true);

    const response = fetch('http://localhost:3000/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AsyncStorage.getItem('authToken') || ''}`,
      },
      method: 'GET',
    });
    response.then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        console.error('Failed to fetch user data:', res.statusText);
        throw new Error('Failed to fetch user data');
      }
    }
    ).then((data) => {
      setLoadingStatus(false);
      setEmail(data.email || '');
      AsyncStorage.setItem('authToken', data.token || '');
    }).catch((error) => {
      console.error('Error fetching user data:', error);
    });
  }

  // Load settings once
  useEffect(() => {
    (async () => {
      const userSettings = await loadSettings();
      setSettings(userSettings);
    })();
  }, []);

  // Helper to update both local state and persistent storage
  const updateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // Toggle between 'light' and 'dark' immediately (no confirmation)
  const handleThemeToggle = async (value: boolean) => {
    if (Platform.OS !== 'web') {
      await lightHaptic();
    }
    const newMode: ThemeMode = value ? 'dark' : 'light';
    setThemeMode(newMode);
    await updateSettings({ ...settings, themeMode: newMode });
  };

  // Confirm deletion of all cards
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

  // Actually delete every card
  const deleteAllCards = async () => {
    await saveCards([]);
    await lightHaptic();
  };

  const isDarkMode = settings.themeMode === 'dark';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundDark }]}
      contentContainerStyle={styles.content}
    >
      {/* Account Section */}
      {isLoggedIn ? (
        <TouchableOpacity
          style={styles.section}
          onPress={() =>
            Alert.alert(
              t('settings.logout.title'),
              t('settings.logout.confirm'),
              [
                {
                  text: t('common.buttons.cancel'),
                  style: 'cancel',
                },
                {
                  text: t('common.buttons.logout'),
                  style: 'destructive',
                  onPress: async () => {
                    await AsyncStorage.removeItem('authToken');
                    setIsLoggedIn(false);
                  },
                },
              ]
            )
          }
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('settings.sections.account')}
          </Text>
          <View style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}>
            <View style={styles.settingLeft}>
              <User size={24} color={colors.textSecondary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  Hi! {email.split('@')[0]}
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {t('settings.logout')}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.section}
          onPress={() => router.push('/auth/login')}
        >
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
        </TouchableOpacity>
      )}

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('settings.sections.appearance')}
        </Text>

        {/* Language Selector */}
        <LanguageSelector />

        {/* Theme Selector */}
        <ThemeSelector />
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

        {/*
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
        */}
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
});
