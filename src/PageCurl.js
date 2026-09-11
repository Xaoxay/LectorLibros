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
  const rotateY = atProgress(['0deg', `${sign * 18}deg`, `${sign * 42}deg`, `${sign * 180}deg`]);
  const sheetScale = atProgress([1, 0.992, 0.982, 0.96]);
  const travel = atProgress([0, sign * pageWidth * 0.32, sign * pageWidth * 0.72, sign * pageWidth]);
  const underScale = atProgress([0.985, 0.989, 0.995, 1]);
  const underTravel = atProgress([-sign * 8, -sign * 5, -sign * 2, 0]);

  // Explicit opacity culling for Android Hermes (fixes backfaceVisibility bug):
  // Front face (text) is 100% visible while turning, and fades smoothly as it leaves the screen
  const frontOpacity = atProgress([1, 1, 0.85, 0]);
  const backOpacity = atProgress([0, 0, 0.15, 1]);

  const projectedShadow = atProgress([0, 0.42, 0.58, 0.05]);
  const faceShade = atProgress([0, 0.22, 0.35, 0.04]);
  const ridgeOpacity = atProgress([0, 0.75, 0.95, 0.25]);
  const ridgeScale = atProgress([0.05, 0.65, 1, 0.3]);
  const movingEdge = direction === 1 ? { right: -36 } : { left: -36 };
  const bindingEdge = direction === 1 ? { left: 0 } : { right: 0 };

  return <View style={[styles.stage, { backgroundColor: paperColor }]} {...panHandlers}>
    {/* 1. Destination Page (underneath, revealed as the sheet turns) */}
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
            ? ['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.02)', 'transparent']
            : ['transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.45)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </Animated.View>

    {/* 2. Turning Sheet in 3D Perspective (Dual Face: Front + Back without text clipping) */}
    <Animated.View
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[
        styles.turningSheet,
        {
          backgroundColor: paperColor,
          transform: [
            { perspective: 1200 },
            { translateX: travel },
            { rotateY },
            { scale: sheetScale },
          ],
        },
      ]}
    >
      {/* Front Face (Anverso): Intact full-width page text with explicit frontOpacity */}
      <Animated.View style={[styles.face, { backgroundColor: paperColor, opacity: frontOpacity }]}>
        {currentPage}

        {/* Crease Ambient Shadow (FrontShadow from react-native-page-flipper) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.foldShadow,
            direction === 1 ? { right: 0 } : { left: 0 },
            { opacity: faceShade },
          ]}
        >
          <LinearGradient
            colors={direction === 1
              ? ['transparent', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.32)']
              : ['rgba(0,0,0,0.32)', 'rgba(0,0,0,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </Animated.View>

      {/* Back Face (Reverso / Verso): Clean paper texture with BackShadow and explicit backOpacity */}
      <Animated.View pointerEvents="none" style={[styles.backFace, { backgroundColor: paperColor, opacity: backOpacity }]}>
        <LinearGradient
          colors={direction === 1
            ? [lineColor, paperColor, paperColor, 'rgba(0,0,0,0.35)']
            : ['rgba(0,0,0,0.35)', paperColor, paperColor, lineColor]}
          locations={[0, 0.12, 0.72, 1]}
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
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
  backFace: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
    transform: [{ rotateY: '180deg' }],
  },
  foldShadow: { position: 'absolute', top: 0, bottom: 0, width: 42 },
  bindingShadow: { position: 'absolute', top: 0, bottom: 0, width: 96 },
  curlRidge: { position: 'absolute', top: 0, bottom: 0, width: 104 },
});
