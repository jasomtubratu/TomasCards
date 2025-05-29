import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { LoyaltyCard } from '@/utils/types';
import { COLORS } from '@/constants/Colors';

type Props = {
  card: LoyaltyCard;
  onPress: () => void;
};

export default function LoyaltyCardComponent({ card, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: card.color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.letter}>
        {card.name.charAt(0).toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 8,
    height: 120,           // fixed height → rectangle
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
});
