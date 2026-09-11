import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * A two-sided, gesture-driven paper sheet. The page rotates around its binding
 * while the layered highlights and shadows make the moving edge look curved.
 * Only transforms and opacity are animated so Android can keep the interaction
 * on the native animation driver.
 */
export default function PageCurl({ width, direction, drag, paperColor, lineColor, currentPage, targetPage, panHandlers, mode = 'curl' }) {
  const pageWidth = Math.max(1, width);
  const inputRange = direction === 1
    ? [-pageWidth, -pageWidth * 0.72, -pageWidth * 0.32, 0]
    : [0, pageWidth * 0.32, pageWidth * 0.72, pageWidth];
  const atProgress = values => drag.interpolate({
    inputRange,
    outputRange: values,
    extrapolate: 'clamp',
  });
  const isSlide = mode === 'slide';

  // === 3D CURVATURE PHYSICS (MODO CURVA REAL) ===
  // Anchored Hinge Rotation: Pins the page rotation to the book's spine (always on the left for single-page portrait)
  const anchorOffset = pageWidth / 2;
  const rotateY = atProgress(['-180deg', '-88deg', '-36deg', '0deg']);
  const rotateZ = atProgress(['0deg', '1.2deg', '3.2deg', '0deg']);
  const sheetScaleX = atProgress([1, 0.96, 0.93, 1]);
  const sheetScaleY = atProgress([1, 0.99, 0.985, 1]);

  // === SLIDE PHYSICS (MODO DESLIZAR KINDLE) ===
  const slideTravel = atProgress(direction === 1 ? [-pageWidth, -pageWidth * 0.72, -pageWidth * 0.32, 0] : [0, pageWidth * 0.32, pageWidth * 0.72, pageWidth]);

  // Destination Under-Page Depth
  const underScale = isSlide
    ? atProgress([1, 0.99, 0.978, 0.965])
    : atProgress([1, 0.995, 0.988, 0.982]);
  const underTravel = isSlide
    ? atProgress(direction === 1 ? [0, 4, 10, 16] : [-16, -10, -4, 0])
    : atProgress(direction === 1 ? [0, 1.5, 4, 8] : [-8, -4, -1.5, 0]);

  // Explicit opacity culling for Android Hermes:
  const frontOpacity = isSlide ? 1 : atProgress([0, 0.15, 1, 1]);
  const backOpacity = isSlide ? 0 : atProgress([1, 0.85, 0, 0]);

  // Layered lighting, shadows, and specular curl ridge
  const projectedShadow = isSlide
    ? atProgress([0, 0.2, 0.35, 0.45])
    : atProgress([0.05, 0.65, 0.55, 0]);
  const faceShade = isSlide ? 0 : atProgress([0.04, 0.42, 0.32, 0]);
  const ridgeOpacity = isSlide ? 0 : atProgress([0.1, 0.95, 0.9, 0]);
  const ridgeScale = atProgress([0.25, 1.35, 1.15, 0.2]);
  const movingEdge = { right: -36 }; // Spine is always on the left, so the moving loose edge is always the right!
  const bindingEdge = { left: 0 }; // Binding is always on the left

  const turningTransforms = isSlide
    ? [{ translateX: slideTravel }]
    : [
        { perspective: 1200 },
        { translateX: -anchorOffset },
        { rotateZ },
        { rotateY },
        { translateX: anchorOffset },
        { scaleX: sheetScaleX },
        { scaleY: sheetScaleY },
      ];

  const actualUnderPage = direction === 1 ? targetPage : currentPage;
  const actualTurningPage = direction === 1 ? currentPage : targetPage;

  return <View style={[styles.stage, { backgroundColor: paperColor }]} {...panHandlers}>
    {/* 1. Destination Page (underneath, revealed as the sheet turns) */}
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.underPage, { backgroundColor: paperColor, transform: [{ translateX: underTravel }, { scale: underScale }] }]}
    >
      {actualUnderPage}
      {/* Drop Shadow onto underneath page */}
      <Animated.View style={[styles.bindingShadow, bindingEdge, { opacity: projectedShadow }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.03)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </Animated.View>

    {/* 2. Turning Sheet in Anchored 3D Perspective or Tactile Slide */}
    <Animated.View
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[
        styles.turningSheet,
        {
          backgroundColor: paperColor,
          transform: turningTransforms,
        },
      ]}
    >
      {/* Front Face (Anverso): Intact full-width page text with explicit frontOpacity */}
      <Animated.View style={[styles.face, { backgroundColor: paperColor, opacity: frontOpacity }]}>
        {actualTurningPage}

        {/* Crease Ambient Shadow at the binding hinge */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.foldShadow,
            { left: 0 },
            { opacity: faceShade },
          ]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.38)', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.06)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </Animated.View>

      {/* Back Face (Reverso / Verso): Clean paper texture with BackShadow */}
      <Animated.View pointerEvents="none" style={[styles.backFace, { backgroundColor: paperColor, opacity: backOpacity }]}>
        <LinearGradient
          colors={[lineColor, paperColor, paperColor, 'rgba(0,0,0,0.35)']}
          locations={[0, 0.12, 0.72, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Dynamic Paper Curl Ridge Highlight along the folding edge */}
      <Animated.View pointerEvents="none" style={[styles.curlRidge, movingEdge, { opacity: ridgeOpacity, transform: [{ scaleX: ridgeScale }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.85)', lineColor, 'rgba(0,0,0,0.45)', 'transparent']}
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
