import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { addCard } from '@/utils/storage';
import type { LoyaltyCard } from '@/utils/types';
import { POPULAR_CARDS } from '@/assets/cards';

export default function ManualEntryScreen() {
  const router = useRouter();
  const { store } = useLocalSearchParams<{ store?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  // find store metadata
  const meta = POPULAR_CARDS.find((c) => c.id === store);
  const name = meta?.name ?? '';
  // fallback color for manual entries
  const color = COLORS.accent;

  const handleBack = () => router.back();
  const handleClose = () => router.replace('/');
  const handleSave = async () => {
    if (!code.trim()) {
      setError('Musíte zadať kód');
      return;
    }
    const newCard: LoyaltyCard = {
      id: Date.now().toString(),
      name,
      brand: store,
      code,
      codeType: (meta?.type as 'barcode' | 'qrcode') ?? 'barcode',
      color,
      dateAdded: Date.now(),
    };
    await addCard(newCard);
    router.replace(`/card/${newCard.id}`);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.container}>
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

        <Text style={styles.title}>
          Manuálne pridanie karty
        </Text>
        <Text style={styles.instruction}>
          Zadaj čiarový kód svojej karty ručne
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Čiarový kód"
          placeholderTextColor={COLORS.textSecondary}
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setError('');
          }}
          autoCapitalize="none"
          keyboardType="number-pad"
          autoFocus
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>Uložiť</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
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
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    paddingBottom: 8,
  },
  instruction: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    height: 48,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
  },
  error: {
    color: COLORS.error,
    marginTop: 8,
  },
  saveBtn: {
    marginTop: 24,
    backgroundColor: COLORS.accent,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
