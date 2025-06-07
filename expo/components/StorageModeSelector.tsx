import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Cloud, Smartphone, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { StorageMode } from '@/utils/storageManager';

interface StorageModeSelectorProps {
  visible: boolean;
  currentMode: StorageMode;
  onSelect: (mode: StorageMode) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

export default function StorageModeSelector({
  visible,
  currentMode,
  onSelect,
  onClose,
  loading = false,
}: StorageModeSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [selectedMode, setSelectedMode] = useState<StorageMode>(currentMode);

  const handleSelect = async (mode: StorageMode) => {
    setSelectedMode(mode);
    await onSelect(mode);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.backgroundDark }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('storage.mode.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('storage.mode.subtitle')}
          </Text>

          <View style={styles.options}>
            <TouchableOpacity
              style={[
                styles.option,
                { backgroundColor: colors.backgroundMedium },
                selectedMode === 'local' && { borderColor: colors.accent, borderWidth: 2 },
              ]}
              onPress={() => handleSelect('local')}
              disabled={loading}
            >
              <View style={styles.optionHeader}>
                <Smartphone size={24} color={colors.textPrimary} />
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  {t('storage.mode.local.title')}
                </Text>
                {selectedMode === 'local' && (
                  <Check size={20} color={colors.accent} />
                )}
              </View>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {t('storage.mode.local.description')}
              </Text>
              <View style={styles.features}>
                <Text style={[styles.feature, { color: colors.success }]}>
                  ✓ {t('storage.mode.local.feature1')}
                </Text>
                <Text style={[styles.feature, { color: colors.success }]}>
                  ✓ {t('storage.mode.local.feature2')}
                </Text>
                <Text style={[styles.feature, { color: colors.warning }]}>
                  ⚠ {t('storage.mode.local.limitation')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                { backgroundColor: colors.backgroundMedium },
                selectedMode === 'cloud' && { borderColor: colors.accent, borderWidth: 2 },
              ]}
              onPress={() => handleSelect('cloud')}
              disabled={loading}
            >
              <View style={styles.optionHeader}>
                <Cloud size={24} color={colors.textPrimary} />
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  {t('storage.mode.cloud.title')}
                </Text>
                {selectedMode === 'cloud' && (
                  <Check size={20} color={colors.accent} />
                )}
              </View>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {t('storage.mode.cloud.description')}
              </Text>
              <View style={styles.features}>
                <Text style={[styles.feature, { color: colors.success }]}>
                  ✓ {t('storage.mode.cloud.feature1')}
                </Text>
                <Text style={[styles.feature, { color: colors.success }]}>
                  ✓ {t('storage.mode.cloud.feature2')}
                </Text>
                <Text style={[styles.feature, { color: colors.warning }]}>
                  ⚠ {t('storage.mode.cloud.limitation')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.backgroundMedium }]}
            onPress={onClose}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>
                {t('common.buttons.close')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  options: {
    gap: 16,
    marginBottom: 24,
  },
  option: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  features: {
    gap: 4,
  },
  feature: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});