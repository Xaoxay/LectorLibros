import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import Svg, { Circle } from 'react-native-svg';
import { LANGUAGES, createTranslationClient, saveTranslatedBook, serviceUrl } from './translationClient';
import { palette as c } from './designTheme';

const configKey = 'translation-service-config';
const jobKey = (url, book) => 'translation-job:' + url + ':' + book.id;
const newRequestId = () => 'request_' + Date.now() + '_' + Math.random().toString(36).slice(2, 12);
const labels = { queued: 'En espera', running: 'Trabajando en tu libro', paused: 'Traducción pausada', failed: 'Necesitamos reintentar', completed: 'Tu traducción está lista', cancelled: 'Traducción cancelada' };

export default function TranslationScreen({ route, navigation, loadBooks, mutateBooks, bottomBar }) {
  const [book, setBook] = useState(route.params?.book || null);
  const [books, setBooks] = useState([]);
  const [config, setConfig] = useState(null);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [settings, setSettings] = useState(!!route.params?.openSettings);
  const [source, setSource] = useState('auto');
  const [job, setJob] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const mounted = useRef(true);
  const lock = useRef(false);
  const sequence = useRef(0);
  const pending = useRef(null);

  useEffect(() => {
    mounted.current = true;
    Promise.all([SecureStore.getItemAsync(configKey), loadBooks()]).then(([raw, all]) => {
      if (!mounted.current) return;
      if (raw) { const saved = JSON.parse(raw); serviceUrl(saved.url); setConfig(saved); setUrl(saved.url); setToken(saved.token || ''); }
      setBooks(all.filter(item => !item.translation));
    }).catch(() => { if (mounted.current) setMessage('No pudimos recuperar la configuración o la biblioteca. Podés reintentar desde esta pantalla.'); }).finally(() => { if (mounted.current) setReady(true); });
    const subscription = AppState.addEventListener('change', value => setForeground(value === 'active'));
    return () => { mounted.current = false; sequence.current++; subscription.remove(); };
  }, []);
  useEffect(() => { if (route.params?.book) setBook(route.params.book); }, [route.params?.book?.id]);
  useEffect(() => { if (route.params?.openSettings) setSettings(true); }, [route.params?.openSettings]);

  useEffect(() => {
    const current = ++sequence.current;
    setJob(null); setMessage(''); pending.current = null;
    if (!config || !book) return;
    AsyncStorage.getItem(jobKey(config.url, book)).then(raw => {
      if (!raw || current !== sequence.current || !mounted.current) return;
      const saved = JSON.parse(raw); pending.current = saved;
      if (saved.id) return createTranslationClient(config, { fs: FileSystem }).status(saved.id).then(value => { if (mounted.current && current === sequence.current) setJob(value); });
      setMessage('El envío anterior no se confirmó. Reintentá para recuperar el trabajo sin duplicarlo.');
    }).catch(error => { if (mounted.current && current === sequence.current) setMessage(error.message || 'No pudimos recuperar la traducción.'); });
  }, [config?.url, config?.token, book?.id]);

  useEffect(() => {
    if (!config || !job?.id || !foreground || !['queued', 'running'].includes(job.status)) return;
    let cancelled = false; let timer;
    const current = sequence.current;
    async function poll() {
      try {
        const next = await createTranslationClient(config).status(job.id);
        if (!cancelled && mounted.current && current === sequence.current) { setJob(next); setMessage(''); }
      } catch { if (!cancelled && mounted.current) setMessage('Se interrumpió la conexión. El servicio conserva el progreso; volveremos a consultar.'); }
      if (!cancelled) timer = setTimeout(poll, 5000);
    }
    timer = setTimeout(poll, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [job?.id, job?.status, config?.url, config?.token, foreground]);

  async function action(operation) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try { await operation(); }
    catch (error) { if (mounted.current) setMessage(error.message || 'No se pudo completar esta operación.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  const connect = () => action(async () => {
    const next = { url: serviceUrl(url), token: token.trim() };
    if (job && ['queued', 'running'].includes(job.status) && (config?.url !== next.url || config?.token !== next.token)) throw new Error('Pausá tu traducción antes de cambiar el servicio o la clave de acceso.');
    const health = await createTranslationClient(next).health();
    if (!health.translationReady) throw new Error('El servicio está conectado, pero su administrador todavía debe configurar la API de traducción.');
    await SecureStore.setItemAsync(configKey, JSON.stringify(next));
    if (mounted.current) { setConfig(next); setSettings(false); setMessage('Servicio conectado.'); }
  });
  const start = () => action(async () => {
    if (!book || !config) return;
    const requestId = pending.current?.requestId || newRequestId();
    const selectedSource = pending.current?.sourceLanguage || source;
    const saved = { requestId, sourceLanguage: selectedSource };
    await AsyncStorage.setItem(jobKey(config.url, book), JSON.stringify(saved));
    pending.current = saved;
    const next = await createTranslationClient(config, { fs: FileSystem }).start(book, selectedSource, requestId);
    saved.id = next.id;
    await AsyncStorage.setItem(jobKey(config.url, book), JSON.stringify(saved));
    if (mounted.current) setJob(next);
  });
  const control = kind => action(async () => {
    const next = await createTranslationClient(config).control(job.id, kind);
    if (kind === 'cancel') { await AsyncStorage.removeItem(jobKey(config.url, book)); pending.current = null; }
    if (mounted.current) setJob(next);
  });
  const receive = () => action(async () => {
    const existing = (await loadBooks()).find(item => item.translation?.jobId === job.id);
    if (existing) { if (mounted.current) navigation.navigate('Reader', { book: existing }); return; }
    const translated = await saveTranslatedBook(book, await createTranslationClient(config).result(job.id), { fs: FileSystem, mutate: mutateBooks });
    if (mounted.current) navigation.navigate('Reader', { book: translated });
  });
  const button = (title, onPress, primary = false, disabled = false) => <Pressable accessibilityRole="button" disabled={busy || disabled} accessibilityState={{ disabled: busy || disabled }} onPress={onPress} style={({ pressed }) => [s.button, primary && s.primary, { opacity: busy || disabled ? 0.45 : pressed ? 0.7 : 1 }]}><Text style={[s.buttonText, primary && { color: '#FFF9F0' }]}>{title}</Text></Pressable>;
  if (!ready) return <SafeAreaView style={s.root}><ActivityIndicator color={c.accent} style={{ flex: 1 }} /></SafeAreaView>;
  return <SafeAreaView style={s.root}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.top}><Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()} style={s.icon}><Ionicons name="arrow-back" size={23} color={c.text} /></Pressable><Text style={s.eyebrow}>TU LIBRO, EN ESPAÑOL</Text><Pressable accessibilityRole="button" accessibilityLabel="Configurar servicio de traducción" onPress={() => setSettings(value => !value)} style={s.icon}><Ionicons name="settings-outline" size={22} color={c.text} /></Pressable></View>
      <Text style={s.title}>{settings ? 'Conectar traducción.' : job && job.status !== 'cancelled' ? 'Las buenas historias merecen tiempo.' : 'Historias sin fronteras.'}</Text>
      <Text style={s.subtitle}>{settings ? 'La clave de acceso conecta tu app al servicio que realiza las traducciones.' : 'Una copia en español latino, con tu libro original siempre a salvo.'}</Text>
      {settings || !config ? <View style={s.card}>
        <Text style={s.section}>SERVICIO DE TRADUCCIÓN</Text>
        <Text style={s.body}>Para traducir necesitás un servicio conectado. La clave de OpenAI se configura en el servidor; aquí va la clave de acceso de tu lector.</Text>
        <Text style={s.field}>Dirección del servicio</Text><TextInput accessibilityLabel="Dirección del servicio" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://tu-servicio.example" placeholderTextColor={c.textMuted} style={s.input} />
        <Text style={s.field}>Clave de acceso del lector</Text><TextInput accessibilityLabel="Clave de acceso del lector" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} secureTextEntry placeholder="Clave proporcionada por el administrador" placeholderTextColor={c.textMuted} style={s.input} />
        {button('Comprobar y guardar conexión', connect, true)}
        {!!config && button('Volver a mi libro', () => setSettings(false))}
      </View> : <>
        {!book ? <><Text style={s.section}>ELEGÍ UN LIBRO DE TU BIBLIOTECA</Text>{books.map(item => <Pressable accessibilityRole="button" key={item.id} onPress={() => setBook(item)} style={s.bookRow}><Ionicons name="book-outline" size={24} color={c.accent} /><View style={{ flex: 1 }}><Text style={s.bookTitle}>{item.name}</Text><Text style={s.small}>{item.author || 'Libro importado'} · {(item.type || '').toUpperCase()}</Text></View><Ionicons name="chevron-forward" color={c.textMuted} size={18} /></Pressable>)}{!books.length && <Text style={s.body}>Importá un PDF o EPUB para crear una traducción.</Text>}{button('Importar un libro', () => navigation.navigate('Upload'))}</> : <>
          <View style={s.bookRow}><View style={s.bookIcon}><Ionicons name="book-outline" size={28} color={c.onForest} /></View><View style={{ flex: 1 }}><Text style={s.bookTitle}>{book.name}</Text><Text style={s.small}>{(book.type || '').toUpperCase()} · Original</Text></View></View>
          {(!job || job.status === 'cancelled') ? <>
            <Text style={s.section}>IDIOMA DEL LIBRO</Text><View style={s.languages}>{LANGUAGES.map(item => <Pressable key={item.code} accessibilityRole="button" accessibilityState={{ selected: source === item.code }} disabled={!!pending.current} onPress={() => setSource(item.code)} style={[s.language, source === item.code && s.selected]}><Text style={[s.body, source === item.code && { color: c.accent }]}>{item.label}</Text></Pressable>)}</View>
            <Text style={s.section}>TRADUCIR A</Text><View style={s.destination}><Text style={s.body}>Español latino</Text><Ionicons name="checkmark" size={20} color={c.accent} /></View>
            <Text style={s.body}>El servicio traducirá y revisará cada fragmento. Los libros largos pueden llevar tiempo y el proveedor puede cobrar por su uso.</Text>
            <Text style={[s.body, { marginVertical: 16 }]}>Al continuar, el texto de tu EPUB o el archivo PDF se enviará al servicio y a su proveedor de traducción. La copia traducida conservará el texto, no la maquetación original.</Text>
            {button('Traducir libro completo', start, true)}
          </> : <>
            <View style={s.progressBox}>
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.max(0, Math.min(100, Number(job.progress) || 0)) }} style={s.ring}>
                <Svg width={180} height={180} viewBox="0 0 180 180"><Circle cx="90" cy="90" r="78" fill="none" stroke={c.border} strokeWidth="7" /><Circle cx="90" cy="90" r="78" fill="none" stroke={c.accent} strokeWidth="7" strokeDasharray={490.09} strokeDashoffset={490.09 * (1 - Math.max(0, Math.min(100, Number(job.progress) || 0)) / 100)} rotation="-90" origin="90, 90" /></Svg>
                <View pointerEvents="none" style={s.ringText}><Text style={s.percentage}>{Math.max(0, Math.min(100, Number(job.progress) || 0))}%</Text><Text style={s.small}>TEXTO REVISADO</Text></View>
              </View>
              <Text accessibilityLiveRegion="polite" style={s.bookTitle}>{labels[job.status] || 'Consultando estado'}</Text>
              <Text style={s.small}>{job.completed} de {job.total} fragmentos revisados</Text><Text style={s.small}>{job.phase === 'reviewing' ? 'Revisando sentido, nombres y estilo' : job.phase === 'translating' ? 'Traduciendo el siguiente fragmento' : ''}</Text>
            </View>
            <View style={s.quality}><Ionicons name="shield-checkmark-outline" size={22} color={c.success} /><Text style={[s.body, { flex: 1 }]}>El original está guardado. El servicio conserva cada fragmento completado para poder reanudar.</Text></View>
            {!!job.error && <Text accessibilityRole="alert" style={s.error}>{job.error}</Text>}
            {['queued', 'running'].includes(job.status) && button('Pausar traducción', () => control('pause'))}
            {['paused', 'failed'].includes(job.status) && button('Reanudar desde el último fragmento', () => control('resume'), true)}
            {job.status === 'completed' && <Text style={s.body}>Guardá la copia en tu biblioteca. El servicio conserva el resultado durante siete días; una vez guardado, podrás leerlo sin conexión.</Text>}
            {job.status === 'completed' && button('Guardar traducción y leer', receive, true)}
            {job.status !== 'completed' && button('Cancelar traducción', () => Alert.alert('Cancelar traducción', 'Se descartará el trabajo traducido en el servicio. Tu libro original se conserva.', [{ text: 'Seguir traduciendo', style: 'cancel' }, { text: 'Cancelar traducción', style: 'destructive', onPress: () => control('cancel') }]))}
            {button('Volver a la biblioteca', () => navigation.navigate('Library'))}
          </>}
        </>}
      </>}
      {busy && <ActivityIndicator color={c.accent} style={{ marginTop: 14 }} />}
      {!!message && <Text accessibilityRole="alert" style={s.message}>{message}</Text>}
    </ScrollView>{bottomBar}
  </SafeAreaView>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg }, content: { padding: 22, paddingBottom: 100 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, color: c.textMuted, fontWeight: '700' }, title: { fontFamily: 'serif', fontSize: 34, lineHeight: 39, color: c.text, marginBottom: 12 }, subtitle: { color: c.textMuted, fontSize: 15, lineHeight: 23, marginBottom: 22 },
  card: { backgroundColor: c.bgCard, borderColor: c.border, borderWidth: 1, borderRadius: 18, padding: 18 }, body: { color: c.textMuted, fontSize: 14, lineHeight: 22 }, small: { color: c.textMuted, fontSize: 12, lineHeight: 20 }, section: { color: c.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginTop: 20, marginBottom: 12 },
  field: { color: c.text, fontSize: 13, marginTop: 16, marginBottom: 8 }, input: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, color: c.text, fontSize: 14 },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: c.bgCard, borderColor: c.border, borderWidth: 1, borderRadius: 15, marginBottom: 12 }, bookIcon: { width: 52, height: 72, borderRadius: 6, backgroundColor: c.forest, alignItems: 'center', justifyContent: 'center' }, bookTitle: { fontFamily: 'serif', fontSize: 19, color: c.text, lineHeight: 25 },
  languages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }, language: { minHeight: 48, minWidth: 100, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgCard, borderRadius: 12 }, selected: { borderColor: c.accent, backgroundColor: c.accentGlow }, destination: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, borderRadius: 12, marginBottom: 22 },
  button: { minHeight: 48, padding: 14, borderWidth: 1, borderColor: c.border, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, primary: { backgroundColor: c.accent, borderColor: c.accent }, buttonText: { color: c.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  progressBox: { alignItems: 'center', paddingVertical: 20, gap: 8 }, ring: { width: 180, height: 180, marginBottom: 18 }, ringText: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }, percentage: { fontFamily: 'serif', fontSize: 46, color: c.text, marginBottom: 4 }, track: { height: 5, width: '100%', backgroundColor: c.border, borderRadius: 4, overflow: 'hidden', marginVertical: 16 }, bar: { height: 5, backgroundColor: c.accent }, quality: { flexDirection: 'row', gap: 12, backgroundColor: c.bgElevated, padding: 16, borderRadius: 14, marginBottom: 15 }, error: { color: c.danger, fontSize: 14, lineHeight: 22, marginBottom: 12 }, message: { color: c.text, fontSize: 14, lineHeight: 22, paddingVertical: 16 },
});
