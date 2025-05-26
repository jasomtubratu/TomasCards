import React, { useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated as RNAnimated
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  Easing
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { CreditCard as Edit2, Trash2 } from 'lucide-react-native';
import { LoyaltyCard as LoyaltyCardType } from '@/utils/types';
import { COLORS } from '@/constants/Colors';
import { lightHaptic, mediumHaptic } from '@/utils/feedback';
import BarcodeRenderer from './BarcodeRenderer';

interface LoyaltyCardProps {
  card: LoyaltyCardType;
  onDelete: (id: string) => void;
}

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ card, onDelete }) => {
  const router = useRouter();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  
  // Animation refs
  const cardOpacity = useRef(new RNAnimated.Value(1)).current;
  const cardHeight = useRef(new RNAnimated.Value(280)).current;
  
  // Handle card press
  const handlePress = async () => {
    await lightHaptic();
    scale.value = withSpring(0.98, { damping: 10, stiffness: 100 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      router.push(`/card/${card.id}`);
    }, 150);
  };
  
  // Handle card edit
  const handleEdit = async () => {
    await lightHaptic();
    router.push(`/card/${card.id}?edit=true`);
  };
  
  // Handle card delete with animation
  const handleDelete = async () => {
    await mediumHaptic();
    
    // Animate card disappearance
    RNAnimated.parallel([
      RNAnimated.timing(cardOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      RNAnimated.timing(cardHeight, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onDelete(card.id);
    });
  };
  
  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
    };
  });

  return (
    <RNAnimated.View 
      style={[styles.cardWrapper, { 
        opacity: cardOpacity,
        height: cardHeight 
      }]}
    >
      <PanGestureHandler>
        <Animated.View style={[styles.container, animatedStyle]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePress}
            style={styles.cardTouchable}
          >
            {/* Card Header */}
            <View style={styles.header}>
              <View style={styles.brandContainer}>
                {card.logoUrl ? (
                  <View style={styles.logoContainer} />
                ) : (
                  <View style={[styles.logoPlaceholder, { backgroundColor: card.color }]}>
                    <Text style={styles.logoPlaceholderText}>
                      {card.name.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.name}>{card.name}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleEdit}
                >
                  <Edit2 size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleDelete}
                >
                  <Trash2 size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Card Barcode/QR Section */}
            <View style={styles.codeContainer}>
              <BarcodeRenderer 
                code={card.code} 
                codeType={card.codeType} 
              />
              <Text style={styles.codeText}>{card.code}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </RNAnimated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  container: {
    borderRadius: 16,
    backgroundColor: COLORS.backgroundMedium,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    margin: 2,
  },
  cardTouchable: {
    padding: 16,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundLight,
    marginRight: 12,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoPlaceholderText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  codeContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  codeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
    letterSpacing: 1,
  },
});

export default LoyaltyCard;