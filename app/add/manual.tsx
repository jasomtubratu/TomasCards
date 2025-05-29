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

// Typed list of stores for lookup
const POPULAR_CARDS: { id: string; name: string }[] = [
  { id: 'kaufland',   name: 'Kaufland' },
  { id: 'lidl',       name: 'Lidl' },
  { id: 'coop',       name: 'COOP Jednota' },
  { id: 'teta',       name: 'TETA' },
  { id: 'dracik',     name: 'Dráčik' },
  { id: 'kik',        name: 'KIK' },
  { id: 'sportisimo', name: 'Sportisimo' },
  { id: 'nay',        name: 'NAY' },
];

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
      code,
      codeType: 'barcode',
      color,
      dateAdded: Date.now(),
    };
    await addCard(newCard);
    // navigate into the detail screen
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
          <Text style={styles.title}>{name}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
            <X size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

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
    fontSize: 18,
    fontWeight: '600',
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
