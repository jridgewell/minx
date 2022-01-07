// @ts-nocheck

function createElement(type, props, ...children) {
  const { key, ref, ..._props } = props ?? {};
  if (children.length > 0) {
    _props.children = children.length === 1 ? children[0] : children;
  }

  return {
    type,
    key,
    ref,
    props: _props,
    constructor: void 0,
  };
}

function Fragment({ children }) {
  return children;
}

export const React = {
  createElement,
  Fragment,
};
