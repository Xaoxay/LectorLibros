import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function BottomSheet({ visible, onClose, title, backgroundColor, textColor, accentColor, reducedMotion, children }) {
  const { height } = useWindowDimensions();
  const hiddenPosition = Math.max(560, height);
  const translateY = useRef(new Animated.Value(hiddenPosition)).current;
  const closing = useRef(false);
  const latest = useRef({ hiddenPosition, reducedMotion, onClose });
  latest.current = { hiddenPosition, reducedMotion, onClose };

  const springToOpen = () => {
    closing.current = false;
    Animated.spring(translateY, {
      toValue: 0,
      stiffness: 280,
      damping: 30,
      mass: 0.9,
      overshootClamping: false,
      useNativeDriver: true,
    }).start();
  };

  const dismiss = () => {
    if (closing.current) return;
    closing.current = true;
    if (latest.current.reducedMotion) {
      latest.current.onClose();
      return;
    }
    Animated.timing(translateY, {
      toValue: latest.current.hiddenPosition,
      duration: 210,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) latest.current.onClose();
      closing.current = false;
    });
  };

  useEffect(() => {
    if (!visible) return;
    translateY.stopAnimation();
    translateY.setValue(reducedMotion ? 0 : hiddenPosition);
    if (!reducedMotion) requestAnimationFrame(springToOpen);
    return () => translateY.stopAnimation();
  }, [visible, hiddenPosition, reducedMotion]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => {
      if (closing.current || latest.current.reducedMotion) return;
      translateY.setValue(Math.max(-20, gesture.dy));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > Math.min(140, latest.current.hiddenPosition * 0.2) || gesture.vy > 0.85) dismiss();
      else springToOpen();
    },
    onPanResponderTerminate: springToOpen,
  }), []);

  const backdropOpacity = translateY.interpolate({
    inputRange: [0, hiddenPosition],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity, backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar panel" onPress={dismiss} style={StyleSheet.absoluteFillObject} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { backgroundColor, transform: [{ translateY }] }]}>
          <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
            <View accessibilityRole="adjustable" accessibilityLabel="Arrastrá hacia abajo para cerrar" style={styles.handleArea} {...responder.panHandlers}>
              <View style={[styles.handle, { backgroundColor: accentColor }]} />
            </View>
            <View style={styles.header}>
              <Text accessibilityRole="header" numberOfLines={2} style={[styles.title, { color: textColor }]}>{title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar panel" hitSlop={8} onPress={dismiss} style={({ pressed }) => [styles.close, { opacity: pressed ? 0.55 : 1 }]}>
                <Ionicons name="close" size={25} color={accentColor} />
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>{children}</View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { height: '84%', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 18 },
  handleArea: { height: 36, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 48, height: 5, borderRadius: 3, opacity: 0.55 },
  header: { minHeight: 56, paddingLeft: 20, paddingRight: 8, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 20, lineHeight: 25, fontWeight: '700' },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
