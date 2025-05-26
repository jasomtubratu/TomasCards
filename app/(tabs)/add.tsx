import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Circle as XCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import CardForm from '@/components/CardForm';
import { LoyaltyCard } from '@/utils/types';
import { addCard } from '@/utils/storage';

export default function AddCardScreen() {
  const router = useRouter();
  const [scannedCode, setScannedCode] = useState('');
  const [scannedType, setScannedType] = useState<'barcode' | 'qrcode'>('barcode');

  // Handle save card
  const handleSaveCard = async (card: LoyaltyCard) => {
    await addCard(card);
    router.replace('/');
  };

  // Render form
  return (
    <View style={styles.container}>
      <CardForm 
        onSave={handleSaveCard}
        onScanPress={() => {
          if (Platform.OS === 'web') {
            alert('Camera scanning is not available on web');
          }
        }}
      />
      {scannedCode ? (
        <View style={styles.scannedBadge}>
          <Text style={styles.scannedText}>
            Code scanned successfully!
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  scannedBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: COLORS.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  scannedText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});