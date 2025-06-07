import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoyaltyCard } from './types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
  type: 'create' | 'update' | 'delete';
  card?: LoyaltyCard;
  cardId?: string;
  timestamp: number;
}

const STORAGE_MODE_KEY = 'storage_mode';
const QUEUED_OPERATIONS_KEY = 'queued_operations';
const LAST_SYNC_KEY = 'last_sync_timestamp';

export class StorageManager {
  private static instance: StorageManager;
  private storageMode: StorageMode = 'local';
  private queuedOperations: QueuedOperation[] = [];

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      const mode = await AsyncStorage.getItem(STORAGE_MODE_KEY);
      this.storageMode = (mode as StorageMode) || 'local';
      
      const queuedOps = await AsyncStorage.getItem(QUEUED_OPERATIONS_KEY);
      this.queuedOperations = queuedOps ? JSON.parse(queuedOps) : [];
    } catch (error) {
      console.error('Failed to initialize storage manager:', error);
    }
  }

  async setStorageMode(mode: StorageMode): Promise<void> {
    this.storageMode = mode;
    await AsyncStorage.setItem(STORAGE_MODE_KEY, mode);
  }

  getStorageMode(): StorageMode {
    return this.storageMode;
  }

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('authToken');
  }

  async isOnline(): Promise<boolean> {
    // This would be injected from the network status hook
    return true; // Placeholder - will be handled by the calling component
  }

  // Local storage operations
  async loadLocalCards(): Promise<LoyaltyCard[]> {
    try {
      const jsonValue = await AsyncStorage.getItem('loyalty_cards');
      return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Failed to load local cards:', error);
      return [];
    }
  }

  async saveLocalCards(cards: LoyaltyCard[]): Promise<void> {
    try {
      await AsyncStorage.setItem('loyalty_cards', JSON.stringify(cards));
    } catch (error) {
      console.error('Failed to save local cards:', error);
    }
  }

  // Cloud storage operations
  async loadCloudCards(): Promise<LoyaltyCard[]> {
    const token = await this.getAuthToken();
    if (!token) throw new Error('No auth token available');

    const response = await fetch(`${API_URL}/cards`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load cloud cards: ${response.statusText}`);
    }

    const cloudCards = await response.json();
    return this.transformCloudCards(cloudCards);
  }

  async saveCloudCard(card: LoyaltyCard): Promise<LoyaltyCard> {
    const token = await this.getAuthToken();
    if (!token) throw new Error('No auth token available');

    const response = await fetch(`${API_URL}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: card.name,
        brand: card.brand,
        code: card.code,
        codeType: card.codeType,
        color: card.color,
        notes: card.notes,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save cloud card: ${response.statusText}`);
    }

    const savedCard = await response.json();
    return this.transformCloudCard(savedCard);
  }

  async updateCloudCard(card: LoyaltyCard): Promise<LoyaltyCard> {
    const token = await this.getAuthToken();
    if (!token) throw new Error('No auth token available');

    const response = await fetch(`${API_URL}/cards/${card.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: card.name,
        brand: card.brand,
        code: card.code,
        codeType: card.codeType,
        color: card.color,
        notes: card.notes,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update cloud card: ${response.statusText}`);
    }

    const updatedCard = await response.json();
    return this.transformCloudCard(updatedCard);
  }

  async deleteCloudCard(cardId: string): Promise<void> {
    const token = await this.getAuthToken();
    if (!token) throw new Error('No auth token available');

    const response = await fetch(`${API_URL}/cards/${cardId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete cloud card: ${response.statusText}`);
    }
  }

  // Transform cloud card format to local format
  private transformCloudCard(cloudCard: any): LoyaltyCard {
    return {
      id: cloudCard._id || cloudCard.id,
      name: cloudCard.name,
      brand: cloudCard.brand,
      code: cloudCard.code || cloudCard.barcode,
      codeType: cloudCard.codeType || 'barcode',
      color: cloudCard.color,
      dateAdded: new Date(cloudCard.createdAt).getTime(),
      lastUsed: cloudCard.lastUsed ? new Date(cloudCard.lastUsed).getTime() : undefined,
      notes: cloudCard.notes,
      isFavorite: false, // Cloud doesn't store favorites yet
    };
  }

  private transformCloudCards(cloudCards: any[]): LoyaltyCard[] {
    return cloudCards.map(card => this.transformCloudCard(card));
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
  }

  async processQueuedOperations(): Promise<void> {
    if (this.queuedOperations.length === 0) return;

    const token = await this.getAuthToken();
    if (!token) return;

    const processedOperations: string[] = [];

    for (const operation of this.queuedOperations) {
      try {
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
          case 'delete':
            if (operation.cardId) {
              await this.deleteCloudCard(operation.cardId);
            }
            break;
        }
        processedOperations.push(operation.id);
      } catch (error) {
        console.error(`Failed to process queued operation ${operation.id}:`, error);
        // Keep failed operations in queue for retry
      }
    }

    // Remove successfully processed operations
    this.queuedOperations = this.queuedOperations.filter(
      op => !processedOperations.includes(op.id)
    );
    await AsyncStorage.setItem(QUEUED_OPERATIONS_KEY, JSON.stringify(this.queuedOperations));
  }

  // Unified card operations
  async loadCards(): Promise<LoyaltyCard[]> {
    if (this.storageMode === 'local') {
      return await this.loadLocalCards();
    } else {
      try {
        const cloudCards = await this.loadCloudCards();
        // Cache cloud cards locally for offline access
        await this.saveLocalCards(cloudCards);
        return cloudCards;
      } catch (error) {
        console.error('Failed to load cloud cards, falling back to local:', error);
        return await this.loadLocalCards();
      }
    }
  }

  async saveCard(card: LoyaltyCard, isOnline: boolean = true): Promise<LoyaltyCard> {
    if (this.storageMode === 'local') {
      const localCards = await this.loadLocalCards();
      localCards.push(card);
      await this.saveLocalCards(localCards);
      return card;
    } else {
      if (isOnline) {
        try {
          const savedCard = await this.saveCloudCard(card);
          // Update local cache
          const localCards = await this.loadLocalCards();
          localCards.push(savedCard);
          await this.saveLocalCards(localCards);
          return savedCard;
        } catch (error) {
          console.error('Failed to save to cloud, queuing operation:', error);
          await this.queueOperation({ type: 'create', card });
          // Save locally as fallback
          const localCards = await this.loadLocalCards();
          localCards.push(card);
          await this.saveLocalCards(localCards);
          return card;
        }
      } else {
        await this.queueOperation({ type: 'create', card });
        const localCards = await this.loadLocalCards();
        localCards.push(card);
        await this.saveLocalCards(localCards);
        return card;
      }
    }
  }

  async updateCard(card: LoyaltyCard, isOnline: boolean = true): Promise<LoyaltyCard> {
    if (this.storageMode === 'local') {
      const localCards = await this.loadLocalCards();
      const index = localCards.findIndex(c => c.id === card.id);
      if (index !== -1) {
        localCards[index] = card;
        await this.saveLocalCards(localCards);
      }
      return card;
    } else {
      if (isOnline) {
        try {
          const updatedCard = await this.updateCloudCard(card);
          // Update local cache
          const localCards = await this.loadLocalCards();
          const index = localCards.findIndex(c => c.id === card.id);
          if (index !== -1) {
            localCards[index] = updatedCard;
            await this.saveLocalCards(localCards);
          }
          return updatedCard;
        } catch (error) {
          console.error('Failed to update cloud card, queuing operation:', error);
          await this.queueOperation({ type: 'update', card });
          // Update locally as fallback
          const localCards = await this.loadLocalCards();
          const index = localCards.findIndex(c => c.id === card.id);
          if (index !== -1) {
            localCards[index] = card;
            await this.saveLocalCards(localCards);
          }
          return card;
        }
      } else {
        await this.queueOperation({ type: 'update', card });
        const localCards = await this.loadLocalCards();
        const index = localCards.findIndex(c => c.id === card.id);
        if (index !== -1) {
          localCards[index] = card;
          await this.saveLocalCards(localCards);
        }
        return card;
      }
    }
  }

  async deleteCard(cardId: string, isOnline: boolean = true): Promise<void> {
    if (this.storageMode === 'local') {
      const localCards = await this.loadLocalCards();
      const filteredCards = localCards.filter(c => c.id !== cardId);
      await this.saveLocalCards(filteredCards);
    } else {
      if (isOnline) {
        try {
          await this.deleteCloudCard(cardId);
          // Update local cache
          const localCards = await this.loadLocalCards();
          const filteredCards = localCards.filter(c => c.id !== cardId);
          await this.saveLocalCards(filteredCards);
        } catch (error) {
          console.error('Failed to delete cloud card, queuing operation:', error);
          await this.queueOperation({ type: 'delete', cardId });
          // Delete locally as fallback
          const localCards = await this.loadLocalCards();
          const filteredCards = localCards.filter(c => c.id !== cardId);
          await this.saveLocalCards(filteredCards);
        }
      } else {
        await this.queueOperation({ type: 'delete', cardId });
        const localCards = await this.loadLocalCards();
        const filteredCards = localCards.filter(c => c.id !== cardId);
        await this.saveLocalCards(filteredCards);
      }
    }
  }

  // Sync conflict resolution
  async checkForSyncConflicts(): Promise<SyncConflictData | null> {
    try {
      const localCards = await this.loadLocalCards();
      const cloudCards = await this.loadCloudCards();

      if (localCards.length === 0) {
        return null; // No conflict if no local data
      }

      return {
        localCards,
        cloudCards,
        localCount: localCards.length,
        cloudCount: cloudCards.length,
      };
    } catch (error) {
      console.error('Failed to check sync conflicts:', error);
      return null;
    }
  }

  async resolveSyncConflict(action: SyncAction, conflictData: SyncConflictData): Promise<void> {
    switch (action) {
      case 'replace_with_cloud':
        await this.saveLocalCards(conflictData.cloudCards);
        break;
      
      case 'merge':
        const mergedCards = this.mergeCards(conflictData.localCards, conflictData.cloudCards);
        await this.saveLocalCards(mergedCards);
        // Upload merged cards to cloud
        for (const card of conflictData.localCards) {
          const existsInCloud = conflictData.cloudCards.some(c => c.code === card.code);
          if (!existsInCloud) {
            try {
              await this.saveCloudCard(card);
            } catch (error) {
              console.error('Failed to upload merged card to cloud:', error);
            }
          }
        }
        break;
      
      case 'keep_local':
        // Upload all local cards to cloud
        for (const card of conflictData.localCards) {
          try {
            await this.saveCloudCard(card);
          } catch (error) {
            console.error('Failed to upload local card to cloud:', error);
          }
        }
        break;
    }

    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  }

  private mergeCards(localCards: LoyaltyCard[], cloudCards: LoyaltyCard[]): LoyaltyCard[] {
    const merged = [...cloudCards];
    
    for (const localCard of localCards) {
      const existsInCloud = cloudCards.some(cloudCard => 
        cloudCard.code === localCard.code || cloudCard.id === localCard.id
      );
      
      if (!existsInCloud) {
        merged.push(localCard);
      }
    }
    
    return merged;
  }

  getQueuedOperationsCount(): number {
    return this.queuedOperations.length;
  }

  async clearQueue(): Promise<void> {
    this.queuedOperations = [];
    await AsyncStorage.removeItem(QUEUED_OPERATIONS_KEY);
  }
}

export const storageManager = StorageManager.getInstance();