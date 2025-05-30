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
import type { LoyaltyCard } from '@/utils/types';
import { loadCards } from '@/utils/storage';
import { COLORS } from '@/constants/Colors';
import LoyaltyCardComponent from '@/components/LoyaltyCard';
import { Plus, ArrowUpDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const SortMenu = () => (
    <View style={[styles.sortMenu, !showSortMenu && styles.hidden]}>
      <TouchableOpacity 
        style={styles.sortOption} 
        onPress={() => {
          setSortType('name');
          setShowSortMenu(false);
        }}>
        <Text style={styles.sortOptionText}>Sort by Name</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.sortOption}
        onPress={() => {
          setSortType('date');
          setShowSortMenu(false);
        }}>
        <Text style={styles.sortOptionText}>Sort by Date Added</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.sortOption}
        onPress={() => {
          setSortType('lastUsed');
          setShowSortMenu(false);
        }}>
        <Text style={styles.sortOptionText}>Sort by Last Used</Text>
      </TouchableOpacity>
    </View>
  );

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
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <ArrowUpDown size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        }
      />
      
      <SortMenu />
      
      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={sortedCards}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <LoyaltyCardComponent
              card={item}
              onPress={() => router.push(`/card/${item.id}`)}
            />
          )}
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
  list: {
    padding: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundDark,
  },
  sortButton: {
    padding: 8,
  },
  sortMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 8,
    padding: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  hidden: {
    display: 'none',
  },
  sortOption: {
    padding: 12,
    borderRadius: 4,
  },
  sortOptionText: {
    color: COLORS.textPrimary,
    fontSize: 16,
  },
});