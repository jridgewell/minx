import hljs from 'https://cdn.skypack.dev/pin/highlight.js@v11.4.0-Bo6djeMRU9u03QLsHHfL/mode=imports,min/optimized/highlightjs/lib/core.js';
import ts from 'https://cdn.skypack.dev/pin/highlight.js@v11.4.0-Bo6djeMRU9u03QLsHHfL/mode=imports,min/optimized/highlightjs/lib/languages/typescript.js';

hljs.registerLanguage('javascript', ts);

if (document.readyState !== 'loading') {
  run();
} else {
  document.addEventListener('DOMContentLoaded', run);
}

function run() {
  hljs.initHighlighting();
}
