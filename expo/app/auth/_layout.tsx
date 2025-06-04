import Header from '@/components/Header';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function AuthLayout() {
  const router = useRouter();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}