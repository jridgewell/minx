/**
 * @template T
 * @template R
 */
class AsyncIt {
  /**
   * @param {AsyncIterable<T>} iterator
   * @param {(v: T) => Promise<R>} fn
   */
  constructor(iterator, fn) {
    this._it = iterator[Symbol.asyncIterator]();
    this._fn = fn;
  }

  [Symbol.asyncIterator]() {
    return this;
  }

  /**
   * @return {Promise<IteratorResult<R>>}
   */
  async next() {
    const next = await this._it.next();
    if (next.done) return { value: undefined, done: true };

    const value = await this._fn(next.value);
    return { value, done: false };
  }
}

/**
 * @param {AsyncIterable<T>} iterator
 * @param {(v: T) => Promise<R>} fn
 * @return {AsyncIterable<R>}
 * @template T
 * @template R
 */
export function map(iterator, fn) {
  return new AsyncIt(iterator, fn);
}

/**
 * @param {AsyncIterable<T>} iterator
 * @param {number} concurrency
 * @return {Promise<T[]>}
 * @template T
 */
export function toArray(iterator, concurrency) {
  return new Promise((resolve, reject) => {
    const it = iterator[Symbol.asyncIterator]();
    /** @type {T[]} */
    const values = [];
    let i = 0;

    while (i < concurrency) next();

    async function next() {
      const index = i++;
      try {
        const result = await it.next();
        if (result.done) {
          resolve(values);
        } else {
          values[index] = result.value;
          next();
        }
      } catch (e) {
        reject(e);
      }
    }
  });
}
