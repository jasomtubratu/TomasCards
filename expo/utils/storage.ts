import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoyaltyCard, AppSettings } from './types';
import { storageManager } from './storageManager';

// Storage keys
const SETTINGS_STORAGE_KEY = 'app_settings';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  sortOption: 'alphabetical',
  hapticFeedback: true,
  secureWithBiometrics: false,
  themeMode: 'system',
};

// Legacy functions for backward compatibility - now use StorageManager
export async function loadCards(): Promise<LoyaltyCard[]> {
  return await storageManager.loadCards();
}

export async function saveCards(cards: LoyaltyCard[]): Promise<void> {
  // This is now handled by the storage manager
  await storageManager.saveLocalCards(cards);
}

export async function addCard(card: LoyaltyCard): Promise<void> {
  // Check if online - this should be passed from the calling component
  const isOnline = true; // Placeholder
  await storageManager.saveCard(card, isOnline);
}

export async function updateCard(updatedCard: LoyaltyCard): Promise<void> {
  const isOnline = true; // Placeholder
  await storageManager.updateCard(updatedCard, isOnline);
}

export async function deleteCard(id: string): Promise<void> {
  const isOnline = true; // Placeholder
  await storageManager.deleteCard(id, isOnline);
}

export async function getCard(id: string): Promise<LoyaltyCard | null> {
  const cards = await storageManager.loadCards();
  return cards.find(card => card.id === id) || null;
}

// Settings functions remain unchanged
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

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to save settings to storage', e);
  }
}