import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { searchCatalog } from './catalog';
import { downloadBook } from './downloadBook';
import { parseEpubFromBase64 } from './epub';

export default function CatalogScreen({ navigation, loadBooks, saveBooks }) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [source, setSource] = useState('free');
  const [language, setLanguage] = useState('');
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [download, setDownload] = useState(null);
  const [progress, setProgress] = useState(null);
  const [owned, setOwned] = useState({});
  const request = useRef(null);
  const sequence = useRef(0);
  const transfer = useRef(null);
  const alive = useRef(true);
  const run = async (term, nextPage = 1) => {
    request.current?.abort();
    const id = ++sequence.current;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    if (nextPage === 1) { setBooks([]); setMore(false); }
    try {
      const result = await searchCatalog({ query: term, source, language, page: nextPage, signal: controller.signal });
      if (!alive.current || sequence.current !== id) return;
      setBooks(previous => nextPage === 1 ? result.books : [...previous, ...result.books.filter(b => !previous.some(p => p.id === b.id))]);
      setPage(nextPage); setMore(result.more);
    } catch (e) { if (alive.current && id === sequence.current && !controller.signal.aborted) setError(e.name === 'AbortError' ? 'La búsqueda tardó demasiado. Vuelve a intentarlo.' : e.message); }
    finally { if (alive.current && id === sequence.current) setLoading(false); }
  };
  useEffect(() => { run(submitted); }, [source, language, submitted]);
  useEffect(() => {
    const refresh = () => loadBooks().then(all => { if (alive.current) setOwned(Object.fromEntries(all.map(b => [b.id, b]))); }).catch(() => {});
    refresh(); const unsubscribe = navigation.addListener('focus', refresh);
    return () => { alive.current = false; sequence.current++; request.current?.abort(); transfer.current?.abort(); unsubscribe(); };
  }, []);
  const getBook = async item => {
    if (owned[item.id]) { navigation.navigate('BookDetail', { book: owned[item.id] }); return; }
    if (!item.downloadUrl) { Linking.openURL(item.sourceUrl).catch(() => Alert.alert('No se pudo abrir', 'Inténtalo nuevamente.')); return; }
    if (transfer.current) return;
    const controller = new AbortController(); transfer.current = controller;
    setDownload(item.id); setProgress(0);
    try {
      const book = await downloadBook(item, { fs: FileSystem, parse: parseEpubFromBase64, load: loadBooks, save: saveBooks, signal: controller.signal, onProgress: value => { if (alive.current) setProgress(value); } });
      if (alive.current) { setOwned(old => ({ ...old, [book.id]: book })); Alert.alert('Libro descargado', 'Ya está disponible sin conexión en tu biblioteca.', [{ text: 'Seguir buscando' }, { text: 'Leer', onPress: () => navigation.navigate('Reader', { book }) }]); }
    } catch (e) { if (alive.current && !controller.signal.aborted) Alert.alert('No se pudo descargar', e.message); }
    finally { transfer.current = null; if (alive.current) { setDownload(null); setProgress(null); } }
  };
  const chip = (label, selected, action) => <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={action} style={[styles.chip, selected && styles.selected]}><Text style={styles.text}>{label}</Text></Pressable>;
  return <SafeAreaView style={styles.root}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()} style={styles.icon}><Ionicons name="arrow-back" color="#e6edf7" size={24} /></Pressable><View><Text style={styles.title}>Descubrir libros</Text><Text style={styles.muted}>Buscá por título o autor</Text></View></View>
    <View style={styles.search}><TextInput accessibilityLabel="Buscar título o autor" value={query} onChangeText={setQuery} placeholder="Ej.: Cervantes, Sherlock Holmes…" placeholderTextColor="#96a6bc" style={[styles.text, { flex: 1, minHeight: 48 }]} returnKeyType="search" onSubmitEditing={() => query.trim() === submitted ? run(submitted) : setSubmitted(query.trim())} /><Pressable accessibilityRole="button" accessibilityLabel="Buscar libros" onPress={() => query.trim() === submitted ? run(submitted) : setSubmitted(query.trim())} style={styles.icon}><Ionicons name="search" size={24} color="#9fc5ff" /></Pressable></View>
    <View style={styles.row}>{chip('Descarga gratuita', source === 'free', () => setSource('free'))}{chip('Catálogo general', source === 'all', () => setSource('all'))}</View>
    <View style={styles.row}>{chip('Todos los idiomas', !language, () => setLanguage(''))}{chip('Español', language === 'es', () => setLanguage('es'))}</View>
    <Text style={[styles.muted, { paddingHorizontal: 18, paddingBottom: 12 }]}>{source === 'free' ? 'Gutenberg · EPUB completos · Dominio público en EE.UU.' : 'Open Library · Información y disponibilidad. No todos los títulos permiten descarga.'}</Text>
    {download && <View style={styles.banner}><ActivityIndicator color="#9fc5ff" /><Text style={[styles.text, { flex: 1 }]}>{progress === 100 ? 'Preparando libro…' : `Descargando ${progress == null ? '…' : progress + '%'}`}</Text><Pressable onPress={() => transfer.current?.abort()} accessibilityRole="button" style={styles.chip}><Text style={styles.text}>Cancelar</Text></Pressable></View>}
    <FlatList data={books} keyExtractor={b => b.id} contentContainerStyle={{ padding: 18, gap: 14, flexGrow: 1 }} keyboardShouldPersistTaps="handled" renderItem={({ item }) => <View style={styles.card}>
      {item.cover ? <Image source={{ uri: item.cover }} style={styles.cover} /> : <View style={[styles.cover, { alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="book-outline" size={32} color="#96a6bc" /></View>}
      <View style={{ flex: 1, gap: 6 }}><Text style={[styles.text, { fontWeight: '700', fontSize: 17 }]} numberOfLines={3}>{item.name}</Text><Text style={styles.muted} numberOfLines={2}>{item.author}</Text><Pressable accessibilityRole="button" disabled={!!download && !owned[item.id]} onPress={() => getBook(item)} style={[styles.action, { opacity: download && !owned[item.id] ? 0.45 : 1 }]}><Text style={{ color: '#0a172b', fontWeight: '700' }}>{owned[item.id] ? 'Abrir en biblioteca' : item.downloadUrl ? 'Descargar EPUB' : 'Ver disponibilidad'}</Text></Pressable></View>
    </View>} ListEmptyComponent={!loading && !error ? <View style={{ paddingVertical: 32 }}><Text style={styles.text}>No encontramos libros con esa búsqueda.</Text><Text style={styles.muted}>{source === 'free' ? 'Probá con el autor, quitá el filtro de idioma o consultá el catálogo general.' : 'Probá con otro título o autor.'}</Text></View> : null} ListFooterComponent={<View style={{ gap: 12, paddingVertical: 16 }}>{loading && <ActivityIndicator color="#9fc5ff" />}{!!error && <><Text accessibilityRole="alert" style={styles.text}>{error}</Text>{chip('Reintentar', false, () => run(submitted, books.length ? page + 1 : 1))}</>}{more && !loading && !error && chip('Ver más resultados', false, () => run(submitted, page + 1))}</View>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#0b1220' }, header: { flexDirection: 'row', alignItems: 'center', padding: 10 }, title: { color: '#edf3fc', fontSize: 25, fontWeight: '700' }, text: { color: '#e6edf7', fontSize: 15 }, muted: { color: '#a4b3c8', fontSize: 13, lineHeight: 19 }, icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, search: { margin: 16, marginTop: 8, backgroundColor: '#172337', borderRadius: 16, flexDirection: 'row', paddingLeft: 14 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 }, chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#1c2a40' }, selected: { backgroundColor: '#294f83' }, card: { flexDirection: 'row', gap: 14, backgroundColor: '#142035', borderRadius: 18, padding: 14 }, cover: { width: 78, height: 116, backgroundColor: '#233149', borderRadius: 7 }, action: { minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: '#a8ccff', marginTop: 4 }, banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#21344f' } });
