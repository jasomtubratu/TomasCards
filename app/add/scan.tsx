import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { ArrowLeft, X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';

export default function ScanScreen() {
  const router = useRouter();
  const { store } = useLocalSearchParams<{ store?: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  // Ask for camera permission
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    // Once scanned, go to your manual-entry or save flow:
    router.push({ pathname: '/add/manual', params: { code: data, store } });
  };

  const handleManual = () => {
    router.push({ pathname: '/add/manual', params: { store } });
  };

  const handleBack = () => router.back();        // back to selection
  const handleClose = () => router.replace('/'); // exit add flow completely

  if (hasPermission === null) {
    return <View style={styles.center}><Text style={styles.text}>Requesting camera access…</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.center}><Text style={styles.text}>No access to camera</Text></View>;
  }

  const screenW = Dimensions.get('window').width;
  const frameW = screenW - 32;               // 16px padding each side
  const frameH = (frameW * 3) / 4;           // 4:3 overlay

  return (
    <>
      {/* hide default header */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.title}>
            {store?.toUpperCase() || 'Scan'}
          </Text>

          <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
            <X size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.instruction}>
          Oskenuj čiarový kód svojej karty
        </Text>

        <View style={[styles.scannerWrapper, { width: frameW, height: frameH }]}>
          <BarCodeScanner
            onBarCodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFill}
            barCodeTypes={[
              BarCodeScanner.Constants.BarCodeType.code128,
              BarCodeScanner.Constants.BarCodeType.ean13,
            ]}
          />
          {/* white border overlay */}
          <View style={[styles.overlay, { width: frameW, height: frameH }]} />
        </View>

        <Text style={styles.fallbackText}>
          Tvoja karta sa nedá oskenovať?
        </Text>

        <TouchableOpacity style={styles.manualBtn} onPress={handleManual}>
          <Text style={styles.manualBtnText}>Zadaj ručne</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    alignItems: 'center',
    paddingTop: 48,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconBtn: {
    padding: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  instruction: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  scannerWrapper: {
    marginTop: 24,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  overlay: {
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 8,
  },
  fallbackText: {
    marginTop: 32,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  manualBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.textPrimary,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  manualBtnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
});