export interface LoyaltyCard {
  id: string;
  name: string;
  code: string;
  codeType: 'barcode' | 'qrcode';
  color: string;
  dateAdded: number;
  lastUsed?: number;
  notes?: string;
  // For custom logo/icon (URL string or base64)
  logoUrl?: string;
}

export type SortOption = 'alphabetical' | 'recent' | 'lastUsed' | 'custom';

export interface AppSettings {
  sortOption: SortOption;
  cardOrder?: string[]; // Array of card IDs in custom order
  hapticFeedback: boolean;
  secureWithBiometrics: boolean;
}