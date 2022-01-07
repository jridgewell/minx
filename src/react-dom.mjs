import renderToString from 'preact-render-to-string';

/**
 * @param {import('./types').VNode} jsx
 * @return {string}
 */
export function render(jsx) {
  return '<!doctype html>' + renderToString(jsx);
}
