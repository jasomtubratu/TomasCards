import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Pencil, Star, Trash2, X } from 'lucide-react-native'; // Added X for close icon
import QRCode from 'react-native-qrcode-svg';

import { LoyaltyCard } from '@/utils/types';
import { getCard, updateCard, deleteCard } from '@/utils/storage';
import { COLORS } from '@/constants/Colors';
import BarcodeRenderer from '@/components/BarcodeRenderer';
import CardForm from '@/components/CardForm';
import Header from '@/components/Header';

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

  const handleDeleteCard = async () => {
    const confirmDelete = () => {
      if (id) {
        deleteCard(id).then(() => {
          router.replace('/');
        });
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete this card?')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Card',
        'Are you sure you want to delete this card? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', onPress: confirmDelete, style: 'destructive' },
        ]
      );
    }
  };

  const toggleFavorite = async () => {
    if (card) {
      const updatedCard = { ...card, isFavorite: !card.isFavorite };
      await updateCard(updatedCard);
      setCard(updatedCard);
    }
  };

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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* --- Header bar for the detail screen --- */}
      <Header
        title={card.name}
        showBack={true}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
            <Star
              size={24}
              color={COLORS.textPrimary}
              fill={card.isFavorite ? COLORS.textPrimary : 'none'}
            />
          </TouchableOpacity>
        }
      />

      {/* --- Main Card Detail Content --- */}
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

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Pencil size={20} color={COLORS.textPrimary} />
            <Text style={styles.buttonText}>Edit Card</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteCard}>
            <Trash2 size={20} color={COLORS.error} />
            <Text style={styles.deleteButtonText}>Delete Card</Text>
          </TouchableOpacity>
        </View>

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

      <Modal
        visible={isEditing}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditing(false)}
      >
        {/* TouchableWithoutFeedback allows tapping outside to close */}
        <TouchableWithoutFeedback onPress={() => setIsEditing(false)}>
          <View style={styles.modalBackground} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContainer}>
          {/* Header inside modal with a 'Close' (X) button */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Card</Text>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.closeButton}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* CardForm will call handleUpdateCard when saved */}
          <CardForm existingCard={card} onSave={handleUpdateCard} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  contentContainer: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundDark,
    padding: 16,
  },
  favoriteButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.backgroundMedium,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoPlaceholderText: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  cardName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  notesContainer: {
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  infoContainer: {
    marginTop: 24,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textHint,
    marginBottom: 4,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundMedium,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundMedium,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },


  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    right: '5%',
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 16,
    padding: 16,
    maxHeight: '60%',
    // Add a drop shadow on iOS/Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 8,
  },
});
