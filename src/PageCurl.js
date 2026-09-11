import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * A two-sided, gesture-driven paper sheet. The page rotates around its binding
 * while the layered highlights and shadows make the moving edge look curved.
 * Only transforms and opacity are animated so Android can keep the interaction
 * on the native animation driver.
 */
export default function PageCurl({ width, direction, drag, paperColor, lineColor, currentPage, targetPage, panHandlers }) {
  const pageWidth = Math.max(1, width);
  const inputRange = direction === 1
    ? [-pageWidth, -pageWidth * 0.72, -pageWidth * 0.32, 0]
    : [0, pageWidth * 0.32, pageWidth * 0.72, pageWidth];
  const atProgress = values => drag.interpolate({
    inputRange,
    outputRange: direction === 1 ? [...values].reverse() : values,
    extrapolate: 'clamp',
  });
  const sign = direction === 1 ? -1 : 1;
  const rotateY = atProgress(['0deg', `${sign * 45}deg`, `${sign * 115}deg`, `${sign * 180}deg`]);
  const sheetOpacity = atProgress([1, 0.88, 0.94, 1]);
  const underScale = atProgress([0.985, 0.99, 0.996, 1]);
  const underTravel = atProgress([-sign * 8, -sign * 5, -sign * 2, 0]);
  const projectedShadow = atProgress([0, 0.3, 0.55, 0.08]);
  const faceShade = atProgress([0, 0.15, 0.35, 0.06]);
  const ridgeOpacity = atProgress([0, 0.75, 0.95, 0.25]);
  const ridgeScale = atProgress([0.05, 0.65, 1, 0.3]);
  const pivot = direction === 1 ? pageWidth / 2 : -pageWidth / 2;
  const movingEdge = direction === 1 ? { right: -36 } : { left: -36 };
  const bindingEdge = direction === 1 ? { left: 0 } : { right: 0 };

  return <View style={[styles.stage, { backgroundColor: paperColor }]} {...panHandlers}>
    {/* Destination Page (underneath) */}
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.underPage, { backgroundColor: paperColor, transform: [{ translateX: underTravel }, { scale: underScale }] }]}
    >
      {targetPage}
      {/* Drop Shadow onto underneath page (PageShadow from react-native-page-flipper) */}
      <Animated.View style={[styles.bindingShadow, bindingEdge, { opacity: projectedShadow }]}>
        <LinearGradient
          colors={direction === 1
            ? ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.02)', 'transparent']
            : ['transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.5)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </Animated.View>

    {/* Turning Page (3D flip with spine hinge, double-face & shadows) */}
    <Animated.View
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[styles.turningSheet, {
        backgroundColor: paperColor,
        opacity: sheetOpacity,
        transform: [
          { perspective: 1500 },
          { translateX: pivot },
          { rotateY },
          { translateX: -pivot },
        ],
      }]}
    >
      {/* Front Face (Current Page) */}
      <View style={[styles.face, { backgroundColor: paperColor }]}>{currentPage}</View>

      {/* Back Face (Verso with BackShadow like in react-native-page-flipper) */}
      <View pointerEvents="none" style={[styles.backFace, { backgroundColor: paperColor, transform: [{ rotateY: '180deg' }] }]}>
        <LinearGradient
          colors={direction === 1
            ? [lineColor, paperColor, paperColor, 'rgba(0,0,0,0.35)']
            : ['rgba(0,0,0,0.35)', paperColor, paperColor, lineColor]}
          locations={[0, 0.12, 0.72, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Crease Ambient Shadow (FrontShadow from react-native-page-flipper) */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: faceShade }]}>
        <LinearGradient
          colors={direction === 1
            ? ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.12)', 'transparent', 'rgba(0,0,0,0.1)']
            : ['rgba(0,0,0,0.1)', 'transparent', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.35)']}
          locations={[0, 0.25, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Dynamic Paper Curl Ridge Highlight along the folding edge */}
      <Animated.View pointerEvents="none" style={[styles.curlRidge, movingEdge, { opacity: ridgeOpacity, transform: [{ scaleX: ridgeScale }] }]}>
        <LinearGradient
          colors={direction === 1
            ? ['transparent', 'rgba(255,255,255,0.7)', lineColor, 'rgba(0,0,0,0.45)', 'transparent']
            : ['transparent', 'rgba(0,0,0,0.45)', lineColor, 'rgba(255,255,255,0.7)', 'transparent']}
          locations={[0, 0.25, 0.48, 0.72, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  stage: { flex: 1, overflow: 'hidden' },
  underPage: { ...StyleSheet.absoluteFillObject },
  turningSheet: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  face: { flex: 1, backfaceVisibility: 'hidden' },
  backFace: { ...StyleSheet.absoluteFillObject, backfaceVisibility: 'hidden' },
  bindingShadow: { position: 'absolute', top: 0, bottom: 0, width: 96 },
  curlRidge: { position: 'absolute', top: 0, bottom: 0, width: 104 },
});
