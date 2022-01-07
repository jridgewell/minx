import { unlink, rmdir, opendir } from 'fs/promises';
import { dirname } from 'path';

import fg from 'fast-glob';

/**
 * @param {string} dir
 * @return {Promise<boolean>}
 */
async function isEmpty(dir) {
  const d = await opendir(dir, { bufferSize: 1 });
  const next = await d.read();
  return !next;
}

/**
 * @param {string} outDir
 * @return {Promise<unknown[]>}
 */
export async function cleanup(outDir) {
  const files = await fg('**/*.html', { cwd: outDir, absolute: true });
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
