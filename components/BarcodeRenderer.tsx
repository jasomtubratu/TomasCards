import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import {
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { COLORS } from '@/constants/Colors';

export type BarcodeRendererProps = {
  code: string;
  codeType: 'barcode' | 'qrcode';
  width?: number;    // line thickness for barcode or size for QR
  height?: number;   // height for barcode or size for QR
};

const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  code,
  codeType,
  width,
  height,
}) => {
  const scale = useSharedValue(1);
  const windowWidth = Dimensions.get('window').width - 64;

  // Defaults
  const defaultBarcodeWidth = 2;
  const defaultBarcodeHeight = 100;
  const defaultQrSize = 200;

  // Derived dimensions
  const barcodeWidth = width ?? defaultBarcodeWidth;
  const barcodeHeight = height ?? defaultBarcodeHeight;
  const qrSize = height ?? width ?? defaultQrSize;
  const containerWidth = codeType === 'barcode' ? windowWidth : qrSize;
  const containerHeight = codeType === 'barcode' ? barcodeHeight : qrSize;

  // HTML content for rendering
  const generateHtml = () => {
    if (codeType === 'barcode') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
          <style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;background-color:#252640;}</style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <svg id="barcode"></svg>
          <script>
            JsBarcode('#barcode', '${code}', {
              format: 'CODE128',
              lineColor: '#FFFFFF',
              background: '#252640',
              width: ${barcodeWidth},
              height: ${barcodeHeight},
              displayValue: false
            });
          </script>
        </body>
        </html>
      `;
    }

    // QR Code
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;background-color:#252640;}#qrcode{padding:0;margin:0;}</style>
        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
      </head>
      <body>
        <div id="qrcode"></div>
        <script>
          const qr = qrcode(0, 'H');
          qr.addData('${code}');
          qr.make();
          document.getElementById('qrcode').innerHTML = qr.createImgTag(${qrSize}, ${qrSize});
        </script>
      </body>
      </html>
    `;
  };

  const pinchGestureHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent>({
    onActive: (event) => {
      scale.value = Math.max(0.5, Math.min(event.scale, 3));
    },
    onEnd: () => {
      if (scale.value < 0.7) scale.value = withSpring(0.7);
      else if (scale.value > 3) scale.value = withSpring(3);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.container}>
      <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
        <Animated.View style={[styles.webViewContainer, animatedStyle, { width: containerWidth, height: containerHeight }]}>            
          <WebView
            style={[styles.webView, { backgroundColor: COLORS.backgroundMedium }]} 
            source={{ html: generateHtml() }}
            originWhitelist={['*']}
            scalesPageToFit={false}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </PinchGestureHandler>
      <View style={styles.instructions}>
        <Svg height={40} width={containerWidth}>
          <Rect x={0} y={0} width={containerWidth} height={40} fill={COLORS.backgroundMedium} rx={8} ry={8} />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundMedium,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  webViewContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  instructions: {
    marginTop: 16,
    alignItems: 'center',
  },
});

export default BarcodeRenderer;
