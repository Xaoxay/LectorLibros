const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const React = require('react');
const { create, act } = require('react-test-renderer');
const babel = require('@babel/core');

const interpolations = [];
const drag = {
  interpolate(config) {
    interpolations.push(config);
    return `animation-${interpolations.length}`;
  },
};
const mocks = {
  'react-native': {
    Animated: { View: 'AnimatedView' },
    StyleSheet: { create: value => value, absoluteFillObject: { position: 'absolute', inset: 0 } },
    View: 'View',
  },
  'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
};
const filename = path.resolve('src/PageCurl.js');
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = module.paths;
mod.require = name => name in mocks ? mocks[name] : require(name);
mod._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  filename,
  configFile: false,
  babelrc: false,
  presets: ['babel-preset-expo'],
}).code, filename);
const PageCurl = mod.exports.default;

function render(direction) {
  interpolations.length = 0;
  let view;
  act(() => {
    view = create(React.createElement(PageCurl, {
      width: 400,
      direction,
      drag,
      paperColor: '#fffaf0',
      lineColor: '#ddccb0',
      currentPage: React.createElement('CurrentPage'),
      targetPage: React.createElement('TargetPage'),
      panHandlers: { onResponderMove() {} },
    }));
  });
  return view;
}

test('page curl renders both paper faces, destination and layered light', () => {
  const view = render(1);
  assert.equal(view.root.findAllByType('CurrentPage').length, 1);
  assert.equal(view.root.findAllByType('TargetPage').length, 1);
  assert.equal(view.root.findAllByType('LinearGradient').length, 4);
  assert.equal(view.root.findAllByProps({ renderToHardwareTextureAndroid: true }).length, 1);
  assert.ok(interpolations.some(item => item.outputRange.includes('-156deg')));
  assert.ok(interpolations.every(item => item.extrapolate === 'clamp'));
  act(() => view.unmount());
});

test('page curl mirrors its hinge and rotation when returning a page', () => {
  const view = render(-1);
  assert.ok(interpolations.some(item => item.outputRange.includes('156deg')));
  assert.ok(interpolations.some(item => item.inputRange.join(',') === '0,128,288,400'));
  act(() => view.unmount());
});
