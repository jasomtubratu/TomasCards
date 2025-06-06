import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/hooks/useTheme';
import { initializeLanguage } from '@/utils/i18n';
import { loadCards, loadSettings } from '@/utils/storage';
import SplashScreen from '@/components/SplashScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  useFrameworkReady();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [loadingMessage, setLoadingMessage] = useState('');
  const isLoggedIn = AsyncStorage.getItem('authToken') !== null;

  useEffect(() => {
    async function initializeApp() {
      try {
        setLoadingMessage('Loading language...');
        await initializeLanguage();

        setLoadingMessage('Loading settings...');
        await loadSettings();

        setLoadingMessage('Logging in...');
        if (!isLoggedIn) {
          router.push("/auth/login");
          return;
        } else {
          const token = await AsyncStorage.getItem('authToken');
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/me`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            method: 'GET',
          });
          if (response.status === 404) {
            await AsyncStorage.removeItem('authToken');
            router.push("/auth/login");
            return;
          } else if (response.status !== 200) {
            console.warn('Failed to fetch user data, using local storage instead.');
            await loadCards();
            router.push("/");
          } else {
            router.push("/");
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        setLoadingMessage('Error loading app data');
        setTimeout(() => setIsLoading(false), 2000);
      }
    }

    initializeApp();
  }, []);

  return (
    <ThemeProvider>
      {isLoading ? (
        <SplashScreen message={loadingMessage} />
      ) : (
        <GestureHandlerRootView style={styles.container}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="+not-found" options={{headerShown: false}}/>
          </Stack>
          <StatusBar style="auto" />
        </GestureHandlerRootView>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});