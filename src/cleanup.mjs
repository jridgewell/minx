import { unlink, rmdir, opendir } from 'fs/promises';
import { dirname, join, extname } from 'path';

import fg from 'fast-glob';

/**
 * @param {string} dir
 * @return {Promise<boolean>}
 */
async function isEmpty(dir) {
  const d = await opendir(dir, { bufferSize: 1 });
  const next = await d.read();
  d.close();
  return !next;
}

/**
 * @param {string} file
 * @return {string}
 */
function removeExtension(file) {
  const ext = extname(file);
  return file.slice(0, -ext.length);
}

/**
 * @param {string} outDir
 * @param {string[]} keeps
 * @return {Promise<string[]>}
 */
async function lookupExcluding(outDir, keeps) {
  const files = await fg('**/*.html', { cwd: outDir });
  const set = new Set(keeps.map(removeExtension));
  return files
    .filter((f) => !set.has(removeExtension(f)))
    .map((f) => join(process.cwd(), outDir, f));
}

/**
 * @param {string} outDir
 * @param {string[]} keeps
 * @return {Promise<unknown[]>}
 */
export async function cleanup(outDir, keeps) {
  const files = await lookupExcluding(outDir, keeps);
  const deletes = files.map((f) => unlink(f));
  await Promise.all(deletes);

  const prunes = files.map((f) => pruneEmptyDirectory(dirname(f)));
  return Promise.all(prunes);
}

/**
 * @param {string} dir
 */
async function pruneEmptyDirectory(dir) {
  while (await isEmpty(dir)) {
    await rmdir(dir);
    dir = dirname(dir);
  }
}
