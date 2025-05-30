import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import CodeScanner from '@/components/CodeScanner';

export default function ScanScreen() {
  const router = useRouter();
  const { store } = useLocalSearchParams<{ store?: string }>();
  const [scanned, setScanned] = useState(false);

  const handleCodeScanned = (data: string, type: 'barcode' | 'qrcode') => {
    if (scanned) return;
    setScanned(true);
    router.push({ 
      pathname: '/add/manual',
      params: { 
        code: data,
        store,
        type 
      }
    });
  };

  const handleManual = () => {
    router.push({ pathname: '/add/manual', params: { store } });
  };

  const handleBack = () => router.back();
  const handleClose = () => router.replace('/');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.title}>
            {store?.toUpperCase() || 'Scan'}
          </Text>

          <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
            <X size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.instruction}>
          Scan your card's barcode or QR code
        </Text>

        <CodeScanner onCodeScanned={handleCodeScanned} />

        <Text style={styles.fallbackText}>
          Can't scan your card?
        </Text>

        <TouchableOpacity style={styles.manualBtn} onPress={handleManual}>
          <Text style={styles.manualBtnText}>Enter Manually</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconBtn: {
    padding: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  instruction: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  fallbackText: {
    marginTop: 32,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  manualBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.textPrimary,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  manualBtnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});