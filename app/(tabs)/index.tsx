import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowUpDown, Star, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LoyaltyCard } from '@/utils/types';
import { loadCards } from '@/utils/storage';
import { COLORS } from '@/constants/Colors';
import LoyaltyCardComponent from '@/components/LoyaltyCard';
import Header from '@/components/Header';
import EmptyState from '@/components/EmptyState';

type SortType = 'name' | 'date' | 'lastUsed';

export default function HomeScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortType, setSortType] = useState<SortType>('name');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const loadCardData = useCallback(async () => {
    try {
      const data = await loadCards();
      setCards(data);
    } catch (e) {
      console.error('Error loading cards', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCardData();
  }, [loadCardData]);

  useFocusEffect(
    useCallback(() => {
      loadCardData();
    }, [loadCardData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCardData();
    setRefreshing(false);
  };

  const sortCards = (cards: LoyaltyCard[]) => {
    switch (sortType) {
      case 'name':
        return [...cards].sort((a, b) => a.name.localeCompare(b.name));
      case 'date':
        return [...cards].sort((a, b) => b.dateAdded - a.dateAdded);
      case 'lastUsed':
        return [...cards].sort((a, b) => {
          if (!a.lastUsed) return 1;
          if (!b.lastUsed) return -1;
          return b.lastUsed - a.lastUsed;
        });
      default:
        return cards;
    }
  };

  const sortedCards = sortCards(cards);
  const favoriteCards = sortedCards.filter(card => card.isFavorite);
  const otherCards = sortedCards.filter(card => !card.isFavorite);

  const SortMenu = () => (
    <View style={[styles.sortMenu, !showSortMenu && styles.hidden]}>
      <TouchableOpacity 
        style={[
          styles.sortOption,
          sortType === 'name' && styles.sortOptionSelected
        ]} 
        onPress={() => {
          setSortType('name');
          setShowSortMenu(false);
        }}>
        <Text style={[
          styles.sortOptionText,
          sortType === 'name' && styles.sortOptionTextSelected
        ]}>Sort by Name</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.sortOption,
          sortType === 'date' && styles.sortOptionSelected
        ]}
        onPress={() => {
          setSortType('date');
          setShowSortMenu(false);
        }}>
        <Text style={[
          styles.sortOptionText,
          sortType === 'date' && styles.sortOptionTextSelected
        ]}>Sort by Date Added</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.sortOption,
          sortType === 'lastUsed' && styles.sortOptionSelected
        ]}
        onPress={() => {
          setSortType('lastUsed');
          setShowSortMenu(false);
        }}>
        <Text style={[
          styles.sortOptionText,
          sortType === 'lastUsed' && styles.sortOptionTextSelected
        ]}>Sort by Last Used</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSection = (title: string, data: LoyaltyCard[]) => {
    if (data.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <LoyaltyCardComponent
              card={item}
              onPress={() => router.push(`/card/${item.id}`)}
            />
          )}
          scrollEnabled={false}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Card Collection" 
        showBack={false}
        rightElement={
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowSortMenu(!showSortMenu)}
            >
              <ArrowUpDown size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.push('/add')}
            >
              <Plus size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        }
      />
      
      <SortMenu />
      
      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={[]} // Empty data as we're using ListHeaderComponent
          renderItem={() => null} // No-op renderItem to satisfy FlatList requirements
          ListHeaderComponent={
            <>
              {renderSection('Favorites', favoriteCards)}
              {renderSection(favoriteCards.length > 0 ? 'Other Cards' : 'All Cards', otherCards)}
            </>
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundDark,
  },
  list: {
    padding: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 8,
  },
  sortMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 12,
    padding: 4,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200,
  },
  hidden: {
    display: 'none',
  },
  sortOption: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  sortOptionSelected: {
    backgroundColor: COLORS.backgroundLight,
  },
  sortOptionText: {
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  sortOptionTextSelected: {
    color: COLORS.accent,
    fontWeight: '600',
  },
});