/**
 * @fileoverview This provides several primitives to create and control async
 * iterables.
 *
 * Why not use a simple async generator function? Because they queue, so that
 * the next result has to wait until all previous results have resolved. This
 * is commonly called back-pressure, because the consumer wants values that the
 * producer can't generate yet.
 */

/**
 * MapIt maps the output of the source iterable, generating a new iterable of
 * the mapped outputs.
 *
 * @template T
 * @template R
 */
class MapIt {
  /**
   * @param {AsyncIterable<T>} iterable
   * @param {(v: T) => R|Promise<R>} fn
   */
  constructor(iterable, fn) {
    this._it = iterable[Symbol.asyncIterator]();
    this._fn = fn;
    this._done = false;
  }

  [Symbol.asyncIterator]() {
    return this;
  }

  /**
   * @return {Promise<IteratorResult<R>>}
   */
  async next() {
    if (this._done) return { value: undefined, done: true };
    const next = await this._it.next();

    if (next.done) {
      this._done = true;
      return { value: undefined, done: true };
    }

    const value = await this._fn(next.value);
    return { value, done: false };
  }
}

/**
 * InterleavedIt takes several async iterables, and interleaves the results so
 * that subsequent iterators can be called before the first iterator is fully
 * consumed.
 *
 * @template T
 */
class InterleavedIt {
  /**
   * @param {AsyncIterable<T>[]} iterables
   */
  constructor(iterables) {
    /** @type {Array<AsyncIterator<T> | null>} */
    this._its = iterables.map((it) => it[Symbol.asyncIterator]());
    this._index = 0;
    this._done = false;
  }

  [Symbol.asyncIterator]() {
    return this;
  }

  /**
   * @return {Promise<IteratorResult<T>>}
   */
  async next() {
    if (this._done) return { value: undefined, done: true };
    let i = this._nextIndex();
    if (i === -1) {
      this._done = true;
      return { value: undefined, done: true };
    }

    const its = this._its;
    const it = /** @type {AsyncIterator<T>} */ (its[i]);
    const result = await it.next();

    if (result.done) {
      its[i] = null;
      return this.next();
    }
    return result;
  }

  /**
   * @return number
   */
  _nextIndex() {
    let { _its: its, _index: index } = this;
    let old = index++;
    for (; index < its.length; index++) {
      if (its[index]) return (this._index = index);
    }
    for (index = 0; index <= old; index++) {
      if (its[index]) return (this._index = index);
    }
    return -1;
  }
}

/**
 * Maps an async iterable into a new async iterable.
 *
 * @param {AsyncIterable<T>} iterable
 * @param {(v: T) => R|Promise<R>} fn
 * @return {AsyncIterable<R>}
 * @template T
 * @template R
 */
export function map(iterable, fn) {
  return new MapIt(iterable, fn);
}

/**
 * Interlaves multiple async iterables together.
 *
 * @param {AsyncIterable<T>[]} iterables
 * @return {AsyncIterable<T>}
 * @template T
 */
export function interleave(iterables) {
  return new InterleavedIt(iterables);
}

/**
 * Consumes an async iterable with a set amount of concurrency. This is only
 * useful when we're consuming from an iterable that doesn't have backpressure,
 * or when we can consume from an interleaved iterable.
 *
 * For instance, when using a MapIt that has a slow map, we can still achieve
 * concurrent reads as long as the source iterable is faster than the map.
 *
 * @param {AsyncIterable<T>} iterable
 * @param {number} concurrency
 * @return {Promise<void>}
 * @template T
 */
export function forEach(iterable, concurrency) {
  return new Promise((resolve, reject) => {
    const it = iterable[Symbol.asyncIterator]();
    let done = false;
    for (let c = 0; c < concurrency; c++) next();

    async function next() {
      if (done) return;
      try {
        const result = await it.next();

        if (done) return;
        if (result.done) {
          done = true;
          resolve();
        } else {
          next();
        }
      } catch (e) {
        done = true;
        reject(e);
      }
    }
  });
}
