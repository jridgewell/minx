import esbuild from 'esbuild';
import { URL } from 'url';

/**
 * @param {string} contents
 * @param {string} file
 * @return {string}
 */
export function transformContentsSync(contents, file) {
  const result = esbuild.buildSync({
    stdin: {
      contents,
      sourcefile: file,
      loader: 'jsx',
    },
    inject: [new URL('./react.mjs', import.meta.url).pathname],
    bundle: false,
    write: false,
    sourcemap: 'inline',
  });
  return result.outputFiles[0].text;
}
