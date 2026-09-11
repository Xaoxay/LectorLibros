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
  const rotateY = atProgress(['0deg', `${sign * 28}deg`, `${sign * 56}deg`, `${sign * 180}deg`]);
  const rotateZ = atProgress(['0deg', `${sign * -2.8}deg`, `${sign * -1.2}deg`, '0deg']);
  const sheetScale = atProgress([1, 0.985, 0.965, 0.95]);
  const travel = atProgress([0, sign * pageWidth * 0.32, sign * pageWidth * 0.72, sign * pageWidth]);
  const underScale = atProgress([0.985, 0.989, 0.995, 1]);
  const underTravel = atProgress([-sign * 10, -sign * 6, -sign * 2, 0]);

  // Explicit opacity culling for Android Hermes (fixes backfaceVisibility bug):
  // Front face (text) is 100% visible while turning, and fades smoothly as it leaves the screen
  const frontOpacity = atProgress([1, 1, 0.85, 0]);
  const backOpacity = atProgress([0, 0, 0.15, 1]);

  const projectedShadow = atProgress([0, 0.48, 0.65, 0.05]);
  const faceShade = atProgress([0, 0.28, 0.45, 0.04]);
  const ridgeOpacity = atProgress([0, 0.85, 1, 0.25]);
  const ridgeScale = atProgress([0.1, 0.8, 1.25, 0.3]);
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
            ? ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.03)', 'transparent']
            : ['transparent', 'rgba(0,0,0,0.03)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </Animated.View>

    {/* 2. Turning Sheet in 3D Perspective with Enhanced Curvature */}
    <Animated.View
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[
        styles.turningSheet,
        {
          backgroundColor: paperColor,
          transform: [
            { perspective: 950 },
            { translateX: travel },
            { rotateZ },
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
              ? ['transparent', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.42)']
              : ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.06)', 'transparent']}
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
            ? [lineColor, paperColor, paperColor, 'rgba(0,0,0,0.38)']
            : ['rgba(0,0,0,0.38)', paperColor, paperColor, lineColor]}
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
            ? ['transparent', 'rgba(255,255,255,0.85)', lineColor, 'rgba(0,0,0,0.5)', 'transparent']
            : ['transparent', 'rgba(0,0,0,0.5)', lineColor, 'rgba(255,255,255,0.85)', 'transparent']}
          locations={[0, 0.22, 0.46, 0.75, 1]}
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
  foldShadow: { position: 'absolute', top: 0, bottom: 0, width: 56 },
  bindingShadow: { position: 'absolute', top: 0, bottom: 0, width: 110 },
  curlRidge: { position: 'absolute', top: 0, bottom: 0, width: 110 },
});
