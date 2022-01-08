import { extname } from 'path';

import esbuild from 'esbuild';

/**
 * @param {string} file
 * @return {string}
 */
export function transformSync(file) {
  const result = esbuild.buildSync({
    entryPoints: [file],
    loader: { [extname(file)]: 'tsx' },
    bundle: false,
    write: false,
    sourcemap: 'inline',
  });
  return result.outputFiles[0].text;
}
