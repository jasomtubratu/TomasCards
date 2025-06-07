import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Trash2, Coffee, Info, User, Moon, Sun, Monitor, HelpCircle, HandPlatterIcon, HeartPulseIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppSettings, ThemeMode } from '@/utils/types';
import { loadSettings, saveSettings, saveCards } from '@/utils/storage';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import LanguageSelector from '@/components/LanguageSelector';
import { lightHaptic } from '@/utils/feedback';
import ThemeSelector from '@/components/ThemeSelector';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, themeMode, setThemeMode } = useTheme();
  const { logout } = useAuth();
  const { isOnline } = useNetworkStatus();
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
      if (token) {
        setIsLoggedIn(true);
        if (isOnline) {
          await fetchUserData();
        }
      }
      setLoadingStatus(false);
    };
    checkLoginStatus();
  }, [isOnline]);

  // Fetch user data from API when online
  async function fetchUserData() {
    if (!isOnline) return;
    
    setLoadingStatus(true);
    const token = await AsyncStorage.getItem('authToken') || '';
    
    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmail(data.email || '');
        if (data.token) {
          await AsyncStorage.setItem('authToken', data.token);
        }
      } else {
        console.error('Failed to fetch user data:', response.statusText);
      }
    } catch (error) {
      console.error('Network error fetching user data:', error);
    }
    
    setLoadingStatus(false);
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

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `${t('settings.logout.title')}\n${t('settings.logout.confirm')}`
      );
      if (confirmed) {
        await logout();
        router.replace('/auth/login');
        setIsLoggedIn(false);
        setEmail('');
      }
    } else {
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
              await logout();
              router.replace('/auth/login');
              setIsLoggedIn(false);
              setEmail('');
            },
          },
        ]
      );
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundDark }]}
      contentContainerStyle={styles.content}
    >
      {/* Account Section */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('settings.sections.account')}
      </Text>
      
      {isLoggedIn ? (
        <TouchableOpacity style={styles.section} onPress={handleLogout}>
          <View style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}>
            <View style={styles.settingLeft}>
              <User size={24} color={colors.textSecondary} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                  {email ? `Hi ${email.split('@')[0].toUpperCase()}!` : 'Account'}
                  {!isOnline && ' (Offline)'}
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {t('settings.logout.description')}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.section} onPress={() => router.push('/auth/login')}>
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

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={() => {
            const newValue = !settings.hapticFeedback;
            updateSettings({ ...settings, hapticFeedback: newValue });
            if (newValue) lightHaptic();
          }}
        >
          <View style={styles.settingLeft}>
            <HeartPulseIcon size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.haptic.title')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('settings.haptic.description')}
              </Text>
            </View>
          </View>
          <Switch
            value={settings.hapticFeedback}
            onValueChange={(value) => {
              updateSettings({ ...settings, hapticFeedback: value });
              if (value) lightHaptic();
            }}
          />
        </TouchableOpacity>

        {/* Language Selector */}
        <LanguageSelector />

        {/* Theme Selector */}
        <ThemeSelector />
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('settings.sections.about')}
        </Text>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: colors.backgroundMedium }]}
          onPress={() => Linking.openURL('mailto:help@tomascards.fun')}
        >
          <View style={styles.settingLeft}>
            <HelpCircle size={24} color={colors.textSecondary} />
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t('settings.csupport.title')}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t('settings.csupport.description')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

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