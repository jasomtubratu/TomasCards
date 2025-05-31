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
import { ArrowUpDown, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LoyaltyCard } from '@/utils/types';
import { loadCards } from '@/utils/storage';
import { useTheme } from '@/hooks/useTheme';
import LoyaltyCardComponent from '@/components/LoyaltyCard';
import Header from '@/components/Header';
import EmptyState from '@/components/EmptyState';

type SortType = 'name' | 'date' | 'lastUsed';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
    <View style={[
      styles.sortMenu,
      !showSortMenu && styles.hidden,
      { backgroundColor: colors.backgroundMedium }
    ]}>
      <TouchableOpacity 
        style={[
          styles.sortOption,
          sortType === 'name' && { backgroundColor: colors.backgroundLight }
        ]} 
        onPress={() => {
          setSortType('name');
          setShowSortMenu(false);
        }}>
        <Text style={[
          styles.sortOptionText,
          { color: sortType === 'name' ? colors.accent : colors.textPrimary }
        ]}>Sort by Name</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.sortOption,
          sortType === 'date' && { backgroundColor: colors.backgroundLight }
        ]}
        onPress={() => {
          setSortType('date');
          setShowSortMenu(false);
        }}>
        <Text style={[
          styles.sortOptionText,
          { color: sortType === 'date' ? colors.accent : colors.textPrimary }
        ]}>Sort by Date Added</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.sortOption,
          sortType === 'lastUsed' && { backgroundColor: colors.backgroundLight }
        ]}
        onPress={() => {
          setSortType('lastUsed');
          setShowSortMenu(false);
        }}>
        <Text style={[
          styles.sortOptionText,
          { color: sortType === 'lastUsed' ? colors.accent : colors.textPrimary }
        ]}>Sort by Last Used</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSection = (title: string, data: LoyaltyCard[]) => {
    if (data.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
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
      <View style={[styles.center, { backgroundColor: colors.backgroundDark }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Header 
        title="Card Collection" 
        showBack={false}
        rightElement={
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.backgroundMedium }]}
              onPress={() => setShowSortMenu(!showSortMenu)}
            >
              <ArrowUpDown size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.backgroundMedium }]}
              onPress={() => router.push('/add')}
            >
              <Plus size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        }
      />
      
      <SortMenu />
      
      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
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
              tintColor={colors.accent}
              colors={[colors.accent]}
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
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 8,
  },
  sortMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
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
  sortOptionText: {
    fontSize: 16,
  },
});