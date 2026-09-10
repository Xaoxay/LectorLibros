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
  const rotateY = atProgress(['0deg', `${sign * 38}deg`, `${sign * 108}deg`, `${sign * 156}deg`]);
  const travel = atProgress([0, sign * pageWidth * 0.08, sign * pageWidth * 0.28, sign * pageWidth * 0.5]);
  const sheetScale = atProgress([1, 0.995, 0.94, 0.84]);
  const underScale = atProgress([0.982, 0.986, 0.994, 1]);
  const underTravel = atProgress([-sign * 12, -sign * 9, -sign * 4, 0]);
  const projectedShadow = atProgress([0, 0.24, 0.5, 0.12]);
  const faceShade = atProgress([0, 0.08, 0.27, 0.12]);
  const ridgeOpacity = atProgress([0, 0.72, 1, 0.42]);
  const ridgeScale = atProgress([0.03, 0.58, 1, 0.34]);
  const pivot = direction === 1 ? pageWidth / 2 : -pageWidth / 2;
  const movingEdge = direction === 1 ? { right: -34 } : { left: -34 };
  const bindingEdge = direction === 1 ? { left: 0 } : { right: 0 };

  return <View style={[styles.stage, { backgroundColor: paperColor }]} {...panHandlers}>
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.underPage, { backgroundColor: paperColor, transform: [{ translateX: underTravel }, { scale: underScale }] }]}
    >
      {targetPage}
      <Animated.View style={[styles.bindingShadow, bindingEdge, { opacity: projectedShadow }]}>
        <LinearGradient
          colors={direction === 1 ? ['rgba(18,12,4,0.46)', 'rgba(18,12,4,0.12)', 'transparent'] : ['transparent', 'rgba(18,12,4,0.12)', 'rgba(18,12,4,0.46)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </Animated.View>

    <Animated.View
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[styles.turningSheet, {
        backgroundColor: paperColor,
        transform: [
          { perspective: 1450 },
          { translateX: pivot },
          { rotateY },
          { translateX: -pivot },
          { translateX: travel },
          { scaleX: sheetScale },
        ],
      }]}
    >
      <View style={[styles.face, { backgroundColor: paperColor }]}>{currentPage}</View>

      <View pointerEvents="none" style={[styles.backFace, { backgroundColor: paperColor, transform: [{ rotateY: '180deg' }] }]}>
        <LinearGradient
          colors={direction === 1
            ? [lineColor, paperColor, paperColor, 'rgba(255,255,255,0.2)']
            : ['rgba(255,255,255,0.2)', paperColor, paperColor, lineColor]}
          locations={[0, 0.12, 0.72, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: faceShade }]}>
        <LinearGradient
          colors={direction === 1 ? ['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.08)'] : ['rgba(0,0,0,0.08)', 'transparent', 'rgba(0,0,0,0.3)']}
          locations={[0, 0.62, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.curlRidge, movingEdge, { opacity: ridgeOpacity, transform: [{ scaleX: ridgeScale }] }]}>
        <LinearGradient
          colors={direction === 1
            ? ['transparent', 'rgba(255,255,255,0.72)', lineColor, 'rgba(0,0,0,0.42)', 'transparent']
            : ['transparent', 'rgba(0,0,0,0.42)', lineColor, 'rgba(255,255,255,0.72)', 'transparent']}
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
  },
  face: { flex: 1, backfaceVisibility: 'hidden' },
  backFace: { ...StyleSheet.absoluteFillObject, backfaceVisibility: 'hidden' },
  bindingShadow: { position: 'absolute', top: 0, bottom: 0, width: 96 },
  curlRidge: { position: 'absolute', top: 0, bottom: 0, width: 104 },
});
