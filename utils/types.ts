export interface LoyaltyCard {
  id: string;
  name: string;
  brand?: string;
  code: string;
  codeType: 'barcode' | 'qrcode';
  color: string;
  dateAdded: number;
  lastUsed?: number;
  notes?: string;
  isFavorite?: boolean;
}

export type SortOption = 'alphabetical' | 'recent' | 'lastUsed' | 'custom';

export interface AppSettings {
  sortOption: SortOption;
  cardOrder?: string[]; // Array of card IDs in custom order
  hapticFeedback: boolean;
  secureWithBiometrics: boolean;
}