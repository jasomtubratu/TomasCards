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
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import CodeScanner from '@/components/CodeScanner';
import { addCard } from '@/utils/storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { store } = useLocalSearchParams<{ store?: string }>();
  const [scanned, setScanned] = useState(false);

  const handleCodeScanned = async (data: string, type: 'barcode' | 'qrcode') => {
    if (scanned) return;
    setScanned(true);
    const newCard = {
      id: Date.now().toString(),
      name: store || 'Unknown Store',
      code: data,
      codeType: type,
      brand: store,
      color: colors.accent,
      dateAdded: Date.now(),
    };
    await addCard(newCard);
    router.replace(`/card/${newCard.id}`);
  };

  const handleManual = () => {
    router.push({ pathname: '/add/manual', params: { store } });
  };

  const handleBack = () => router.back();
  const handleClose = () => router.replace('/');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {store?.toUpperCase() || t('addCard.scan.title')}
          </Text>

          <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.instruction, { color: colors.textSecondary }]}>
          {t('addCard.scan.instruction')}
        </Text>

        <CodeScanner onCodeScanned={handleCodeScanned} />

        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          {t('addCard.scan.manual')}
        </Text>

        <TouchableOpacity 
          style={[styles.manualBtn, { borderColor: colors.textPrimary }]} 
          onPress={handleManual}
        >
          <Text style={[styles.manualBtnText, { color: colors.textPrimary }]}>
            {t('addCard.scan.enterManually')}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 0,
    paddingHorizontal: 16,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconBtn: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  instruction: {
    marginTop: 16,
    fontSize: 14,
  },
  fallbackText: {
    marginTop: 32,
    fontSize: 14,
  },
  manualBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  manualBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});