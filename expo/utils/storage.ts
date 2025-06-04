import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoyaltyCard, AppSettings } from './types';

// Storage keys
const CARDS_STORAGE_KEY = 'loyalty_cards';
const SETTINGS_STORAGE_KEY = 'app_settings';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  sortOption: 'alphabetical',
  hapticFeedback: true,
  secureWithBiometrics: false,
  themeMode: 'system',
};

// Load all cards
export async function loadCards(): Promise<LoyaltyCard[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(CARDS_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to load cards from storage', e);
    return [];
  }
}

// Save all cards
export async function saveCards(cards: LoyaltyCard[]): Promise<void> {
  try {
    const jsonValue = JSON.stringify(cards);
    await AsyncStorage.setItem(CARDS_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to save cards to storage', e);
  }
}

// Add a new card
export async function addCard(card: LoyaltyCard): Promise<void> {
  try {
    const cards = await loadCards();
    cards.push(card);
    await saveCards(cards);
  } catch (e) {
    console.error('Failed to add card', e);
  }
}

// Update a card
export async function updateCard(updatedCard: LoyaltyCard): Promise<void> {
  try {
    const cards = await loadCards();
    const index = cards.findIndex(card => card.id === updatedCard.id);
    if (index !== -1) {
      cards[index] = updatedCard;
      await saveCards(cards);
    }
  } catch (e) {
    console.error('Failed to update card', e);
  }
}

// Delete a card
export async function deleteCard(id: string): Promise<void> {
  try {
    const cards = await loadCards();
    const filteredCards = cards.filter(card => card.id !== id);
    await saveCards(filteredCards);
  } catch (e) {
    console.error('Failed to delete card', e);
  }
}

// Get a single card by ID
export async function getCard(id: string): Promise<LoyaltyCard | null> {
  try {
    const cards = await loadCards();
    return cards.find(card => card.id === id) || null;
  } catch (e) {
    console.error('Failed to get card', e);
    return null;
  }
}

// Load app settings
export async function loadSettings(): Promise<AppSettings> {
  try {
    const jsonValue = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    return jsonValue != null 
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(jsonValue) } 
      : DEFAULT_SETTINGS;
  } catch (e) {
    console.error('Failed to load settings from storage', e);
    return DEFAULT_SETTINGS;
  }
}

// Save app settings
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to save settings to storage', e);
  }
}