const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const React = require('react');
const { create, act } = require('react-test-renderer');
const babel = require('@babel/core');

let gesture;
const values = [];
class Value {
  constructor(value) { this.value = value; this.history = [value]; values.push(this); }
  setValue(value) { this.value = value; this.history.push(value); }
  stopAnimation() {}
  interpolate() { return this; }
}
const rn = {
  Animated: {
    Value,
    View: 'AnimatedView',
    spring: (value, config) => ({ start(callback) { value.setValue(config.toValue); callback?.({ finished: true }); } }),
    timing: (value, config) => ({ start(callback) { value.setValue(config.toValue); callback?.({ finished: true }); } }),
  },
  Easing: { in: value => value, cubic: value => value },
  Modal: 'Modal', Pressable: 'Pressable', Text: 'Text', View: 'View',
  PanResponder: { create(config) { gesture = config; return { panHandlers: {} }; } },
  StyleSheet: { create: value => value, absoluteFillObject: {} },
  useWindowDimensions: () => ({ width: 375, height: 800 }),
};
const mocks = {
  'react-native': rn,
  'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
};
const path = require('node:path').resolve('src/BottomSheet.js');
const moduleUnderTest = new Module(path, module);
moduleUnderTest.filename = path;
moduleUnderTest.paths = module.paths;
moduleUnderTest.require = name => name in mocks ? mocks[name] : require(name);
moduleUnderTest._compile(babel.transformSync(fs.readFileSync(path, 'utf8'), { filename: path, configFile: false, babelrc: false, presets: ['babel-preset-expo'] }).code, path);
const BottomSheet = moduleUnderTest.exports.default;
global.requestAnimationFrame = callback => callback();

function mount(onClose = () => {}, reducedMotion = false) {
  let view;
  act(() => { view = create(React.createElement(BottomSheet, { visible: true, onClose, title: 'Panel', backgroundColor: '#fff', textColor: '#111', accentColor: '#555', reducedMotion }, React.createElement('Text', null, 'Contenido'))); });
  return view;
}

test('sheet rises from below and follows a downward drag', () => {
  const view = mount();
  const position = values.at(-1);
  assert.equal(position.value, 0);
  assert.deepEqual(position.history.slice(0, 3), [800, 800, 0]);
  assert.equal(gesture.onMoveShouldSetPanResponder({}, { dx: 2, dy: 12 }), true);
  act(() => gesture.onPanResponderMove({}, { dx: 0, dy: 76 }));
  assert.equal(position.value, 76);
  act(() => gesture.onPanResponderRelease({}, { dy: 76, vy: 0.1 }));
  assert.equal(position.value, 0);
  act(() => view.unmount());
});

test('sheet closes after a long or fast downward drag', () => {
  let closes = 0;
  const view = mount(() => closes++);
  act(() => gesture.onPanResponderRelease({}, { dy: 180, vy: 0.2 }));
  assert.equal(closes, 1);
  act(() => view.unmount());
});

test('back button closes immediately when reduced motion is enabled', () => {
  let closes = 0;
  const view = mount(() => closes++, true);
  act(() => view.root.findByType('Modal').props.onRequestClose());
  assert.equal(closes, 1);
  act(() => view.unmount());
});
