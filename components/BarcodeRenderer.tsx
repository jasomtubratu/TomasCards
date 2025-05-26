import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, PinchGestureHandler } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { COLORS } from '@/constants/Colors';

interface BarcodeRendererProps {
  code: string;
  codeType: 'barcode' | 'qrcode';
}

const AnimatedWebView = Animated.createAnimatedComponent(WebView);

const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({ code, codeType }) => {
  const scale = useSharedValue(1);
  const windowWidth = Dimensions.get('window').width - 64; // Account for padding
  
  // HTML content for rendering the barcode/QR code
  const generateHtml = () => {
    const scriptType = codeType === 'barcode' ? 'JsBarcode' : 'QRCode';
    const elementId = codeType === 'barcode' ? 'barcode' : 'qrcode';
    const implementation = codeType === 'barcode' 
      ? `JsBarcode("#barcode", "${code}", {
          format: "CODE128",
          lineColor: "#FFFFFF",
          background: "#252640",
          width: 2,
          height: 100,
          displayValue: false
        });`
      : `new QRCode(document.getElementById("qrcode"), {
          text: "${code}",
          width: 200,
          height: 200,
          colorDark: "#FFFFFF",
          colorLight: "#252640",
          correctLevel: QRCode.CorrectLevel.H
        });`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #252640;
            overflow: hidden;
          }
          #container {
            display: flex;
            justify-content: center;
            align-items: center;
          }
          svg, #qrcode {
            max-width: 100%;
          }
          #qrcode img {
            margin: 0 auto;
          }
        </style>
        ${codeType === 'barcode' 
          ? '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>' 
          : '<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>'}
      </head>
      <body>
        <div id="container">
          ${codeType === 'barcode' 
            ? '<svg id="barcode"></svg>' 
            : '<div id="qrcode"></div>'}
        </div>
        <script>
          ${implementation}
        </script>
      </body>
      </html>
    `;
  };

  // Handle pinch gesture
  const pinchGestureHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      scale.value = Math.max(0.5, Math.min(event.scale, 3));
    },
    onEnd: () => {
      if (scale.value < 0.7) {
        scale.value = withSpring(0.7);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
        <Animated.View style={[styles.webViewContainer, animatedStyle]}>
          <AnimatedWebView
            style={styles.webView}
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
        <Svg height={40} width={windowWidth}>
          <Rect
            x={0}
            y={0}
            width={windowWidth}
            height={40}
            fill={COLORS.backgroundMedium}
            rx={8}
            ry={8}
          />
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
    width: Dimensions.get('window').width - 64,
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  webView: {
    backgroundColor: COLORS.backgroundMedium,
  },
  instructions: {
    marginTop: 16,
    alignItems: 'center',
  },
});

export default BarcodeRenderer;