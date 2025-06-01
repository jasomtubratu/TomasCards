import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useTheme } from '@/hooks/useTheme';
import { initializeLanguage } from '@/utils/i18n';
import { loadCards, loadSettings } from '@/utils/storage';
import SplashScreen from '@/components/SplashScreen';

export default function RootLayout() {
  useFrameworkReady();
  const { isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    async function initializeApp() {
      try {
        // Initialize language
        setLoadingMessage('Loading language...');
        await initializeLanguage();

        // Load user settings
        setLoadingMessage('Loading settings...');
        await loadSettings();

        // Load cards data
        setLoadingMessage('Loading cards...');
        await loadCards();

        // Add a small delay to ensure smooth transition
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        setLoadingMessage('Error loading app data');
        // Still hide splash screen after error to not block the user
        setTimeout(() => setIsLoading(false), 2000);
      }
    }

    initializeApp();
  }, []);

  if (isLoading) {
    return <SplashScreen message={loadingMessage} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" options={{headerShown: false}}/>
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});