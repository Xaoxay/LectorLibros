import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Linking, Modal, PanResponder, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system';

const themes = {
  sepia: { bg: '#F5ECD9', paper: '#FCF5E6', text: '#352C22', muted: '#74634E', line: '#DCCEAF', accent: '#855D2F' },
  light: { bg: '#EDEFF2', paper: '#FFFFFF', text: '#202938', muted: '#58677A', line: '#D3DBE5', accent: '#245DC1' },
  dark: { bg: '#0C1420', paper: '#141F2F', text: '#E5EAF1', muted: '#A0AFC2', line: '#344458', accent: '#95BDFF' },
};
const defaults = { theme: 'sepia', fontSize: 18, motion: true };

export default function Reader({ route, navigation }) {
  const { book } = route.params;
  const pdf = book.type === 'pdf' && !!book.url;
  const [pages, setPages] = useState(book.pages || []);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(pdf ? 0 : pages.length);
  const [settings, setSettings] = useState(defaults);
  const [marks, setMarks] = useState([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(!!pdf);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [panel, setPanel] = useState(null);
  const [query, setQuery] = useState('');
  const [jump, setJump] = useState('');
  const [reduced, setReduced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [direction, setDirection] = useState(1);
  const [immersive, setImmersive] = useState(false);
  const [retry, setRetry] = useState(0);
  const drag = useRef(new Animated.Value(0)).current;
  const lock = useRef(false);
  const committing = useRef(false);
  const gestureX = useRef(0);
  const animationId = useRef(0);
  const alive = useRef(true);
  const scroll = useRef(null);
  const pdfRef = useRef(null);
  const writeQueue = useRef(Promise.resolve());
  const palette = themes[settings.theme] || themes.sepia;
  const latest = useRef({});

  useEffect(() => {
    alive.current = true;
    Promise.all([AsyncStorage.getItem('reader:' + book.id), AsyncStorage.getItem('reader:settings'), book.contentUri ? FileSystem.readAsStringAsync(book.contentUri) : Promise.resolve(null)])
      .then(([stored, prefs, content]) => {
        if (!alive.current) return;
        const state = JSON.parse(stored || '{}');
        const textPages = content ? JSON.parse(content) : pages;
        if (!Array.isArray(textPages) || textPages.some(p => typeof p !== 'string')) throw new Error('Contenido inválido');
        setPages(textPages);
        if (!pdf) setTotal(textPages.length);
        const saved = JSON.parse(prefs || '{}');
        setPage(Math.max(0, Math.min(Number.isInteger(state.page) ? state.page : 0, pdf ? Number.MAX_SAFE_INTEGER : Math.max(0, textPages.length - 1))));
        setMarks(Array.isArray(state.bookmarks) ? state.bookmarks.filter(Number.isInteger) : []);
        setSettings({ theme: themes[saved.theme] ? saved.theme : 'sepia', fontSize: Math.max(14, Math.min(30, Number(saved.fontSize) || 18)), motion: saved.motion !== false });
      }).catch(() => { if (alive.current) setSaveError('No se pudo recuperar la posición guardada.'); })
      .finally(() => { if (alive.current) setReady(true); });
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive.current) setReduced(v); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive.current = false; drag.stopAnimation(); subscription.remove(); };
  }, [book.id]);

  useEffect(() => {
    if (!ready || !total || (pdf && loading)) return;
    const state = { page, bookmarks: marks, progress: Math.round((page + 1) / total * 100), lastReadAt: new Date().toISOString() };
    writeQueue.current = writeQueue.current.catch(() => {}).then(() => AsyncStorage.setItem('reader:' + book.id, JSON.stringify(state)))
      .then(() => { if (alive.current) setSaveError(''); })
      .catch(() => { if (alive.current) setSaveError('No se pudo guardar el progreso. Revisa el espacio disponible.'); });
  }, [page, marks, ready, total, loading]);

  const changeSettings = patch => {
    const next = { ...settings, ...patch };
    setSettings(next);
    writeQueue.current = writeQueue.current.catch(() => {}).then(() => AsyncStorage.setItem('reader:settings', JSON.stringify(next)))
      .catch(() => { if (alive.current) setSaveError('No se pudieron guardar los ajustes.'); });
  };
  const goTo = next => {
    if (!Number.isInteger(next) || next < 0 || next >= total || lock.current) return;
    setPage(next);
    if (pdf) pdfRef.current?.setPage(next + 1);
    scroll.current?.scrollTo({ y: 0, animated: false });
    setPanel(null);
  };
  const resetDrag = () => {
    if (lock.current) return;
    lock.current = true;
    Animated.spring(drag, { toValue: 0, stiffness: 240, damping: 28, mass: 1, useNativeDriver: true }).start(() => {
      gestureX.current = 0;
      lock.current = false;
    });
  };
  useLayoutEffect(() => {
    if (!committing.current) return;
    // Reset the translated sheets only after React commits the destination text.
    drag.setValue(0);
    gestureX.current = 0;
    committing.current = false;
    lock.current = false;
    scroll.current?.scrollTo({ y: 0, animated: false });
    setBusy(false);
  }, [page]);
  const turn = dir => {
    const current = latest.current;
    const target = current.page + dir;
    if (lock.current || loading) return;
    if (target < 0 || target >= current.total) { resetDrag(); return; }
    setDirection(dir);
    if (pdf || reduced || !settings.motion) { drag.setValue(0); goTo(target); return; }
    lock.current = true;
    setBusy(true);
    const token = ++animationId.current;
    const distance = Math.abs(-dir * width - gestureX.current);
    Animated.timing(drag, { toValue: -dir * width, duration: Math.max(100, 280 * distance / width), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (!alive.current || token !== animationId.current) return;
      if (finished) {
        committing.current = true;
        setPage(target);
      } else {
        drag.setValue(0);
        gestureX.current = 0;
        lock.current = false;
        setBusy(false);
      }
    });
  };
  latest.current = { page, total, turn, width, reduced, motion: settings.motion };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => !lock.current && Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onMoveShouldSetPanResponderCapture: (_, g) => !lock.current && Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onPanResponderMove: (_, g) => {
      if (lock.current) return;
      const current = latest.current;
      gestureX.current = g.dx;
      const dir = g.dx < 0 ? 1 : -1;
      setDirection(dir);
      const edge = current.page + dir < 0 || current.page + dir >= current.total;
      if (!current.reduced && current.motion) drag.setValue(Math.max(-current.width, Math.min(current.width, g.dx * (edge ? 0.12 : 1))));
    },
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > latest.current.width * 0.18 || (Math.abs(g.vx) > 0.5 && Math.abs(g.dx) > 18)) latest.current.turn(g.dx < 0 ? 1 : -1);
      else resetDrag();
    },
    onPanResponderTerminate: resetDrag,
    onPanResponderTerminationRequest: () => true,
  }), []);
  useEffect(() => { animationId.current += 1; drag.stopAnimation(); drag.setValue(0); lock.current = false; setBusy(false); }, [width]);
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle ? pages.map((text, index) => ({ text, index })).filter(p => p.text.toLocaleLowerCase().includes(needle)) : [];
  }, [query, pages]);
  const chapters = useMemo(() => pages.map((text, index) => ({ index, text: text.split('\n')[0] })).filter((p, i) => i === 0 || /^(cap[íi]tulo|parte|introducci[óo]n|pr[óo]logo|ep[íi]logo|[IVX]+\.)/i.test(p.text)), [pages]);
  const icon = (name, label, action, disabled = false, selected = false) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={action} style={({ pressed }) => [styles.icon, { opacity: disabled ? 0.3 : pressed ? 0.55 : 1 }]}><Ionicons name={name} size={23} color={palette.accent} /></Pressable>;
  const button = (label, action, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={action} style={[styles.button, { borderColor: palette.line, opacity: disabled ? 0.4 : 1 }]}><Text style={{ color: palette.text, fontSize: 16 }}>{label}</Text></Pressable>;
  const textStyle = { color: palette.text, fontSize: settings.fontSize, lineHeight: settings.fontSize * 1.65, fontFamily: 'serif' };
  const underneath = pages[page + direction];
  if (!ready) return <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}><ActivityIndicator style={{ flex: 1 }} color={palette.accent} /></SafeAreaView>;
  return <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
    <StatusBar barStyle={settings.theme === 'dark' ? 'light-content' : 'dark-content'} />
    {!immersive && <View style={[styles.toolbar, { borderColor: palette.line }]}>
      {icon('arrow-back', 'Volver a la biblioteca', () => navigation.goBack())}
      <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>{book.name}</Text><Text numberOfLines={1} style={{ color: palette.muted, fontSize: 12 }}>{book.author || 'Lectura personal'}</Text></View>
      {icon(marks.includes(page) ? 'bookmark' : 'bookmark-outline', 'Marcar esta página', () => setMarks(m => m.includes(page) ? m.filter(p => p !== page) : [...m, page].sort((a, b) => a - b)), !total, marks.includes(page))}
      {icon('options-outline', 'Ajustes de lectura', () => setPanel('settings'))}
    </View>}
    {!!saveError && <Text accessibilityRole="alert" style={{ padding: 8, color: palette.text }}>{saveError}</Text>}
    {pdf ? <View style={{ flex: 1 }}>
      {error ? <View style={styles.empty}><Text style={{ color: palette.text }}>{error}</Text>{button('Reintentar', () => { setError(''); setLoading(true); setRetry(v => v + 1); })}</View> : <Pdf key={retry} ref={pdfRef} source={{ uri: book.url, cache: true }} trustAllCerts={false} page={page + 1} horizontal enablePaging style={{ flex: 1, backgroundColor: palette.paper }} onLoadComplete={count => { setTotal(count); setPage(p => Math.min(p, count - 1)); setLoading(false); }} onPageChanged={(p, count) => { if (!loading) setPage(p - 1); setTotal(count); }} onError={() => { setError('No se pudo abrir el PDF. Comprueba que sea válido y que no requiera contraseña.'); setLoading(false); }} />}
      {loading && !error && <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.empty]}><ActivityIndicator color={palette.accent} /><Text style={{ color: palette.text }}>Abriendo PDF…</Text></View>}
    </View> : total ? <View style={{ flex: 1, overflow: 'hidden', backgroundColor: palette.paper }} {...responder.panHandlers}>
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject, { backgroundColor: palette.paper, transform: [{ translateX: drag.interpolate({ inputRange: [-width, 0, width], outputRange: [direction * width - width, direction * width, direction * width + width] }) }] }]}><View style={styles.paper}><Text style={textStyle}>{underneath}</Text></View></Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: palette.paper, transform: [{ translateX: drag }] }]}>
        <ScrollView ref={scroll} contentContainerStyle={styles.paper} showsVerticalScrollIndicator><Text selectable style={textStyle}>{pages[page]}</Text></ScrollView>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, [direction === 1 ? 'right' : 'left']: 0, width: 16, backgroundColor: palette.accent, opacity: drag.interpolate({ inputRange: [-width, 0, width], outputRange: [0.12, 0, 0.12] }) }} />
      </Animated.View>
    </View> : <View style={styles.empty}><Text style={{ color: palette.text }}>Este libro no tiene texto disponible. Importa un PDF o EPUB para leerlo.</Text></View>}
    <View style={{ height: 3, backgroundColor: palette.line }}><View style={{ height: 3, width: `${total ? (page + 1) / total * 100 : 0}%`, backgroundColor: palette.accent }} /></View>
    <View style={[styles.toolbar, { borderColor: palette.line }]}>
      {icon('chevron-back', 'Página anterior', () => turn(-1), !total || page === 0 || busy || loading)}
      <Pressable accessibilityRole="button" accessibilityLabel="Ir a una página" onPress={() => { setJump(String(page + 1)); setPanel('jump'); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}><Text style={{ color: palette.text, fontWeight: '600' }}>{total ? `${page + 1} / ${total}` : 'Sin páginas'}</Text><Text style={{ color: palette.muted, fontSize: 12 }}>{total ? `${Math.round((page + 1) / total * 100)}% leído` : ''}</Text></Pressable>
      {icon('chevron-forward', 'Página siguiente', () => turn(1), !total || page >= total - 1 || busy || loading)}
      {icon('list-outline', 'Índice y marcadores', () => setPanel('contents'))}
      {icon(immersive ? 'contract-outline' : 'expand-outline', 'Alternar lectura inmersiva', () => setImmersive(v => !v))}
    </View>
    <Modal visible={!!panel} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={() => setPanel(null)}>
      <View style={styles.scrim}><SafeAreaView style={[styles.sheet, { backgroundColor: palette.paper }]}>
        <View style={styles.toolbar}><Text accessibilityRole="header" style={{ flex: 1, color: palette.text, fontSize: 20, fontWeight: '700' }}>{{ settings: 'Tu forma de leer', contents: 'Explorar el libro', jump: 'Ir a una página' }[panel]}</Text>{icon('close', 'Cerrar panel', () => setPanel(null))}</View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 12 }}>
          {panel === 'settings' && <>
            <Text style={{ color: palette.muted }}>APARIENCIA</Text><View style={styles.row}>{Object.keys(themes).map(t => <React.Fragment key={t}>{button(`${settings.theme === t ? '✓ ' : ''}${{ sepia: 'Sepia', light: 'Claro', dark: 'Noche' }[t]}`, () => changeSettings({ theme: t }))}</React.Fragment>)}</View>
            {!pdf && <><Text style={{ color: palette.muted }}>TAMAÑO DEL TEXTO · {settings.fontSize}</Text><View style={styles.row}>{button('A−', () => changeSettings({ fontSize: settings.fontSize - 2 }), settings.fontSize <= 14)}{button('A+', () => changeSettings({ fontSize: settings.fontSize + 2 }), settings.fontSize >= 30)}</View>{button(settings.motion && !reduced ? 'Deslizamiento de páginas: activada' : 'Deslizamiento de páginas: desactivada', () => changeSettings({ motion: !settings.motion }), reduced)}<Text style={{ color: palette.muted }}>Desliza horizontalmente para cambiar de página. Desplaza hacia arriba para leer textos largos.</Text></>}
            {book.previewUrl && button('Abrir vista previa en el navegador', () => Linking.openURL(book.previewUrl).catch(() => setSaveError('No se pudo abrir la vista previa.')))}
          </>}
          {panel === 'jump' && <><Text style={{ color: palette.text }}>Número de página (1–{total})</Text><TextInput accessibilityLabel="Número de página" keyboardType="number-pad" value={jump} onChangeText={setJump} style={[styles.input, { color: palette.text, borderColor: palette.line }]} />{button('Ir a la página', () => goTo(Number(jump) - 1), !/^\d+$/.test(jump) || Number(jump) < 1 || Number(jump) > total)}</>}
          {panel === 'contents' && <>
            <Text style={{ color: palette.muted }}>MARCADORES</Text>{!marks.length && <Text style={{ color: palette.text }}>Usa el marcador de la cabecera para guardar una página.</Text>}{marks.filter(p => p < total).map(p => <React.Fragment key={p}>{button(`Página ${p + 1}`, () => goTo(p))}</React.Fragment>)}
            {!pdf && <><TextInput accessibilityLabel="Buscar dentro del libro" placeholder="Buscar una palabra o frase" placeholderTextColor={palette.muted} value={query} onChangeText={setQuery} style={[styles.input, { color: palette.text, borderColor: palette.line }]} /><Text style={{ color: palette.muted }}>{query.trim() ? `${results.length} páginas encontradas` : 'ÍNDICE'}</Text>{(query.trim() ? results : chapters).map(p => <Pressable accessibilityRole="button" key={p.index} onPress={() => goTo(p.index)} style={[styles.button, { borderColor: palette.line }]}><Text style={{ color: palette.accent }}>Página {p.index + 1}</Text><Text numberOfLines={2} style={{ color: palette.text }}>{p.text}</Text></Pressable>)}</>}
          </>}
        </ScrollView>
      </SafeAreaView></View>
    </Modal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  paper: { paddingHorizontal: 26, paddingVertical: 28, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { maxHeight: '85%', minHeight: 280, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 17 },
});
