import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Import as SortAsc, Filter } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { LoyaltyCard, SortOption } from '@/utils/types';
import { loadCards, deleteCard, loadSettings } from '@/utils/storage';
import { COLORS } from '@/constants/Colors';
import LoyaltyCardComponent from '@/components/LoyaltyCard';
import EmptyState from '@/components/EmptyState';

export default function HomeScreen() {
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('alphabetical');

  // Load cards
  const loadCardData = useCallback(async () => {
    setLoading(true);
    try {
      const cardData = await loadCards();
      const settings = await loadSettings();
      
      setSortOption(settings.sortOption);
      setCards(cardData);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCardData();
  }, [loadCardData]);

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadCardData();
    }, [loadCardData])
  );

  // Handle card deletion
  const handleDeleteCard = async (id: string) => {
    try {
      await deleteCard(id);
      setCards(cards.filter(card => card.id !== id));
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadCardData();
    setRefreshing(false);
  };

  // Sort cards based on sort option
  const sortedCards = [...cards].sort((a, b) => {
    switch (sortOption) {
      case 'alphabetical':
        return a.name.localeCompare(b.name);
      case 'recent':
        return b.dateAdded - a.dateAdded;
      case 'lastUsed':
        if (!a.lastUsed && !b.lastUsed) return 0;
        if (!a.lastUsed) return 1;
        if (!b.lastUsed) return -1;
        return b.lastUsed - a.lastUsed;
      default:
        return 0;
    }
  });

  // Toggle sort option
  const toggleSortOption = () => {
    const options: SortOption[] = ['alphabetical', 'recent', 'lastUsed'];
    const currentIndex = options.indexOf(sortOption);
    const nextIndex = (currentIndex + 1) % options.length;
    setSortOption(options[nextIndex]);
  };

  // Render each card
  const renderCard = ({ item }: { item: LoyaltyCard }) => (
    <LoyaltyCardComponent
      card={item}
      onDelete={handleDeleteCard}
    />
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with sort options */}
      {cards.length > 0 && (
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={toggleSortOption}
          >
            <SortAsc size={20} color={COLORS.textSecondary} />
            <Text style={styles.sortButtonText}>
              {sortOption === 'alphabetical' ? 'A-Z' : 
               sortOption === 'recent' ? 'Recent' : 'Last Used'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Card list */}
      <FlatList
        data={sortedCards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.cardList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundMedium,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sortButtonText: {
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  cardList: {
    padding: 16,
    paddingTop: 8,
  },
});