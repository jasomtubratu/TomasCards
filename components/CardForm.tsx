import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Camera, Circle as XCircle, Save, ChartBar as BarChart4, QrCode } from 'lucide-react-native';
import { LoyaltyCard } from '@/utils/types';
import { COLORS } from '@/constants/Colors';
import { successHaptic, lightHaptic } from '@/utils/feedback';

interface CardFormProps {
  existingCard?: LoyaltyCard;
  onSave: (card: LoyaltyCard) => Promise<void>;
  onScanPress?: () => void;
  onCancel?: () => void;
}

// Card color options
const colorOptions = [
  '#4F6BFF', // accent blue
  '#4CAF93', // success green
  '#F2BD6E', // warning yellow
  '#F46E6E', // error red
  '#9D66FF', // purple
  '#FF66A0', // pink
  '#66B3FF', // light blue
  '#66FFB3', // mint
];

const CardForm: React.FC<CardFormProps> = ({ 
  existingCard, 
  onSave,
  onScanPress,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(existingCard?.name || '');
  const [code, setCode] = useState(existingCard?.code || '');
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>(
    existingCard?.codeType || 'barcode'
  );
  const [color, setColor] = useState(existingCard?.color || colorOptions[0]);
  const [notes, setNotes] = useState(existingCard?.notes || '');

  // Handle form submission
  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      return;
    }

    setLoading(true);
    
    try {
      const cardData: LoyaltyCard = {
        id: existingCard?.id || Date.now().toString(),
        name: name.trim(),
        code: code.trim(),
        codeType,
        color,
        notes: notes.trim(),
        dateAdded: existingCard?.dateAdded || Date.now(),
        lastUsed: existingCard?.lastUsed,
      };
      
      await onSave(cardData);
      if (Platform.OS !== 'web') {
        await successHaptic();
      }
    } catch (error) {
      console.error('Error saving card:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle scan button press
  const handleScanPress = async () => {
    if (Platform.OS !== 'web') {
      await lightHaptic();
    }
    if (Platform.OS !== 'web' && onScanPress) {
      onScanPress();
    } else if (Platform.OS === 'web') {
      console.log('Camera scanning is not supported on web platform');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoid}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Card Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter store or brand name"
            placeholderTextColor={COLORS.textHint}
          />
        </View>
        
        {/* Card Code */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Card Code</Text>
          <View style={styles.codeInputContainer}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              placeholder="Enter card number or scan"
              placeholderTextColor={COLORS.textHint}
              keyboardType="default"
            />
            <TouchableOpacity 
              style={[
                styles.scanButton,
                Platform.OS === 'web' && styles.scanButtonDisabled
              ]}
              onPress={handleScanPress}
              disabled={Platform.OS === 'web'}
            >
              <Camera size={20} color={Platform.OS === 'web' ? COLORS.textHint : COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          {Platform.OS === 'web' && (
            <Text style={styles.webNotice}>Camera scanning is not available on web</Text>
          )}
        </View>
        
        {/* Code Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Code Type</Text>
          <View style={styles.codeTypeContainer}>
            <TouchableOpacity
              style={[
                styles.codeTypeButton,
                codeType === 'barcode' && styles.codeTypeButtonActive,
              ]}
              onPress={() => setCodeType('barcode')}
            >
              <BarChart4 
                size={20} 
                color={codeType === 'barcode' ? COLORS.accent : COLORS.textSecondary} 
              />
              <Text style={[
                styles.codeTypeText,
                codeType === 'barcode' && styles.codeTypeTextActive,
              ]}>
                Barcode
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.codeTypeButton,
                codeType === 'qrcode' && styles.codeTypeButtonActive,
              ]}
              onPress={() => setCodeType('qrcode')}
            >
              <QrCode 
                size={20} 
                color={codeType === 'qrcode' ? COLORS.accent : COLORS.textSecondary} 
              />
              <Text style={[
                styles.codeTypeText,
                codeType === 'qrcode' && styles.codeTypeTextActive,
              ]}>
                QR Code
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Card Color */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Card Color</Text>
          <View style={styles.colorOptionsContainer}>
            {colorOptions.map((colorOption) => (
              <TouchableOpacity
                key={colorOption}
                style={[
                  styles.colorOption,
                  { backgroundColor: colorOption },
                  color === colorOption && styles.colorOptionSelected,
                ]}
                onPress={() => setColor(colorOption)}
              />
            ))}
          </View>
        </View>
        
        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional information"
            placeholderTextColor={COLORS.textHint}
            multiline
            numberOfLines={3}
          />
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <XCircle size={20} color={COLORS.textSecondary} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.saveButton,
              (!name.trim() || !code.trim()) && styles.saveButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!name.trim() || !code.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small\" color={COLORS.textPrimary} />
            ) : (
              <>
                <Save size={20} color={COLORS.textPrimary} />
                <Text style={styles.saveButtonText}>
                  {existingCard ? 'Update Card' : 'Save Card'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  contentContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.backgroundMedium,
    color: COLORS.textPrimary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundMedium,
    color: COLORS.textPrimary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  scanButton: {
    backgroundColor: COLORS.backgroundLight,
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  scanButtonDisabled: {
    backgroundColor: COLORS.backgroundMedium,
    opacity: 0.5,
  },
  webNotice: {
    color: COLORS.textHint,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  codeTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  codeTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundMedium,
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  codeTypeButtonActive: {
    backgroundColor: COLORS.backgroundLight,
    borderColor: COLORS.accent,
    borderWidth: 1,
  },
  codeTypeText: {
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontSize: 16,
  },
  codeTypeTextActive: {
    color: COLORS.textPrimary,
  },
  colorOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 12,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: COLORS.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundMedium,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 2,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.accentDark,
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default CardForm;