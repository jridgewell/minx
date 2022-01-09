import renderToString from 'preact-render-to-string';

/** @type {import('./types').VNode} */
let VNode;

/**
 * @param {VNode} jsx
 * @param {boolean | string} pretty
 * @return {string}
 */
export function render(jsx, pretty) {
  let output = '<!doctype html>';
  if (pretty) output += '\n';
  return output + renderToString(jsx, null, { pretty });
}
