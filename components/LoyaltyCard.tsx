import React from 'react';
import {
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import type { LoyaltyCard } from '@/utils/types';
import { COLORS } from '@/constants/Colors';
import { POPULAR_CARDS } from '@/assets/cards';

type Props = {
  card: LoyaltyCard; // no brand property here – we’ll match by `name`
  onPress: () => void;
};

export default function LoyaltyCardComponent({ card, onPress }: Props) {
  // Match by card.name instead of card.brand
  const matchedCard = POPULAR_CARDS.find(
    (item) =>
      item.brand?.toLowerCase() === card.name.toLowerCase()
  );

  const logoSource: ImageSourcePropType | null = matchedCard
    ? (matchedCard.logo as ImageSourcePropType)
    : null;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: card.color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {logoSource ? (
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.letter}>{card.name}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 8,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 64,
    height: 64,
  },
  letter: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
});
