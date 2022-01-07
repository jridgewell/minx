import esbuild from 'esbuild';

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
    bundle: false,
    write: false,
    sourcemap: 'inline',
  });
  return result.outputFiles[0].text;
}
