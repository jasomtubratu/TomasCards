import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CloudStorage, 
  CloudStorageProvider, 
  CloudStorageScope,
  CloudStorageError,
  CloudStorageErrorCode,
  useIsCloudAvailable
} from 'react-native-cloud-storage';
import { LoyaltyCard } from './types';
import { logError, logWarning, logInfo } from '@/utils/debugManager';
import { Platform } from 'react-native';

export type StorageMode = 'local' | 'cloud';
export type SyncAction = 'replace_with_cloud' | 'merge' | 'keep_local';

export interface SyncConflictData {
  localCards: LoyaltyCard[];
  cloudCards: LoyaltyCard[];
  localCount: number;
  cloudCount: number;
}

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'favorite';
  card?: LoyaltyCard;
  cardId?: string;
  isFavorite?: boolean;
  timestamp: number;
}

export interface GoogleTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

const STORAGE_MODE_KEY = 'storage_mode';
const QUEUED_OPERATIONS_KEY = 'queued_operations';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const STORAGE_PROVIDER_KEY = 'cloud_storage_provider';
const GOOGLE_TOKEN_KEY = 'google_drive_token';
const GOOGLE_TOKEN_DATA_KEY = 'google_drive_token_data';

// Cloud file paths
const CARDS_FILE = 'loyalty_cards.json';

export class StorageManager {
  private static instance: StorageManager;
  private storageMode: StorageMode = 'local';
  private queuedOperations: QueuedOperation[] = [];
  private isInitialized = false;
  private provider = CloudStorage.getDefaultProvider();
  private accessToken: string | null = null;
  private tokenData: GoogleTokenData | null = null;
  private cloudStorage: CloudStorage;
  private isRefreshingToken = false;
  private authenticationRequiredCallback?: () => void;
  private refreshPromise: Promise<boolean> | null = null;
  private hasTriggeredAuthCallback = false;

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  constructor() {
    // Initialize CloudStorage instance with default provider
    this.cloudStorage = new CloudStorage(
      this.provider,
      this.provider === CloudStorageProvider.GoogleDrive ? { strictFilenames: true } : undefined
    );
  }

