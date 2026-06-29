import { Text, TextInput } from 'react-native';

// Makes Anton the default font for every <Text>/<TextInput> in the app,
// without touching every screen's styles. This project compiles JSX with
// the automatic runtime (babel-preset-expo), so JSX compiles to jsx()/
// jsxs() calls from react/jsx-runtime — NOT React.createElement — which is
// what we have to patch. Any component that sets its own fontFamily (e.g.
// the Coubra wordmark) still wins, since this default is merged in BEFORE
// the component's own style in the array.
let patched = false;

function wrapFactory(original: any, fontFamily: string) {
  return function (type: any, props: any, ...rest: any[]) {
    if ((type === Text || type === TextInput) && props) {
      props = { ...props, style: [{ fontFamily }, props.style] };
    }
    return original(type, props, ...rest);
  };
}

export function applyGlobalFont(fontFamily: string) {
  if (patched) return;
  patched = true;

  try {
    const jsxRuntime = require('react/jsx-runtime');
    jsxRuntime.jsx = wrapFactory(jsxRuntime.jsx, fontFamily);
    jsxRuntime.jsxs = wrapFactory(jsxRuntime.jsxs, fontFamily);
  } catch {}

  try {
    const jsxDevRuntime = require('react/jsx-dev-runtime');
    jsxDevRuntime.jsxDEV = wrapFactory(jsxDevRuntime.jsxDEV, fontFamily);
  } catch {}

  // Belt and suspenders for any code still using the classic runtime
  // (React.createElement directly).
  try {
    const React = require('react');
    React.createElement = wrapFactory(React.createElement, fontFamily);
  } catch {}
}
