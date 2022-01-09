import {
  mkdir,
  writeFile as _writeFile,
  copyFile as _copyFile,
} from 'fs/promises';
import { dirname, extname, join } from 'path';
import fg from 'fast-glob';

/**
 * For some reason TS won't allow using a ReadableStream as an AsyncIterable.
 *
 * @param {Parameters<fg>[0]} glob
 * @param {Parameters<fg>[1]} opts
 */
export function globStream(glob, opts) {
  return /** @type {AsyncIterable<string>} */ (fg.stream(glob, opts));
}

/**
 * Writes the contents to dest, ensuring the destination file's directory
 * exists before doing so.
 *
 * @param {string} dest
 * @param {string} contents
 * @return {Promise<void>}
 */
export async function writeFile(dest, contents) {
  await ensureDir(dest);
  return _writeFile(dest, contents);
}

/**
 * Copies the src to dest, ensuring the destination file's directory exists
 * before doing so.
 *
 * @param {string} src
 * @param {string} dest
 * @return {Promise<void>}
 */
export async function copyFile(src, dest) {
  await ensureDir(dest);
  return _copyFile(src, dest);
}

/**
 * @param {string} file
 * @return {Promise<unknown>}
 */
function ensureDir(file) {
  const dirpath = dirname(file);
  return mkdir(dirpath, { recursive: true });
}

/**
 * Replaces the file extension of the file.
 *
 * @param {string} file
 * @param {string} ext
 * @return {string}
 */
export function replaceExt(file, ext) {
  const e = extname(file);
  return file.slice(0, -e.length) + ext;
}

/**
 * Resolves the full path of a file relative to an importing file's directory.
 *
 * @param {string} importer
 * @param {string} specifier
 * @return {string}
 */
export function resolve(importer, specifier) {
  return join(dirname(importer), specifier);
}
