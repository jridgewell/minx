import { mkdir } from 'fs/promises';
import { dirname, extname } from 'path';

/**
 * @param {string} file
 * @return {Promise<unknown>}
 */
export function ensureDir(file) {
  const dirpath = dirname(file);
  return mkdir(dirpath, { recursive: true });
}

/**
 * @param {string} file
 * @param {string} ext
 * @return {string}
 */
export function replaceExt(file, ext) {
  const e = extname(file);
  return file.slice(0, -e.length) + ext;
}
