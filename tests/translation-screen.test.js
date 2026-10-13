const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const React = require('react');
const { create, act } = require('react-test-renderer');
const babel = require('@babel/core');
const storage = new Map(); const secure = new Map();
const config = { url: 'https://translation.example', token: 'test-client-access' };
const book = { id: 'original', name: 'My Book', author: 'Author', type: 'epub', pages: ['Hello reader'] };
const id = '12345678-1234-1234-1234-123456789abc';
let requests = [], failSubmit = false, serviceReady = true, books = [], navigationCalls = [];
let remote = { id, book: { title: 'My Book' }, status: 'queued', progress: 0, completed: 0, total: 1 };
global.fetch = async (url, options) => {
  requests.push({ url, options });
  if (options.method === 'POST' && url.endsWith('/v1/jobs') && failSubmit) { failSubmit = false; throw new TypeError('network lost'); }
  const data = url.endsWith('/health') ? { translationReady: serviceReady } : url.endsWith('/result') ? { id, pages: ['Hola lector'], sourceLanguage: 'en' } : remote;
  return { ok: true, json: async () => data };
};
const rn = Object.fromEntries(['ActivityIndicator', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name]));
rn.StyleSheet = { create: value => value }; rn.Alert = { alert() {} }; rn.AppState = { currentState: 'active', addEventListener: () => ({ remove() {} }) };
const mocks = {
  'react-native': rn,
  'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  '@react-native-async-storage/async-storage': { getItem: async key => storage.get(key) || null, setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key) },
  'react-native-svg': { __esModule: true, default: 'Svg', Circle: 'Circle' },
  'expo-secure-store': { getItemAsync: async key => secure.get(key) || null, setItemAsync: async (key, value) => secure.set(key, value) },
  'expo-file-system': { documentDirectory: 'file:///private/', makeDirectoryAsync: async () => {}, writeAsStringAsync: async () => {}, deleteAsync: async () => {} },
  './translationClient': require('../src/translationClient'), './designTheme': require('../src/designTheme'),
};
const filename = require('node:path').resolve('src/TranslationScreen.js');
const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
mod.require = name => name in mocks ? mocks[name] : require(name);
mod._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, configFile: false, babelrc: false, presets: ['babel-preset-expo'] }).code, filename);
const TranslationScreen = mod.exports.default;
const flush = () => new Promise(resolve => setImmediate(resolve));
async function mount(connected = true) {
  storage.clear(); secure.clear(); requests = []; books = [book]; navigationCalls = []; failSubmit = false; serviceReady = true;
  remote = { id, status: 'queued', progress: 0, completed: 0, total: 1 };
  if (connected) secure.set('translation-service-config', JSON.stringify(config));
  let view; await act(async () => { view = create(React.createElement(TranslationScreen, { route: { params: { book } }, navigation: { goBack() {}, navigate: (...args) => navigationCalls.push(args) }, loadBooks: async () => books, mutateBooks: async fn => books = fn(books) })); await flush(); });
  return view;
}
function button(view, text) { const label = view.root.findAllByType('Text').find(item => item.children.join('') === text); assert.ok(label, text); return label.parent; }
async function press(view, text) { await act(async () => { button(view, text).props.onPress(); await flush(); }); }
test('configuration cannot be saved before the translation provider is ready', async () => {
  const view = await mount(false); serviceReady = false;
  await act(async () => { view.root.findByProps({ accessibilityLabel: 'Dirección del servicio' }).props.onChangeText(config.url); view.root.findByProps({ accessibilityLabel: 'Clave de acceso del lector' }).props.onChangeText(config.token); });
  await press(view, 'Comprobar y guardar conexión'); assert.equal(secure.size, 0);
  serviceReady = true; await press(view, 'Comprobar y guardar conexión'); assert.equal(secure.size, 1);
  assert.ok(button(view, 'Traducir libro completo')); assert.equal(requests.filter(request => request.options.method === 'POST').length, 0);
  await act(async () => view.unmount());
});
test('a failed submission retries the same request id and never submits without an explicit press', async () => {
  const view = await mount(); assert.equal(requests.length, 0); failSubmit = true;
  await press(view, 'Traducir libro completo'); const first = JSON.parse(requests[0].options.body).requestId;
  await press(view, 'Traducir libro completo'); const second = JSON.parse(requests[1].options.body).requestId;
  assert.equal(first, second); assert.ok(button(view, 'Pausar traducción'));
  const saved = JSON.parse(storage.get('translation-job:' + config.url + ':' + book.id)); assert.equal(saved.id, id);
  await act(async () => view.unmount());
});
test('completed jobs install a separate readable copy and preserve the original', async () => {
  const view = await mount(); remote = { ...remote, status: 'completed', progress: 100, completed: 1 };
  await press(view, 'Traducir libro completo'); await press(view, 'Guardar traducción y leer');
  assert.equal(books.length, 2); assert.equal(books[1], book); assert.equal(books[0].translation.sourceBookId, book.id);
  await press(view, 'Guardar traducción y leer');
  assert.equal(requests.filter(request => request.url.endsWith('/result')).length, 1);
  assert.equal(navigationCalls[0][0], 'Reader'); assert.equal(navigationCalls[0][1].book.id, 'translated_' + id);
  await act(async () => view.unmount());
});
