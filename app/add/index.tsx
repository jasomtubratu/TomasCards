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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

import { COLORS } from '@/constants/Colors';
import { POPULAR_CARDS } from '@/assets/cards';

// Import your custom Header component (same one from HomeScreen)
import Header from '@/components/Header';

export default function AddCardScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = POPULAR_CARDS.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (storeId: string) => {
    router.push({ pathname: '/add/scan', params: { store: storeId } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Choose a Card"
        showBack={true}
      />

      <TextInput
        style={styles.searchInput}
        placeholder="Search cards..."
        placeholderTextColor={COLORS.textSecondary}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <Text style={styles.sectionTitle}>Popular Cards</Text>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
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
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'android' ? 16 : 0,
        }}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
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
  },
  searchInput: {
    height: 44,
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 22,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    marginHorizontal: 16,
  },
});
