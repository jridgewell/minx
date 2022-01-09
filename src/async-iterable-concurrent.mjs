/**
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
 * @param {AsyncIterable<T>[]} iterables
 * @return {AsyncIterable<T>}
 * @template T
 */
export function interleave(iterables) {
  return new InterleavedIt(iterables);
}

/**
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
