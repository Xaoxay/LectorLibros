const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const React = require('react');
const { create, act } = require('react-test-renderer');
const babel = require('@babel/core');
const store = new Map();
let gesture;
let deferAnimation = false;
let animations = [];
const Value = class { setValue() {} stopAnimation() {} interpolate() { return 0; } };
const rn = Object.fromEntries(['ActivityIndicator','Modal','Pressable','ScrollView','StatusBar','Text','TextInput','View'].map(k => [k,k]));
Object.assign(rn, {
 AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({remove(){}}) },
 Animated: { Value, View: 'AnimatedView', timing: () => ({start: cb => deferAnimation ? animations.push(cb) : cb?.({finished:true})}), spring: () => ({start: cb => cb?.({finished:true})}) },
 Easing: {out: x => x, cubic: x => x},
 Linking: {openURL: async () => {}},
 PanResponder: {create: config => { gesture = config; return {panHandlers:{}}; }},
 StyleSheet: {create: x => x, absoluteFillObject: {}, hairlineWidth: 1},
 useWindowDimensions: () => ({width:375,height:812}),
});
const mocks = {
 'react-native': rn,
 'react-native-safe-area-context': {SafeAreaView:'SafeAreaView'},
 '@expo/vector-icons': {Ionicons:'Ionicons'},
 '@react-native-async-storage/async-storage': {getItem: async k => store.get(k)||null, setItem: async(k,v) => store.set(k,v)},
 'react-native-pdf':'Pdf',
 'expo-file-system': {readAsStringAsync: async () => JSON.stringify(['Uno','Dos','Tres'])},
};
const path = require('node:path').resolve('src/Reader.js');
const mod = new Module(path, module);
mod.filename=path; mod.paths=module.paths;
mod.require = name => name in mocks ? mocks[name] : require(name);
mod._compile(babel.transformSync(fs.readFileSync(path,'utf8'), {filename:path,configFile:false,babelrc:false,presets:['babel-preset-expo']}).code,path);
const Reader=mod.exports.default;
global.requestAnimationFrame = cb => cb();
const book={id:'test',name:'Prueba',pages:['Capítulo 1\nUno','Dos','Capítulo 2\nTres'],type:'epub'};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function mount(b=book) {let view; await act(async()=>{view=create(React.createElement(Reader,{route:{params:{book:b}},navigation:{goBack(){}}})); await flush();});return view;}
async function press(view,label) {await act(async()=>{const target=view.root.findAllByProps({accessibilityLabel:label}).find(n=>n.type==='Pressable'); assert.ok(target,label); assert.ok(!target.props.disabled,`${label} enabled`); target.props.onPress(); await flush();});}
function state(){return JSON.parse(store.get('reader:test'));}
test('reader advances repeatedly, reverses gestures and stops at boundaries', async()=>{
 store.clear(); const view=await mount();
 await press(view,'Página siguiente'); assert.equal(state().page,1);
 await act(async()=>{gesture.onPanResponderRelease({}, {dx:-120,vx:-1}); await flush();}); assert.equal(state().page,2);
 await act(async()=>{gesture.onPanResponderRelease({}, {dx:120,vx:1}); await flush();}); assert.equal(state().page,1);
 await press(view,'Página anterior'); assert.equal(state().page,0);
 await act(async()=>{gesture.onPanResponderRelease({}, {dx:120,vx:1}); await flush();}); assert.equal(state().page,0);
 await act(async()=>view.unmount());
});
test('position, bookmarks and preferences survive reopening', async()=>{
 store.clear(); let view=await mount();
 await press(view,'Página siguiente'); await press(view,'Marcar esta página');
 assert.deepEqual(state().bookmarks,[1]);
 await act(async()=>view.unmount()); view=await mount();
 assert.equal(state().page,1); assert.deepEqual(state().bookmarks,[1]);
 await press(view,'Marcar esta página'); assert.deepEqual(state().bookmarks,[]);
 await act(async()=>view.unmount());
});
test('loads imported content from disk and clamps stale saved position', async()=>{
 store.clear();store.set('reader:test',JSON.stringify({page:999,bookmarks:[]}));
 const view=await mount({...book,pages:undefined,contentUri:'file:///books/test.json'});
 assert.equal(state().page,2); assert.equal(state().progress,100);
 await act(async()=>view.unmount());
});
test('vertical scrolling does not trigger a page turn', async()=>{
 store.clear();const view=await mount();
 assert.equal(gesture.onStartShouldSetPanResponder(),false);
 assert.equal(gesture.onMoveShouldSetPanResponder({}, {dx:20,dy:100}),false);
 assert.equal(gesture.onMoveShouldSetPanResponder({}, {dx:70,dy:10}),true);
 assert.equal(gesture.onMoveShouldSetPanResponderCapture({}, {dx:20,dy:100}),false);
 assert.equal(gesture.onMoveShouldSetPanResponderCapture({}, {dx:70,dy:10}),true);
 await act(async()=>view.unmount());
});
test('PDF restores saved page and waits for native load before saving', async()=>{
 store.clear();store.set('reader:test',JSON.stringify({page:4,bookmarks:[2]}));
 const view=await mount({...book,type:'pdf',url:'file:///test.pdf'});
 let native=view.root.findByType('Pdf'); assert.equal(native.props.page,5);
 await act(async()=>{native.props.onPageChanged(1,10);await flush();});
 assert.equal(state().page,4);
 native=view.root.findByType('Pdf');
 await act(async()=>{native.props.onLoadComplete(10);await flush();});
 assert.equal(state().page,4);
 native=view.root.findByType('Pdf');
 await act(async()=>{native.props.onPageChanged(6,10);await flush();});
 assert.equal(state().page,5); assert.equal(state().progress,60);
 await act(async()=>view.unmount());
});
test('reader uses stored theme and font size', async()=>{
 store.clear();store.set('reader:settings',JSON.stringify({theme:'dark',fontSize:26,motion:false}));
 const view=await mount();
 assert.equal(view.root.findByType('StatusBar').props.barStyle,'light-content');
 assert.ok(view.root.findAllByType('Text').some(n=>n.props.style?.fontSize===26));
 await press(view,'Página siguiente');assert.equal(state().page,1);
 await act(async()=>view.unmount());
});

test('rapid gestures cannot interrupt an active page transition', async()=>{
 store.clear();const view=await mount();deferAnimation=true;animations=[];
 await press(view,'Página siguiente');
 assert.equal(state().page,0);assert.equal(animations.length,1);
 await act(async()=>{gesture.onPanResponderRelease({}, {dx:-150,vx:-1});await flush();});
 assert.equal(animations.length,1);
 await act(async()=>{animations.shift()({finished:true});await flush();});
 assert.equal(state().page,1);
 await press(view,'Página siguiente');
 await act(async()=>{animations.shift()({finished:false});await flush();});
 assert.equal(state().page,1);
 deferAnimation=false;
 await press(view,'Página siguiente');assert.equal(state().page,2);
 await act(async()=>view.unmount());
});
