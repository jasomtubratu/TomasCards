import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

import { COLORS } from '@/constants/Colors';
import POPULAR_CARDS from '@/assets/cards.json';

export default function AddCardScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = POPULAR_CARDS.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (storeId: string) => {
    // push into your scanning or manual entry flow:
    router.push({ pathname: '/add/scan', params: { store: storeId } });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: COLORS.backgroundDark },
          headerTitle: 'Vyber kartu',
          headerTitleStyle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600' },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container}>
        <TextInput
          style={styles.searchInput}
          placeholder="Hľadať podľa mena"
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        <Text style={styles.sectionTitle}>Populárne karty</Text>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemRow}
              onPress={() => handleSelect(item.id)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: item.logo }} style={styles.logo} />
              <Text style={styles.itemText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 16 : 0 }}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginLeft: 16,
    marginRight: 8,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 16,
  },
  searchInput: {
    height: 44,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 22,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    marginVertical: 16,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logo: {
    width: 40,
    height: 24,
    resizeMode: 'contain',
    marginRight: 16,
  },
  itemText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.backgroundMedium,
  },
});
