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
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import type { LoyaltyCard } from '@/utils/types';
import { loadCards } from '@/utils/storage';
import { COLORS } from '@/constants/Colors';
import LoyaltyCardComponent from '@/components/LoyaltyCard';
import { Plus } from 'lucide-react-native';

type CardItem = LoyaltyCard | { id: string; isAddButton: true };

export default function HomeScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // split favorites vs others
  const favorites = cards.filter(c => c.isFavorite);
  const others = cards.filter(c => !c.isFavorite);

  // append the Add‐button tile
  const items: CardItem[] = [
    ...others,
    { id: 'ADD_CARD', isAddButton: true },
  ];

  const renderItem = ({ item }: { item: CardItem }) => {
    if ('isAddButton' in item) {
      return (
        <TouchableOpacity
          style={[styles.tile, styles.addTile]}
          onPress={() => router.push('/add')}
          activeOpacity={0.7}
        >
          <Plus size={32} color={COLORS.textPrimary} />
        </TouchableOpacity>
      );
    }
    return (
      <LoyaltyCardComponent
        card={item}
        onPress={() => router.push(`/card/${item.id}`)}
      />
    );
  };

  // header component that renders the favorites grid
  const ListHeader = () =>
    favorites.length > 0 ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorites</Text>
        <View style={styles.grid}>
          {favorites.map(card => (
            <View style={styles.gridItem} key={card.id}>
              <LoyaltyCardComponent
                card={card}
                onPress={() => router.push(`/card/${card.id}`)}
              />
            </View>
          ))}
        </View>
      </View>
    ) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Cards',
          headerStyle: { backgroundColor: COLORS.backgroundDark },
          headerTitleStyle: { color: COLORS.textPrimary },
          headerTintColor: COLORS.textPrimary,
        }}
      />
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        renderItem={renderItem}
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
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 8,
    backgroundColor: COLORS.backgroundDark,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundDark,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 8,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '50%',
    padding: 8,
  },
  tile: {
    flex: 1,
    margin: 8,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTile: {
    backgroundColor: COLORS.backgroundMedium,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
});