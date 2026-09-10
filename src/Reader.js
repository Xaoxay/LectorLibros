import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Linking, PanResponder, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { HIGHLIGHT_COLORS, createAnnotation, normalizeAnnotations, phraseOptions, textSegments } from './annotations';
import BottomSheet from './BottomSheet';

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
  const [annotations, setAnnotations] = useState([]);
  const [draftQuote, setDraftQuote] = useState('');
  const [draftRange, setDraftRange] = useState(null);
  const [draftNote, setDraftNote] = useState('');
  const [draftColor, setDraftColor] = useState(HIGHLIGHT_COLORS[0]);
  const [annotationMessage, setAnnotationMessage] = useState('');
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
        setAnnotations(normalizeAnnotations(state.annotations));
        setSettings({ theme: themes[saved.theme] ? saved.theme : 'sepia', fontSize: Math.max(14, Math.min(30, Number(saved.fontSize) || 18)), motion: saved.motion !== false });
      }).catch(() => { if (alive.current) setSaveError('No se pudo recuperar la posición guardada.'); })
      .finally(() => { if (alive.current) setReady(true); });
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive.current) setReduced(v); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive.current = false; drag.stopAnimation(); subscription.remove(); };
  }, [book.id]);

  useEffect(() => {
    if (!ready || !total || (pdf && loading)) return;
    const state = { page, bookmarks: marks, annotations, progress: Math.round((page + 1) / total * 100), lastReadAt: new Date().toISOString() };
    writeQueue.current = writeQueue.current.catch(() => {}).then(() => AsyncStorage.setItem('reader:' + book.id, JSON.stringify(state)))
      .then(() => { if (alive.current) setSaveError(''); })
      .catch(() => { if (alive.current) setSaveError('No se pudo guardar el progreso. Revisa el espacio disponible.'); });
  }, [page, marks, annotations, ready, total, loading]);

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
  const currentAnnotations = useMemo(() => annotations.filter(item => item.page === page), [annotations, page]);
  const suggestions = useMemo(() => phraseOptions(pages[page] || ''), [pages, page]);
  const openAnnotation = () => {
    setDraftQuote('');
    setDraftRange(null);
    setDraftNote('');
    setDraftColor(HIGHLIGHT_COLORS[0]);
    setAnnotationMessage('');
    setPanel('annotate');
  };
  const saveAnnotation = () => {
    try {
      const item = createAnnotation({ page, pageText: pdf ? null : (pages[page] || ''), quote: draftQuote, start: draftRange?.start, end: draftRange?.end, color: draftColor, note: draftNote });
      setAnnotations(items => [...items, item]);
      setAnnotationMessage(pdf ? 'Nota guardada.' : 'Resaltado guardado.');
      setPanel('contents');
    } catch (e) {
      setAnnotationMessage(e.message);
    }
  };
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
      {icon('color-fill-outline', pdf ? 'Agregar nota a esta página' : 'Resaltar una frase', openAnnotation, !total)}
      {icon('options-outline', 'Ajustes de lectura', () => setPanel('settings'))}
    </View>}
    {!!saveError && <Text accessibilityRole="alert" style={{ padding: 8, color: palette.text }}>{saveError}</Text>}
    {pdf ? <View style={{ flex: 1 }}>
      {error ? <View style={styles.empty}><Text style={{ color: palette.text }}>{error}</Text>{button('Reintentar', () => { setError(''); setLoading(true); setRetry(v => v + 1); })}</View> : <Pdf key={retry} ref={pdfRef} source={{ uri: book.url, cache: true }} trustAllCerts={false} page={page + 1} horizontal enablePaging style={{ flex: 1, backgroundColor: palette.paper }} onLoadComplete={count => { setTotal(count); setPage(p => Math.min(p, count - 1)); setLoading(false); }} onPageChanged={(p, count) => { if (!loading) setPage(p - 1); setTotal(count); }} onError={() => { setError('No se pudo abrir el PDF. Comprueba que sea válido y que no requiera contraseña.'); setLoading(false); }} />}
      {loading && !error && <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.empty]}><ActivityIndicator color={palette.accent} /><Text style={{ color: palette.text }}>Abriendo PDF…</Text></View>}
    </View> : total ? <View style={{ flex: 1, overflow: 'hidden', backgroundColor: palette.paper }} {...responder.panHandlers}>
      {/* Página de abajo: la que queda revelada mientras la de arriba se levanta como papel real */}
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFillObject, { backgroundColor: palette.paper }]}>
        <View style={styles.paper}><Text style={textStyle}>{underneath}</Text></View>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, [direction === 1 ? 'left' : 'right']: 0, width: 90, opacity: drag.interpolate({ inputRange: [-width, 0, width], outputRange: direction === 1 ? [0.4, 0, 0] : [0, 0, 0.4] }) }}>
          <LinearGradient colors={['rgba(20,15,5,0.45)', 'transparent']} start={{ x: direction === 1 ? 0 : 1, y: 0 }} end={{ x: direction === 1 ? 1 : 0, y: 0 }} style={StyleSheet.absoluteFillObject} />
        </Animated.View>
      </View>
      {/* Página de arriba: se curva y gira en 3D sobre el lomo, como si fuera una hoja de papel real */}
      <Animated.View style={[StyleSheet.absoluteFillObject, {
        backgroundColor: palette.paper,
        transform: [
          { perspective: 1500 },
          { translateX: direction === 1 ? width / 2 : -width / 2 },
          { rotateY: drag.interpolate({ inputRange: [-width, 0, width], outputRange: ['-125deg', '0deg', '125deg'], extrapolate: 'clamp' }) },
          { translateX: direction === 1 ? -width / 2 : width / 2 },
        ],
      }]}>
        <ScrollView ref={scroll} contentContainerStyle={styles.paper} showsVerticalScrollIndicator><Text selectable style={textStyle}>{textSegments(pages[page], currentAnnotations).map((segment, index) => <Text key={`${segment.annotation?.id || 'plain'}_${index}`} style={segment.annotation ? { backgroundColor: segment.annotation.color, color: '#1F2937' } : null}>{segment.text}</Text>)}</Text></ScrollView>
        {/* Sombreado del dorso de la hoja: se oscurece a medida que se levanta, como el papel al no recibir luz directa */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: drag.interpolate({ inputRange: [-width, 0, width], outputRange: [0.5, 0, 0.5] }) }]} />
        {/* Sombra proyectada cerca del pliegue, más intensa junto al borde que gira */}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, [direction === 1 ? 'right' : 'left']: 0, width: 34, opacity: drag.interpolate({ inputRange: [-width, 0, width], outputRange: [0.55, 0, 0.55] }) }}>
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} start={{ x: direction === 1 ? 1 : 0, y: 0 }} end={{ x: direction === 1 ? 0 : 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
        </Animated.View>
        {/* Esquina doblada (dog-ear): la punta de la hoja se despega y curva, como al doblar papel de verdad */}
        {[styles.cornerTop, styles.cornerBottom].map((base, i) => (
          <Animated.View key={i} pointerEvents="none" style={[base, {
            [direction === 1 ? 'right' : 'left']: 0,
            opacity: drag.interpolate({ inputRange: [-width, 0, width], outputRange: [0.95, 0, 0.95] }),
            transform: [{ scale: drag.interpolate({ inputRange: [-width, 0, width], outputRange: [1, 0.01, 1], extrapolate: 'clamp' }) }],
          }]}>
            <View style={{
              position: 'absolute', width: 120, height: 120,
              [direction === 1 ? 'right' : 'left']: -22, [i === 0 ? 'top' : 'bottom']: -22,
              transform: [{ rotate: `${direction === 1 ? (i === 0 ? -45 : 45) : (i === 0 ? 45 : -45)}deg` }],
            }}>
              <LinearGradient colors={[palette.paper, palette.line, 'rgba(0,0,0,0.35)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
            </View>
          </Animated.View>
        ))}
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
    <BottomSheet visible={!!panel} onClose={() => setPanel(null)} reducedMotion={reduced} backgroundColor={palette.paper} textColor={palette.text} accentColor={palette.accent} title={{ settings: 'Tu forma de leer', contents: 'Explorar el libro', jump: 'Ir a una página', annotate: pdf ? 'Nota de página' : 'Resaltar una frase' }[panel]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 12 }}>
          {panel === 'settings' && <>
            <Text style={{ color: palette.muted }}>APARIENCIA</Text><View style={styles.row}>{Object.keys(themes).map(t => <React.Fragment key={t}>{button(`${settings.theme === t ? '✓ ' : ''}${{ sepia: 'Sepia', light: 'Claro', dark: 'Noche' }[t]}`, () => changeSettings({ theme: t }))}</React.Fragment>)}</View>
            {!pdf && <><Text style={{ color: palette.muted }}>TAMAÑO DEL TEXTO · {settings.fontSize}</Text><View style={styles.row}>{button('A−', () => changeSettings({ fontSize: settings.fontSize - 2 }), settings.fontSize <= 14)}{button('A+', () => changeSettings({ fontSize: settings.fontSize + 2 }), settings.fontSize >= 30)}</View>{button(settings.motion && !reduced ? 'Deslizamiento de páginas: activada' : 'Deslizamiento de páginas: desactivada', () => changeSettings({ motion: !settings.motion }), reduced)}<Text style={{ color: palette.muted }}>Desliza horizontalmente para cambiar de página. Desplaza hacia arriba para leer textos largos.</Text></>}
            {book.previewUrl && button('Abrir vista previa en el navegador', () => Linking.openURL(book.previewUrl).catch(() => setSaveError('No se pudo abrir la vista previa.')))}
          </>}
          {panel === 'jump' && <><Text style={{ color: palette.text }}>Número de página (1–{total})</Text><TextInput accessibilityLabel="Número de página" keyboardType="number-pad" value={jump} onChangeText={setJump} style={[styles.input, { color: palette.text, borderColor: palette.line }]} />{button('Ir a la página', () => goTo(Number(jump) - 1), !/^\d+$/.test(jump) || Number(jump) < 1 || Number(jump) > total)}</>}
          {panel === 'annotate' && <>
            {!pdf && <><Text style={{ color: palette.text, fontWeight: '700' }}>Elegí una frase de esta página</Text><View style={{ gap: 8 }}>{suggestions.map(option => <Pressable key={`${option.start}_${option.end}`} accessibilityRole="button" accessibilityState={{ selected: draftRange?.start === option.start }} onPress={() => { setDraftQuote(option.text); setDraftRange(option); setAnnotationMessage(''); }} style={[styles.quoteOption, { borderColor: draftRange?.start === option.start ? palette.accent : palette.line, backgroundColor: draftRange?.start === option.start ? `${draftColor}66` : 'transparent' }]}><Text style={{ color: palette.text, lineHeight: 21 }}>{option.text}</Text></Pressable>)}</View></>}
            <Text style={{ color: palette.text, fontWeight: '700' }}>{pdf ? 'Frase o referencia (opcional)' : 'Frase seleccionada'}</Text>
            <TextInput accessibilityLabel="Frase para resaltar" multiline value={draftQuote} onChangeText={value => { setDraftQuote(value); setDraftRange(null); setAnnotationMessage(''); }} placeholder={pdf ? 'Escribí una frase o referencia de esta página' : 'También podés escribir una frase exacta'} placeholderTextColor={palette.muted} style={[styles.input, styles.multiline, { color: palette.text, borderColor: palette.line }]} />
            {!pdf && <><Text style={{ color: palette.text, fontWeight: '700' }}>Color del resaltado</Text><View style={styles.row}>{HIGHLIGHT_COLORS.map(color => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Color ${color}`} accessibilityState={{ selected: draftColor === color }} onPress={() => setDraftColor(color)} style={[styles.colorChoice, { backgroundColor: color, borderColor: draftColor === color ? palette.accent : palette.line }]}><Ionicons name={draftColor === color ? 'checkmark' : 'ellipse-outline'} size={22} color="#1F2937" /></Pressable>)}</View></>}
            <Text style={{ color: palette.text, fontWeight: '700' }}>Nota (opcional)</Text>
            <TextInput accessibilityLabel="Nota personal" multiline value={draftNote} onChangeText={setDraftNote} placeholder="¿Por qué te gustó? ¿Qué querés recordar?" placeholderTextColor={palette.muted} style={[styles.input, styles.multiline, { color: palette.text, borderColor: palette.line }]} />
            {!!annotationMessage && <Text accessibilityRole="alert" style={{ color: annotationMessage.includes('guardado') ? palette.accent : '#DC2626' }}>{annotationMessage}</Text>}
            {button(pdf ? 'Guardar nota' : 'Guardar resaltado', saveAnnotation, !draftQuote.trim() && !draftNote.trim())}
          </>}
          {panel === 'contents' && <>
            {!!annotationMessage && <Text accessibilityRole="alert" style={{ color: palette.accent }}>{annotationMessage}</Text>}
            <Text style={{ color: palette.muted }}>MARCADORES</Text>{!marks.length && <Text style={{ color: palette.text }}>Usa el marcador de la cabecera para guardar una página.</Text>}{marks.filter(p => p < total).map(p => <React.Fragment key={p}>{button(`Página ${p + 1}`, () => goTo(p))}</React.Fragment>)}
            <Text style={{ color: palette.muted, marginTop: 8 }}>RESALTADOS Y NOTAS</Text>
            {!annotations.length && <Text style={{ color: palette.text }}>Todavía no guardaste frases ni notas.</Text>}
            {annotations.filter(item => item.page < total).map(item => <View key={item.id} style={[styles.annotationCard, { borderColor: palette.line }]}><Pressable accessibilityRole="button" onPress={() => goTo(item.page)} style={{ flex: 1, gap: 5 }}><Text style={{ color: palette.accent, fontWeight: '700' }}>Página {item.page + 1}</Text>{!!item.quote && <Text style={{ color: '#1F2937', backgroundColor: item.color, padding: 6 }}>“{item.quote}”</Text>}{!!item.note && <Text style={{ color: palette.text }}>{item.note}</Text>}</Pressable>{icon('trash-outline', 'Eliminar anotación', () => setAnnotations(items => items.filter(note => note.id !== item.id)))}</View>)}
            {!pdf && <><TextInput accessibilityLabel="Buscar dentro del libro" placeholder="Buscar una palabra o frase" placeholderTextColor={palette.muted} value={query} onChangeText={setQuery} style={[styles.input, { color: palette.text, borderColor: palette.line }]} /><Text style={{ color: palette.muted }}>{query.trim() ? `${results.length} páginas encontradas` : 'ÍNDICE'}</Text>{(query.trim() ? results : chapters).map(p => <Pressable accessibilityRole="button" key={p.index} onPress={() => goTo(p.index)} style={[styles.button, { borderColor: palette.line }]}><Text style={{ color: palette.accent }}>Página {p.index + 1}</Text><Text numberOfLines={2} style={{ color: palette.text }}>{p.text}</Text></Pressable>)}</>}
          </>}
        </ScrollView>
    </BottomSheet>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  paper: { paddingHorizontal: 26, paddingVertical: 28, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  cornerTop: { position: 'absolute', top: 0, width: 78, height: 78, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  cornerBottom: { position: 'absolute', bottom: 0, width: 78, height: 78, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 17 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  quoteOption: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: 12, justifyContent: 'center' },
  colorChoice: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  annotationCard: { minHeight: 64, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