  setAuthenticationRequiredCallback(callback: () => void): void {
    this.authenticationRequiredCallback = callback;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      logInfo('Initializing storage manager', '', 'StorageManager');
      
      const mode = await AsyncStorage.getItem(STORAGE_MODE_KEY);
      this.storageMode = (mode as StorageMode) || 'local';
      logInfo('Storage mode loaded', this.storageMode, 'StorageManager');
      
      const queuedOps = await AsyncStorage.getItem(QUEUED_OPERATIONS_KEY);
      this.queuedOperations = queuedOps ? JSON.parse(queuedOps) : [];
      logInfo('Queued operations loaded', `${this.queuedOperations.length} operations`, 'StorageManager');

      const storedProvider = await AsyncStorage.getItem(STORAGE_PROVIDER_KEY);
      if (storedProvider === CloudStorageProvider.ICloud || storedProvider === CloudStorageProvider.GoogleDrive) {
        this.provider = storedProvider;
        logInfo('Cloud provider loaded', this.provider, 'StorageManager');
        
        // Recreate CloudStorage instance with the correct provider
        this.cloudStorage = new CloudStorage(
          this.provider,
          this.provider === CloudStorageProvider.GoogleDrive ? { strictFilenames: true } : undefined
        );
      }
      
      // Load token data (new enhanced format)
      const tokenDataStr = await AsyncStorage.getItem(GOOGLE_TOKEN_DATA_KEY);
      if (tokenDataStr) {
        this.tokenData = JSON.parse(tokenDataStr);
        if (this.tokenData) {
          this.accessToken = this.tokenData.accessToken;
        }
        logInfo('Google Drive token data loaded', `Expires: ${this.tokenData?.expiresAt ? new Date(this.tokenData.expiresAt).toISOString() : 'unknown'}`, 'StorageManager');
      } else {
        // Fallback to old token format
        const token = await AsyncStorage.getItem(GOOGLE_TOKEN_KEY);
        if (token) {
          this.accessToken = token;
          this.tokenData = { accessToken: token };
          logInfo('Google Drive token loaded (legacy format)', 'Token present', 'StorageManager');
        }
      }

      // Configure cloud storage if we have the necessary credentials
      await this.configureCloudStorage();

      // Check if iCloud is selected but unavailable
      if (this.storageMode === 'cloud' && this.provider === CloudStorageProvider.ICloud) {
        const isICloudAvailable = await this.isICloudAvailable();
        if (!isICloudAvailable) {
          logWarning('iCloud is selected but not available, switching to local storage', '', 'StorageManager');
          await this.setStorageMode('local', false);
        }
      } else if (this.storageMode === 'cloud' && this.provider === CloudStorageProvider.GoogleDrive) {
        // Check Google Drive authentication status
        const isValid = this.isAuthenticationValid();
        if (!isValid) {
          logWarning('Google Drive is selected but authentication is invalid, switching to local storage', '', 'StorageManager');
          this.triggerAuthenticationRequired(); // Notify UI to prompt re-authentication
          await this.setStorageMode('local', false);
        }
      }

      this.isInitialized = true;
      logInfo('Storage manager initialized successfully', '', 'StorageManager');
    } catch (error) {
      console.error('Failed to initialize storage manager:', error);
      logError('Failed to initialize storage manager', error instanceof Error ? error.message : String(error), 'StorageManager');
      this.isInitialized = true;
    }
  }


  async isICloudAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    try {
      // Use a temporary instance to check availability without affecting the main instance
      const testCloudStorage = new CloudStorage(CloudStorageProvider.ICloud);
      await testCloudStorage.exists('test-availability-check.txt');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async configureCloudStorage(): Promise<void> {
    try {
      if (this.provider === CloudStorageProvider.GoogleDrive && this.accessToken) {
        // Check if token needs refresh before configuring
        if (this.isTokenExpired()) {
          logInfo('Access token expired, attempting refresh during configuration', '', 'StorageManager');
          const refreshed = await this.refreshAccessToken();
          if (!refreshed) {
            logWarning('Token refresh failed during configuration', '', 'StorageManager');
            return;
          }
        }

        // Set the access token for Google Drive with proper scope
        this.cloudStorage.setProviderOptions({ 
          accessToken: this.accessToken,
          scope: CloudStorageScope.AppData 
        });
        logInfo('Google Drive provider configured', `Token expires: ${this.getTokenExpiryString()}`, 'StorageManager');
      } else if (this.provider === CloudStorageProvider.ICloud) {
        // Set scope for iCloud
        this.cloudStorage.setProviderOptions({ scope: CloudStorageScope.AppData });
        logInfo('iCloud provider configured', '', 'StorageManager');
      } else {
        logWarning('Cloud storage not configured', `Provider: ${this.provider}, Has token: ${!!this.accessToken}`, 'StorageManager');
      }
    } catch (error) {
      console.error('Failed to configure cloud storage:', error);
      logError('Failed to configure cloud storage', error instanceof Error ? error.message : String(error), 'StorageManager');
    }
  }

  private isTokenExpired(): boolean {
    if (!this.tokenData?.expiresAt) {
      return false; // If no expiry info, assume it's still valid
    }
    
    // Add 5 minute buffer before actual expiry
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const isExpired = Date.now() >= (this.tokenData.expiresAt - bufferTime);
    
    if (isExpired) {
      logInfo('Token is expired or expiring soon', this.getTokenExpiryString(), 'StorageManager');
    }
    
    return isExpired;
  }

  private getTokenExpiryString(): string {
    if (!this.tokenData?.expiresAt) {
      return 'No expiry info';
    }
    
    const now = Date.now();
    const expiresAt = this.tokenData.expiresAt;
    
    if (now >= expiresAt) {
      return 'Expired';
    }
    
    const timeLeft = expiresAt - now;
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Expires in ${hours}h ${minutes}m`;
    } else {
      return `Expires in ${minutes}m`;
    }
  }

  // Public method to force refresh token (for testing/debugging)
  async refreshAccessToken(): Promise<boolean> {
    // If already refreshing, wait for the existing refresh to complete
    if (this.refreshPromise) {
      logInfo('Token refresh already in progress, waiting...', '', 'StorageManager');
      return await this.refreshPromise;
    }

    if (!this.tokenData?.refreshToken) {
      logWarning('No refresh token available, authentication required', '', 'StorageManager');
      this.triggerAuthenticationRequired();
      return false;
    }

    // Create a promise for this refresh operation
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<boolean> {
    this.isRefreshingToken = true;

    try {
      logInfo('Attempting to refresh Google Drive access token', `Current token expires: ${this.getTokenExpiryString()}`, 'StorageManager');

      // Get the appropriate client ID based on platform
      let clientId: string | undefined;
      
      if (Platform.OS === 'web') {
        clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
      } else if (Platform.OS === 'ios') {
        clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
      } else if (Platform.OS === 'android') {
        clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
      }

      if (!clientId) {
        logError('No Google client ID configured for platform', `Platform: ${Platform.OS}`, 'StorageManager');
        throw new Error(`Google client ID not configured for platform: ${Platform.OS}`);
      }

      logInfo('Using client ID for token refresh', `Platform: ${Platform.OS}`, 'StorageManager');

      const requestBody = new URLSearchParams({
        client_id: clientId,
        refresh_token: this.tokenData!.refreshToken!,
        grant_type: 'refresh_token',
      });

      logInfo('Token refresh request prepared', `Body: ${requestBody.toString()}`, 'StorageManager');

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logError('Token refresh HTTP error', `${response.status}: ${errorText}`, 'StorageManager');
        
        // If refresh token is invalid, clear tokens and require re-authentication
        if (response.status === 400 || response.status === 401) {
          logWarning('Refresh token invalid, clearing tokens', '', 'StorageManager');
          await this.clearTokenData();
          this.triggerAuthenticationRequired();
          return false;
        }
        
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logInfo('Token refresh response received', `Has access_token: ${!!data.access_token}`, 'StorageManager');

      if (data.access_token) {
        // Update token data
        const newTokenData: GoogleTokenData = {
          ...this.tokenData!,
          accessToken: data.access_token,
          expiresAt: data.expires_in ? Date.now() + (data.expires_in * 1000) : undefined,
          tokenType: data.token_type || 'Bearer',
        };

        // If a new refresh token is provided, update it
        if (data.refresh_token) {
          newTokenData.refreshToken = data.refresh_token;
          logInfo('New refresh token received', '', 'StorageManager');
        }

        this.tokenData = newTokenData;
        this.accessToken = data.access_token;

        // Save updated token data
        await AsyncStorage.setItem(GOOGLE_TOKEN_DATA_KEY, JSON.stringify(this.tokenData));
        
        // Update legacy token storage for backward compatibility
        if (this.accessToken) {
          await AsyncStorage.setItem(GOOGLE_TOKEN_KEY, this.accessToken);
        } else {
          await AsyncStorage.removeItem(GOOGLE_TOKEN_KEY);
          logWarning('Access token cleared from legacy storage', '', 'StorageManager');
        } 

        // Reconfigure cloud storage with new token
        await this.configureCloudStorage();

        logInfo('Access token refreshed successfully', `New token expires: ${this.getTokenExpiryString()}`, 'StorageManager');
        return true;
      } else {
        throw new Error('No access token in refresh response');
      }
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      logError('Failed to refresh access token', error instanceof Error ? error.message : String(error), 'StorageManager');
      
      // Only clear token data if it's an authentication error
      if (error instanceof Error && (error.message.includes('400') || error.message.includes('401'))) {
        await this.clearTokenData();
        this.triggerAuthenticationRequired();
      }
      
      return false;
    } finally {
      this.isRefreshingToken = false;
    }
  }

  private async clearTokenData(): Promise<void> {
    this.accessToken = null;
    this.tokenData = null;
    this.hasTriggeredAuthCallback = false; // Reset flag when clearing tokens
    await AsyncStorage.removeItem(GOOGLE_TOKEN_KEY);
    await AsyncStorage.removeItem(GOOGLE_TOKEN_DATA_KEY);
    logInfo('Token data cleared', '', 'StorageManager');
  }

  private triggerAuthenticationRequired(): void {
    // Only trigger once per session to avoid multiple modals
    if (this.authenticationRequiredCallback && !this.hasTriggeredAuthCallback) {
      this.hasTriggeredAuthCallback = true;
      logInfo('Triggering authentication required callback', '', 'StorageManager');
      this.authenticationRequiredCallback();
    }
  }

  private async handleCloudStorageError(error: any): Promise<boolean> {
    if (error instanceof CloudStorageError) {
      switch (error.code) {
        case CloudStorageErrorCode.AUTHENTICATION_FAILED:
        case CloudStorageErrorCode.INVALID_SCOPE:
          logWarning('Authentication error detected', error.message, 'StorageManager');
          
          if (this.provider === CloudStorageProvider.GoogleDrive) {
            // First try to refresh the token
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
              logInfo('Token refreshed successfully after auth error', '', 'StorageManager');
              return true; // Indicate that the operation should be retried
            } else {
              logError('Token refresh failed after auth error', 'User needs to re-authenticate', 'StorageManager');
              return false;
            }
          }
          break;
          
        case CloudStorageErrorCode.FILE_NOT_FOUND:
          // This is expected for new accounts
          logInfo('File not found (expected for new accounts)', '', 'StorageManager');
          return false;
          
        default:
          logError('Cloud storage error', `Code: ${error.code}, Message: ${error.message}`, 'StorageManager');
          return false;
      }
    }
    
    logError('Unknown cloud storage error', error instanceof Error ? error.message : String(error), 'StorageManager');
    return false;
  }

  async setStorageMode(mode: StorageMode, shouldMigrateData: boolean = true): Promise<void> {
    const previousMode = this.storageMode;
    this.storageMode = mode;
    await AsyncStorage.setItem(STORAGE_MODE_KEY, mode);
    logInfo('Storage mode changed', `${previousMode} -> ${mode}, Migration: ${shouldMigrateData}`, 'StorageManager');

    // Handle data migration based on user preference
    if (previousMode !== mode) {
      if (shouldMigrateData) {
        try {
          if (previousMode === 'local' && mode === 'cloud') {
            // Copy local cards to cloud (will be done after provider selection)
            logInfo('Local to cloud migration will be handled after provider selection', '', 'StorageManager');
          } else if (previousMode === 'cloud' && mode === 'local') {
            // Copy cloud cards to local
            const cloudCards = await this.loadCloudCards();
            if (cloudCards.length > 0) {
              await this.saveLocalCards(cloudCards);
              logInfo('Cloud cards migrated to local storage', `${cloudCards.length} cards`, 'StorageManager');
            }
          }
        } catch (error) {
          logError('Failed to migrate data during storage mode change', error instanceof Error ? error.message : String(error), 'StorageManager');
          // Don't throw error - mode change should still succeed
        }
      } else {
        // Clear destination storage if not migrating
        if (mode === 'local') {
          await this.clearLocalCards();
          logInfo('Local cards cleared (no migration requested)', '', 'StorageManager');
        }
        // For cloud mode, clearing will happen naturally when switching providers
      }
    }
  }

  getStorageMode(): StorageMode {
    return this.storageMode;
  }

  getProvider(): CloudStorageProvider {
    return this.provider;
  }

  async setProvider(provider: CloudStorageProvider, shouldMigrateData: boolean = true): Promise<void> {
    const previousProvider = this.provider;
    this.provider = provider;
    await AsyncStorage.setItem(STORAGE_PROVIDER_KEY, provider);
    
    // Recreate CloudStorage instance with new provider
    this.cloudStorage = new CloudStorage(
      this.provider,
      this.provider === CloudStorageProvider.GoogleDrive ? { strictFilenames: true } : undefined
    );
    
    await this.configureCloudStorage();
    logInfo('Cloud provider set', `${previousProvider} -> ${provider}, Migration: ${shouldMigrateData}`, 'StorageManager');

    // Handle data migration between cloud providers or from local
    if (shouldMigrateData && this.storageMode === 'cloud') {
      try {
        let cardsToMigrate: LoyaltyCard[] = [];

        // Determine source of cards to migrate
        if (previousProvider !== provider) {
          // Migrating between cloud providers - get cards from previous provider
          const oldCloudStorage = new CloudStorage(
            previousProvider,
            previousProvider === CloudStorageProvider.GoogleDrive ? { strictFilenames: true } : undefined
          );
          
          // Configure old provider if needed
          if (previousProvider === CloudStorageProvider.GoogleDrive && this.accessToken) {
            oldCloudStorage.setProviderOptions({ 
              accessToken: this.accessToken,
              scope: CloudStorageScope.AppData 
            });
          } else if (previousProvider === CloudStorageProvider.ICloud) {
            oldCloudStorage.setProviderOptions({ scope: CloudStorageScope.AppData });
          }

          try {
            const exists = await oldCloudStorage.exists(CARDS_FILE);
            if (exists) {
              const content = await oldCloudStorage.readFile(CARDS_FILE);
              cardsToMigrate = JSON.parse(content) as LoyaltyCard[];
              logInfo('Cards loaded from previous cloud provider for migration', `${cardsToMigrate.length} cards`, 'StorageManager');
            }
          } catch (error) {
            logWarning('Failed to load cards from previous cloud provider', error instanceof Error ? error.message : String(error), 'StorageManager');
          }
        } else {
          // First time setting up cloud - get cards from local storage
          cardsToMigrate = await this.loadLocalCards();
          logInfo('Cards loaded from local storage for cloud migration', `${cardsToMigrate.length} cards`, 'StorageManager');
        }

        // Migrate cards to new provider
        if (cardsToMigrate.length > 0) {
          await this.saveCloudCards(cardsToMigrate);
          logInfo('Cards migrated to new cloud provider', `${cardsToMigrate.length} cards`, 'StorageManager');
        }
      } catch (error) {
        logError('Failed to migrate data during provider change', error instanceof Error ? error.message : String(error), 'StorageManager');
        // Don't throw error - provider change should still succeed
      }
    }
  }

  async setAccessToken(token: string, refreshToken?: string, expiresIn?: number): Promise<void> {
    this.accessToken = token;
    
    // Reset the auth callback trigger flag when new token is set
    this.hasTriggeredAuthCallback = false;
    
    // Create enhanced token data
    this.tokenData = {
      accessToken: token,
      refreshToken: refreshToken,
      expiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : undefined,
      tokenType: 'Bearer',
    };

    // Save both formats for compatibility
    await AsyncStorage.setItem(GOOGLE_TOKEN_KEY, token);
    await AsyncStorage.setItem(GOOGLE_TOKEN_DATA_KEY, JSON.stringify(this.tokenData));
    
    await this.configureCloudStorage();
    logInfo('Google Drive access token set', `Expires in: ${expiresIn}s, Has refresh: ${!!refreshToken}`, 'StorageManager');
  }

  async getAccessToken(): Promise<string | null> {
    // Check if token needs refresh
    if (this.isTokenExpired()) {
      logInfo('Token expired, attempting refresh', '', 'StorageManager');
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        return null;
      }
    }
    
    return this.accessToken;
  }

  getTokenData(): GoogleTokenData | null {
    return this.tokenData;
  }

  isAuthenticationValid(): boolean {
    if (this.provider === CloudStorageProvider.ICloud) {
      return true; // iCloud uses system authentication
    }
    
    if (this.provider === CloudStorageProvider.GoogleDrive) {
      // Valid if we have a token and either it's not expired or we have a refresh token
      return !!this.accessToken && (!this.isTokenExpired() || !!this.tokenData?.refreshToken);
    }
    
    return false;
  }

  private async cloudAccessible(): Promise<boolean> {
    try {
      // For Google Drive, we need an access token
      if (this.provider === CloudStorageProvider.GoogleDrive && !this.accessToken) {
        logWarning('Google Drive not accessible - no access token', '', 'StorageManager');
        return false;
      }

      // Check if token is expired and can't be refreshed
      if (this.provider === CloudStorageProvider.GoogleDrive && this.isTokenExpired() && !this.tokenData?.refreshToken) {
        logWarning('Google Drive not accessible - token expired and no refresh token', '', 'StorageManager');
        this.triggerAuthenticationRequired();
        return false;
      }

      // Test cloud accessibility by trying to check if our cards file exists
      try {
        const exists = await this.cloudStorage.exists(CARDS_FILE);
        logInfo('Cloud accessibility test successful', `File exists: ${exists}`, 'StorageManager');
        return true;
      } catch (testError) {
        // Handle authentication errors
        const shouldRetry = await this.handleCloudStorageError(testError);
        if (shouldRetry) {
          // Retry the operation after token refresh
          try {
            const exists = await this.cloudStorage.exists(CARDS_FILE);
            logInfo('Cloud accessibility test successful after retry', `File exists: ${exists}`, 'StorageManager');
            return true;
          } catch (retryError) {
            logError('Cloud accessibility test failed after retry', retryError instanceof Error ? retryError.message : String(retryError), 'StorageManager');
            return false;
          }
        }
        
        if (testError instanceof CloudStorageError && testError.code === CloudStorageErrorCode.FILE_NOT_FOUND) {
          logInfo('Cloud accessible - file not found is expected for new accounts', '', 'StorageManager');
          return true;
        }
        
        logError('Cloud accessibility test failed', testError instanceof Error ? testError.message : String(testError), 'StorageManager');
        return false;
      }
    } catch (error) {
      console.error('Failed to check cloud availability:', error);
      logError('Failed to check cloud availability', error instanceof Error ? error.message : String(error), 'StorageManager');
      return false;
    }
  }

  // Local storage operations
  async loadLocalCards(): Promise<LoyaltyCard[]> {
    try {
      const jsonValue = await AsyncStorage.getItem('loyalty_cards');
      const cards = jsonValue ? JSON.parse(jsonValue) : [];
      logInfo('Local cards loaded', `${cards.length} cards`, 'StorageManager');
      return cards;
    } catch (error) {
      console.error('Failed to load local cards:', error);
      logError('Failed to load local cards', error instanceof Error ? error.message : String(error), 'StorageManager');
      return [];
    }
  }

  async saveLocalCards(cards: LoyaltyCard[]): Promise<void> {
    try {
      await AsyncStorage.setItem('loyalty_cards', JSON.stringify(cards));
      logInfo('Local cards saved', `${cards.length} cards`, 'StorageManager');
    } catch (error) {
      console.error('Failed to save local cards:', error);
      logError('Failed to save local cards', error instanceof Error ? error.message : String(error), 'StorageManager');
    }
  }

  async clearLocalCards(): Promise<void> {
    try {
      await AsyncStorage.removeItem('loyalty_cards');
      logInfo('Local cards cleared', '', 'StorageManager');
    } catch (error) {
      console.error('Failed to clear local cards:', error);
      logError('Failed to clear local cards', error instanceof Error ? error.message : String(error), 'StorageManager');
    }
  }

  // Cloud storage operations with retry logic
  private async executeCloudOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const shouldRetry = await this.handleCloudStorageError(error);
      if (shouldRetry) {
        // Retry the operation once after token refresh
        logInfo('Retrying cloud operation after token refresh', '', 'StorageManager');
        return await operation();
      }
      throw error;
    }
  }

  async loadCloudCards(): Promise<LoyaltyCard[]> {
    return this.executeCloudOperation(async () => {
      if (!(await this.cloudAccessible())) {
        logWarning('Cloud not accessible for loading cards', '', 'StorageManager');
        return [];
      }

      const exists = await this.cloudStorage.exists(CARDS_FILE);
      if (!exists) {
        logInfo('Cloud cards file does not exist', '', 'StorageManager');
        return [];
      }

      const content = await this.cloudStorage.readFile(CARDS_FILE);
      const cards = JSON.parse(content) as LoyaltyCard[];
      logInfo('Cloud cards loaded', `${cards.length} cards`, 'StorageManager');
      return cards;
    });
  }

  async saveCloudCards(cards: LoyaltyCard[]): Promise<void> {
    return this.executeCloudOperation(async () => {
      if (!(await this.cloudAccessible())) {
        logError('Cloud not accessible for saving cards', 'Cloud unavailable', 'StorageManager');
        throw new Error('cloud_unavailable');
      }
      
      await this.cloudStorage.writeFile(CARDS_FILE, JSON.stringify(cards));
      logInfo('Cards saved to cloud', `${cards.length} cards`, 'StorageManager');
    });
  }

  async saveCloudCard(card: LoyaltyCard): Promise<LoyaltyCard> {
    return this.executeCloudOperation(async () => {
      const cards = await this.loadCloudCards();
      cards.push(card);
      await this.saveCloudCards(cards);
      logInfo('Card saved to cloud', `Card ID: ${card.id}`, 'StorageManager');
      return card;
    });
  }

  async updateCloudCard(card: LoyaltyCard): Promise<LoyaltyCard> {
    return this.executeCloudOperation(async () => {
      const cards = await this.loadCloudCards();
      const index = cards.findIndex(c => c.id === card.id);
      if (index !== -1) {
        cards[index] = card;
        await this.saveCloudCards(cards);
        logInfo('Card updated in cloud', `Card ID: ${card.id}`, 'StorageManager');
      } else {
        logWarning('Card not found for update in cloud', `Card ID: ${card.id}`, 'StorageManager');
      }
      return card;
    });
  }

  async toggleCloudCardFavorite(cardId: string, isFavorite: boolean): Promise<LoyaltyCard> {
    return this.executeCloudOperation(async () => {
      const cards = await this.loadCloudCards();
      const index = cards.findIndex(c => c.id === cardId);
      if (index !== -1) {
        cards[index].isFavorite = isFavorite;
        await this.saveCloudCards(cards);
        logInfo('Card favorite toggled in cloud', `Card ID: ${cardId}, Favorite: ${isFavorite}`, 'StorageManager');
        return cards[index];
      }
      logError('Card not found for favorite toggle', `Card ID: ${cardId}`, 'StorageManager');
      throw new Error('Card not found');
    });
  }

  async deleteCloudCard(cardId: string): Promise<void> {
    return this.executeCloudOperation(async () => {
      const cards = await this.loadCloudCards();
      const filtered = cards.filter(c => c.id !== cardId);
      await this.saveCloudCards(filtered);
      logInfo('Card deleted from cloud', `Card ID: ${cardId}`, 'StorageManager');
    });
  }

  // Queue operations for offline sync
  async queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp'>): Promise<void> {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    this.queuedOperations.push(queuedOp);
    await AsyncStorage.setItem(QUEUED_OPERATIONS_KEY, JSON.stringify(this.queuedOperations));
    logInfo('Operation queued', `Type: ${operation.type}, Queue size: ${this.queuedOperations.length}`, 'StorageManager');
  }

  async processQueuedOperations(): Promise<void> {
    if (this.queuedOperations.length === 0) return;
    if (!(await this.cloudAccessible())) {
      logWarning('Cannot process queued operations - cloud not accessible', '', 'StorageManager');
      return;
    }

    logInfo('Processing queued operations', `${this.queuedOperations.length} operations`, 'StorageManager');
    const processedOperations: string[] = [];

    for (const operation of this.queuedOperations) {
      try {
        logInfo('Processing queued operation', `Type: ${operation.type}, ID: ${operation.id}`, 'StorageManager');
        
        switch (operation.type) {
          case 'create':
            if (operation.card) {
              await this.saveCloudCard(operation.card);
            }
            break;
          case 'update':
            if (operation.card) {
              await this.updateCloudCard(operation.card);
            }
            break;
          case 'favorite':
            if (operation.cardId && operation.isFavorite !== undefined) {
              await this.toggleCloudCardFavorite(operation.cardId, operation.isFavorite);
            }
            break;
          case 'delete':
            if (operation.cardId) {
              await this.deleteCloudCard(operation.cardId);
            }
            break;
        }
        processedOperations.push(operation.id);
        logInfo('Queued operation processed successfully', `ID: ${operation.id}`, 'StorageManager');
      } catch (error) {
        console.error(`Failed to process queued operation ${operation.id}:`, error);
        logError(`Failed to process queued operation ${operation.id}`, error instanceof Error ? error.message : String(error), 'StorageManager');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Remove successfully processed operations
    this.queuedOperations = this.queuedOperations.filter(
      op => !processedOperations.includes(op.id)
    );
    await AsyncStorage.setItem(QUEUED_OPERATIONS_KEY, JSON.stringify(this.queuedOperations));
    logInfo('Queued operations cleanup completed', `Processed: ${processedOperations.length}, Remaining: ${this.queuedOperations.length}`, 'StorageManager');
  }

  // Unified card operations - now optimized for local-first loading
  async loadCards(): Promise<LoyaltyCard[]> {
    logInfo('Loading cards', `Mode: ${this.storageMode}`, 'StorageManager');
    
    // Always load from local storage first for instant UI
    const localCards = await this.loadLocalCards();
    
    // If local mode, just return local cards
    if (this.storageMode === 'local') {
      return localCards;
    }

    // For cloud mode, return local cards immediately
    // Cloud sync will happen in background via loadCardsWithLocalFirst
    return localCards;
  }

  // Method to manually sync local cards to cloud (called explicitly when needed)
  async syncLocalToCloud(): Promise<void> {
    if (this.storageMode !== 'cloud') return;
    
    try {
      const localCards = await this.loadLocalCards();
      if (localCards.length > 0) {
        await this.saveCloudCards(localCards);
        logInfo('Local cards synced to cloud', `${localCards.length} cards`, 'StorageManager');
      }
    } catch (error) {
      logError('Failed to sync local cards to cloud', error instanceof Error ? error.message : String(error), 'StorageManager');
      throw error;
    }
  }

  async saveCard(card: LoyaltyCard, isOnline: boolean = true): Promise<LoyaltyCard> {
    logInfo('Saving card', `ID: ${card.id}, Mode: ${this.storageMode}, Online: ${isOnline}`, 'StorageManager');
    
    // Always save locally first
    const localCards = await this.loadLocalCards();
    localCards.push(card);
    await this.saveLocalCards(localCards);

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline && this.isAuthenticationValid()) {
        try {
          await this.saveCloudCard(card);
          logInfo('Card saved to cloud successfully', `ID: ${card.id}`, 'StorageManager');
          return card;
        } catch (error) {
          console.error('Failed to save to cloud, queuing operation:', error);
          logError('Failed to save to cloud', error instanceof Error ? error.message : String(error), 'StorageManager');
          await this.queueOperation({ type: 'create', card });
        }
      } else {
        // Queue for later sync when online or authenticated
        await this.queueOperation({ type: 'create', card });
        logInfo('Card save queued for later sync', `ID: ${card.id}`, 'StorageManager');
      }
    }

    return card;
  }

  async updateCard(card: LoyaltyCard, isOnline: boolean = true): Promise<LoyaltyCard> {
    logInfo('Updating card', `ID: ${card.id}, Mode: ${this.storageMode}, Online: ${isOnline}`, 'StorageManager');
    
    // Always update locally first
    const localCards = await this.loadLocalCards();
    const index = localCards.findIndex(c => c.id === card.id);
    if (index !== -1) {
      localCards[index] = card;
      await this.saveLocalCards(localCards);
    }

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline && this.isAuthenticationValid()) {
        try {
          await this.updateCloudCard(card);
          logInfo('Card updated in cloud successfully', `ID: ${card.id}`, 'StorageManager');
          return card;
        } catch (error) {
          console.error('Failed to update cloud card, queuing operation:', error);
          logError('Failed to update cloud card', error instanceof Error ? error.message : String(error), 'StorageManager');
          await this.queueOperation({ type: 'update', card });
        }
      } else {
        // Queue for later sync when online or authenticated
        await this.queueOperation({ type: 'update', card });
        logInfo('Card update queued for later sync', `ID: ${card.id}`, 'StorageManager');
      }
    }

    return card;
  }

  async toggleFavorite(cardId: string, isFavorite: boolean, isOnline: boolean = true): Promise<LoyaltyCard | null> {
    logInfo('Toggling favorite', `ID: ${cardId}, Favorite: ${isFavorite}, Mode: ${this.storageMode}, Online: ${isOnline}`, 'StorageManager');
    
    // Always update locally first
    const localCards = await this.loadLocalCards();
    const index = localCards.findIndex(c => c.id === cardId);
    if (index === -1) {
      logWarning('Card not found for favorite toggle', `ID: ${cardId}`, 'StorageManager');
      return null;
    }

    localCards[index].isFavorite = isFavorite;
    await this.saveLocalCards(localCards);

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline && this.isAuthenticationValid()) {
        try {
          await this.toggleCloudCardFavorite(cardId, isFavorite);
          logInfo('Card favorite toggled in cloud successfully', `ID: ${cardId}`, 'StorageManager');
          return localCards[index];
        } catch (error) {
          console.error('Failed to toggle favorite in cloud, queuing operation:', error);
          logError('Failed to toggle favorite in cloud', error instanceof Error ? error.message : String(error), 'StorageManager');
          await this.queueOperation({ type: 'favorite', cardId, isFavorite });
        }
      } else {
        // Queue for later sync when online or authenticated
        await this.queueOperation({ type: 'favorite', cardId, isFavorite });
        logInfo('Favorite toggle queued for later sync', `ID: ${cardId}`, 'StorageManager');
      }
    }

    return localCards[index];
  }

  async deleteCard(cardId: string, isOnline: boolean = true): Promise<void> {
    logInfo('Deleting card', `ID: ${cardId}, Mode: ${this.storageMode}, Online: ${isOnline}`, 'StorageManager');
    
    // Always delete locally first
    const localCards = await this.loadLocalCards();
    const filteredCards = localCards.filter(c => c.id !== cardId);
    await this.saveLocalCards(filteredCards);

    // If cloud mode, try to sync to cloud
    if (this.storageMode === 'cloud') {
      if (isOnline && this.isAuthenticationValid()) {
        try {
          await this.deleteCloudCard(cardId);
          logInfo('Card deleted from cloud successfully', `ID: ${cardId}`, 'StorageManager');
        } catch (error) {
          console.error('Failed to delete cloud card, queuing operation:', error);
          logError('Failed to delete cloud card', error instanceof Error ? error.message : String(error), 'StorageManager');
          await this.queueOperation({ type: 'delete', cardId });
        }
      } else {
        // Queue for later sync when online or authenticated
        await this.queueOperation({ type: 'delete', cardId });
        logInfo('Card deletion queued for later sync', `ID: ${cardId}`, 'StorageManager');
      }
    }
  }

  // Sync conflict resolution
  async checkForSyncConflicts(): Promise<SyncConflictData | null> {
    if (this.storageMode === 'local') return null;
    
    try {
      logInfo('Checking for sync conflicts', '', 'StorageManager');
      const localCards = await this.loadLocalCards();
      const cloudCards = await this.loadCloudCards();

      if (localCards.length === 0 && cloudCards.length === 0) {
        logInfo('No sync conflicts - both storages empty', '', 'StorageManager');
        return null;
      }

      // Check if there are meaningful differences
      const hasConflicts = localCards.length !== cloudCards.length ||
        !this.arraysEqual(localCards, cloudCards);

      if (!hasConflicts) {
        logInfo('No sync conflicts detected', '', 'StorageManager');
        return null;
      }

      logInfo('Sync conflicts detected', `Local: ${localCards.length}, Cloud: ${cloudCards.length}`, 'StorageManager');
      return {
        localCards,
        cloudCards,
        localCount: localCards.length,
        cloudCount: cloudCards.length,
      };
    } catch (error) {
      console.error('Failed to check sync conflicts:', error);
      logError('Failed to check sync conflicts', error instanceof Error ? error.message : String(error), 'StorageManager');
      return null;
    }
  }

  private arraysEqual(a: LoyaltyCard[], b: LoyaltyCard[]): boolean {
    if (a.length !== b.length) return false;
    
    const aIds = new Set(a.map(card => card.id));
    const bIds = new Set(b.map(card => card.id));
    
    return aIds.size === bIds.size && [...aIds].every(id => bIds.has(id));
  }

  async resolveSyncConflict(action: SyncAction, conflictData: SyncConflictData): Promise<void> {
    logInfo('Resolving sync conflict', `Action: ${action}`, 'StorageManager');
    
    try {
      switch (action) {
        case 'replace_with_cloud':
          // Replace local data with cloud data
          await this.saveLocalCards(conflictData.cloudCards);
          logInfo('Sync conflict resolved - replaced local with cloud data', `${conflictData.cloudCards.length} cards`, 'StorageManager');
          break;
        
        case 'merge':
          // Merge local and cloud data
          const mergedCards = this.mergeCards(conflictData.localCards, conflictData.cloudCards);
          
          // Save merged data locally
          await this.saveLocalCards(mergedCards);
          
          // Upload merged data to cloud
          await this.saveCloudCards(mergedCards);
          
          logInfo('Sync conflict resolved - data merged', `${mergedCards.length} total cards`, 'StorageManager');
          break;
        
        case 'keep_local':
          // Upload local data to cloud (overwrite cloud)
          await this.saveCloudCards(conflictData.localCards);
          logInfo('Sync conflict resolved - uploaded local data to cloud', `${conflictData.localCards.length} cards`, 'StorageManager');
          break;
        
        default:
          throw new Error(`Unknown sync action: ${action}`);
      }

      // Update last sync timestamp
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      
      // Clear any queued operations since we just did a full sync
      await this.clearQueue();
      
      logInfo('Sync conflict resolution completed successfully', `Action: ${action}`, 'StorageManager');
    } catch (error) {
      console.error('Failed to resolve sync conflict:', error);
      logError('Failed to resolve sync conflict', error instanceof Error ? error.message : String(error), 'StorageManager');
      throw error;
    }
  }

  private mergeCards(localCards: LoyaltyCard[], cloudCards: LoyaltyCard[]): LoyaltyCard[] {
    logInfo('Merging cards', `Local: ${localCards.length}, Cloud: ${cloudCards.length}`, 'StorageManager');
    
    // Create a map to track cards by their unique identifiers
    const cardMap = new Map<string, LoyaltyCard>();
    
    // First, add all cloud cards (they take precedence for existing cards)
    for (const cloudCard of cloudCards) {
      cardMap.set(cloudCard.id, cloudCard);
    }
    
    // Then, add local cards that don't exist in cloud
    for (const localCard of localCards) {
      if (!cardMap.has(localCard.id)) {
        // Check if there's a card with the same code (potential duplicate)
        const existingCardWithSameCode = Array.from(cardMap.values()).find(
          card => card.code === localCard.code && card.name === localCard.name
        );
        
        if (!existingCardWithSameCode) {
          cardMap.set(localCard.id, localCard);
        } else {
          logInfo('Skipping duplicate card during merge', `Local ID: ${localCard.id}, Existing ID: ${existingCardWithSameCode.id}`, 'StorageManager');
        }
      }
    }
    
    const mergedCards = Array.from(cardMap.values());
    logInfo('Cards merged successfully', `Result: ${mergedCards.length} cards`, 'StorageManager');
    
    return mergedCards;
  }

  getQueuedOperationsCount(): number {
    return this.queuedOperations.length;
  }

  async clearQueue(): Promise<void> {
    this.queuedOperations = [];
    await AsyncStorage.removeItem(QUEUED_OPERATIONS_KEY);
    logInfo('Queued operations cleared', '', 'StorageManager');
  }
}

export const storageManager = StorageManager.getInstance();