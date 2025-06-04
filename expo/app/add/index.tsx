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
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { POPULAR_CARDS } from '@/assets/cards';
import Header from '@/components/Header';

export default function AddCardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const filtered = POPULAR_CARDS.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (storeId: string) => {
    router.push({ pathname: '/add/scan', params: { store: storeId } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Header title={t('addCard.title')} showBack={true} />

      <TextInput
        style={[styles.searchInput, { 
          backgroundColor: colors.backgroundMedium,
          color: colors.textPrimary 
        }]}
        placeholder={t('addCard.scan.manual')}
        placeholderTextColor={colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('cards.sections.all')}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.backgroundMedium }]} />
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => handleSelect(item.id)}
            activeOpacity={0.7}
          >
            <Image source={item.logo} style={styles.logo} />
            <Text style={[styles.itemText, { color: colors.textPrimary }]}>
              {item.name}
            </Text>
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
  container: {
    flex: 1,
  },
  searchInput: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
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
    fontSize: 16,
    fontWeight: '500',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
});