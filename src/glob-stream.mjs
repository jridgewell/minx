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

