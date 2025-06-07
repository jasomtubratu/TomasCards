import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowUpDown, Plus, WifiOff, Settings } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { LoyaltyCard } from '@/utils/types';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuth } from '@/hooks/useAuth';
import { storageManager, SyncConflictData } from '@/utils/storageManager';
import LoyaltyCardComponent from '@/components/LoyaltyCard';
import Header from '@/components/Header';
import EmptyState from '@/components/EmptyState';
import OfflineBanner from '@/components/OfflineBanner';
import SyncStatusIndicator, { SyncStatus } from '@/components/SyncStatusIndicator';
import SyncConflictModal from '@/components/SyncConflictModal';
import StorageModeSelector from '@/components/StorageModeSelector';

type SortType = 'name' | 'date' | 'lastUsed';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useAuth();
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortType, setSortType] = useState<SortType>('name');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncConflictData, setSyncConflictData] = useState<SyncConflictData | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showStorageSelector, setShowStorageSelector] = useState(false);
  const [storageMode, setStorageMode] = useState<'local' | 'cloud'>('local');
  const [conflictResolving, setConflictResolving] = useState(false);

  // Initialize storage manager
  useEffect(() => {
    const initializeStorage = async () => {
      await storageManager.initialize();
      setStorageMode(storageManager.getStorageMode());
      
      // Check for sync conflicts when user logs in and is using cloud storage
      if (isAuthenticated && isOnline && storageManager.getStorageMode() === 'cloud') {
        const conflicts = await storageManager.checkForSyncConflicts();
        if (conflicts) {
          setSyncConflictData(conflicts);
          setShowConflictModal(true);
        }
      }
    };
    
    initializeStorage();
  }, [isAuthenticated, isOnline]);

  // Update sync status based on network and auth state
  useEffect(() => {
    if (storageMode === 'local') {
      setSyncStatus('synced');
    } else if (!isAuthenticated) {
      setSyncStatus('offline');
    } else if (!isOnline) {
      setSyncStatus('offline');
    } else {
      setSyncStatus('synced');
    }
    
    setPendingOperations(storageManager.getQueuedOperationsCount());
  }, [isOnline, isAuthenticated, storageMode]);

  const loadCardData = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      const data = await storageManager.loadCards();
      setCards(data);
      
      // Process queued operations if online and using cloud storage
      if (isOnline && isAuthenticated && storageMode === 'cloud') {
        await storageManager.processQueuedOperations();
        setPendingOperations(storageManager.getQueuedOperationsCount());
      }
      
      setSyncStatus(storageMode === 'cloud' && isOnline && isAuthenticated ? 'synced' : 'offline');
    } catch (e) {
      console.error('Error loading cards', e);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  }, [isOnline, isAuthenticated, storageMode]);

  useEffect(() => {
    loadCardData();
  }, [loadCardData]);

  useFocusEffect(
    useCallback(() => {
      loadCardData();
    }, [loadCardData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCardData();
    setRefreshing(false);
  };

  const handleAddCard = () => {
    // Cloud storage works offline now, no need to block
    router.push('/add');
  };

  const handleStorageModeChange = async (mode: 'local' | 'cloud') => {
    if (mode === 'cloud' && !isAuthenticated) {
      Alert.alert(
        t('storage.cloud.loginRequired'),
        t('storage.cloud.loginRequiredMessage'),
        [
          { text: t('common.buttons.cancel') },
          { text: t('auth.login.signIn'), onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }

    await storageManager.setStorageMode(mode);
    setStorageMode(mode);
    setShowStorageSelector(false);
    
    // Reload cards with new storage mode
    await loadCardData();
  };

  const handleSyncConflictResolve = async (action: 'replace_with_cloud' | 'merge' | 'keep_local') => {
    if (!syncConflictData) return;
    
    setConflictResolving(true);
    try {
      await storageManager.resolveSyncConflict(action, syncConflictData);
      setShowConflictModal(false);
      setSyncConflictData(null);
      await loadCardData();
    } catch (error) {
      console.error('Failed to resolve sync conflict:', error);
      Alert.alert(
        t('sync.conflict.error'),
        t('sync.conflict.errorMessage')
      );
    } finally {
      setConflictResolving(false);
    }
  };

  const sortCards = (cards: LoyaltyCard[]) => {
    switch (sortType) {
      case 'name':
        return [...cards].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'date':
        return [...cards].sort((a, b) => b.dateAdded - a.dateAdded);
      case 'lastUsed':
        return [...cards].sort((a, b) => {
          if (!a.lastUsed) return 1;
          if (!b.lastUsed) return -1;
          return b.lastUsed - a.lastUsed;
        });
      default:
        return cards;
    }
  };

  const sortedCards = sortCards(cards);
  const favoriteCards = sortedCards.filter(card => card.isFavorite);
  const otherCards = sortedCards.filter(card => !card.isFavorite);

  const SortMenu = () => (
    <View style={[
      styles.sortMenu,
      !showSortMenu && styles.hidden,
      { backgroundColor: colors.backgroundMedium }
    ]}>
      <TouchableOpacity 
        style={[
          styles.sortOption,
          sortType === 'name' && { backgroundColor: colors.backgroundLight }
        ]} 
        onPress={() => {
          setSortType('name');
          setShowSortMenu(false);
        }}>
        <Text style={[
          styles.sortOptionText,
          { color: sortType === 'name' ? colors.accent : colors.textPrimary }
        ]}>{t('cards.sort.name')}</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.sortOption,
          sortType === 'date' && { backgroundColor: colors.backgroundLight }
        ]}
        onPress={() => {
          setSortType('date');
          setShowSortMenu(false);
        }}>
        <Text style={[
          styles.sortOptionText,
          { color: sortType === 'date' ? colors.accent : colors.textPrimary }
        ]}>{t('cards.sort.date')}</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.sortOption,
          sortType === 'lastUsed' && { backgroundColor: colors.backgroundLight }
        ]}
        onPress={() => {
          setSortType('lastUsed');
          setShowSortMenu(false);
        }}>
        <Text style={[
          styles.sortOptionText,
          { color: sortType === 'lastUsed' ? colors.accent : colors.textPrimary }
        ]}>{t('cards.sort.lastUsed')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSection = (title: string, data: LoyaltyCard[]) => {
    if (data.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <LoyaltyCardComponent
              card={item}
              onPress={() => router.push(`/card/${item.id}`)}
            />
          )}
          scrollEnabled={false}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.backgroundDark }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      {!isOnline && storageMode === 'cloud' && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.warning }]}>
          <WifiOff size={16} color={colors.textPrimary} />
          <Text style={[styles.offlineText, { color: colors.textPrimary }]}>
            {t('storage.offline.banner')}
          </Text>
        </View>
      )}
      
      <Header 
        title={t('cards.title')}
        showBack={false}
        rightElement={
          <View style={styles.headerButtons}>
            <SyncStatusIndicator
              status={syncStatus}
              pendingCount={pendingOperations}
              onRetry={loadCardData}
              compact
            />
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.backgroundMedium }]}
              onPress={() => setShowStorageSelector(true)}
            >
              <Settings size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.backgroundMedium }]}
              onPress={() => setShowSortMenu(!showSortMenu)}
            >
              <ArrowUpDown size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: colors.backgroundMedium }]}
              onPress={handleAddCard}
            >
              <Plus size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        }
      />
      
      <SortMenu />
      
      {cards.length === 0 ? (
        <EmptyState message={t('cards.empty')} />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {renderSection(t('cards.sections.favorites'), favoriteCards)}
              {renderSection(
                favoriteCards.length > 0 
                  ? t('cards.sections.other')
                  : t('cards.sections.all'),
                otherCards
              )}
            </>
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}

      <SyncConflictModal
        visible={showConflictModal}
        conflictData={syncConflictData}
        onResolve={handleSyncConflictResolve}
        loading={conflictResolving}
      />

      <StorageModeSelector
        visible={showStorageSelector}
        currentMode={storageMode}
        onSelect={handleStorageModeChange}
        onClose={() => setShowStorageSelector(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  sortMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    borderRadius: 12,
    padding: 4,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 200,
  },
  hidden: {
    display: 'none',
  },
  sortOption: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  sortOptionText: {
    fontSize: 16,
  },
});