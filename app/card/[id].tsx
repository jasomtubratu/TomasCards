import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { ArrowLeft, CreditCard as Edit2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { LoyaltyCard } from '@/utils/types';
import { getCard, updateCard } from '@/utils/storage';
import { COLORS } from '@/constants/Colors';
import BarcodeRenderer from '@/components/BarcodeRenderer';
import CardForm from '@/components/CardForm';

export default function CardDetailScreen() {
  const router = useRouter();
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [isEditing, setIsEditing] = useState(edit === 'true');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCardData = async () => {
      if (!id) return;
      try {
        const cardData = await getCard(id);
        if (cardData) {
          setCard(cardData);
          if (!isEditing) {
            const updated = { ...cardData, lastUsed: Date.now() };
            await updateCard(updated);
          }
        }
      } catch (e) {
        console.error('Error loading card:', e);
      } finally {
        setLoading(false);
      }
    };
    loadCardData();
  }, [id, isEditing]);

  const handleUpdateCard = async (updatedCard: LoyaltyCard) => {
    await updateCard(updatedCard);
    setCard(updatedCard);
    setIsEditing(false);
  };

  const toggleEditMode = () => setIsEditing(v => !v);
  const handleBack = () => router.back();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Card not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isEditing) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.backgroundDark },
            headerTitleStyle: { color: COLORS.textPrimary },
            headerTintColor: COLORS.textPrimary,
            title: 'Edit Card',
            headerLeft: () => (
              <TouchableOpacity onPress={() => setIsEditing(false)} style={{ marginLeft: 12 }}>
                <ArrowLeft size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            ),
          }}
        />
        <CardForm existingCard={card} onSave={handleUpdateCard} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.backgroundDark },
          headerTitleStyle: { color: COLORS.textPrimary },
          headerTintColor: COLORS.textPrimary,
          title: card.name,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={{ marginLeft: 12 }}>
              <ArrowLeft size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={toggleEditMode} style={{ marginRight: 12 }}>
              <Edit2 size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.cardHeader}>
          <View style={[styles.logoPlaceholder, { backgroundColor: card.color }]}>  
            <Text style={styles.logoPlaceholderText}>
              {card.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.cardName}>{card.name}</Text>
        </View>

        <View style={styles.codeContainer}>
          {card.codeType === 'qrcode' ? (
            <QRCode
              value={card.code}
              size={200}
              color={COLORS.textPrimary}
              backgroundColor="transparent"
            />
          ) : (
            <BarcodeRenderer code={card.code} codeType={card.codeType} />
          )}
          <Text style={styles.codeText}>{card.code}</Text>
        </View>

        {card.notes ? (
          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{card.notes}</Text>
          </View>
        ) : null}

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Added: {new Date(card.dateAdded).toLocaleDateString()}
          </Text>
          {card.lastUsed && (
            <Text style={styles.infoText}>
              Last used: {new Date(card.lastUsed).toLocaleDateString()}
            </Text>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  contentContainer: { padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.backgroundDark, padding: 16 },
  errorText: { fontSize: 18, color: COLORS.error, marginBottom: 24 },
  backButton: { backgroundColor: COLORS.backgroundMedium, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  backButtonText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  logoPlaceholder: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  logoPlaceholderText: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '700' },
  cardName: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  codeContainer: { alignItems: 'center', marginBottom: 24 },
  codeText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  notesContainer: { backgroundColor: COLORS.backgroundMedium, borderRadius: 12, padding: 16, marginBottom: 24 },
  notesTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  notesText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  infoContainer: { marginBottom: 24 },
  infoText: { fontSize: 14, color: COLORS.textHint, marginBottom: 4 },
});
