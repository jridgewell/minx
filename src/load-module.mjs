import vm from 'vm';
import { join, resolve, dirname } from 'path';
import { watch } from 'fs/promises';

import * as React from 'preact';

import { transformSync } from './esbuild.mjs';

/**
 * @type {Map<string, import('./types').SourceTextModule>}
 */
const moduleCache = new Map();

/**
 * @type {WeakMap<import('./types').SourceTextModule, Set<string>>}
 */
const importers = new WeakMap();

/**
 * @type {WeakMap<import('./types').SourceTextModule, AbortController>}
 */
const watchers = new WeakMap();

let _hotReload = false;

/**
 * @param {import('./types').SourceTextModule} mod
 */
async function watchForChanges(mod) {
  if (!_hotReload) return;

  const { identifier } = mod;
  const abort = new AbortController();
  watchers.set(mod, abort);
  const watcher = watch(identifier, {
    persistent: false,
    signal: abort.signal,
  });

  try {
    for await (const _ of watcher) invalidate(identifier);
  } catch {}
}

/**
 * @param {string} identifier
 */
function invalidate(identifier) {
  const mod = moduleCache.get(identifier);
  if (!mod) return;

  const watcher = /** @type {AbortController} */ (watchers.get(mod));
  const imports = /** @type {Set<string>} */ (importers.get(mod));

  moduleCache.delete(identifier);
  watchers.delete(mod);
  importers.delete(mod);

  watcher.abort();
  for (const importer of imports) invalidate(importer);
}

/**
 * @param {string} specifier
 * @param {import('./types').Importer} importer
 * @return {import('./types').SourceTextModule}
 */
function load(specifier, importer) {
  const { identifier } = importer;
  const file = resolve(dirname(identifier), specifier);
  let cached = moduleCache.get(file);
  if (cached) {
    /** @type {Set<string>} */ (importers.get(cached)).add(identifier);
    return cached;
  }

  const transformed = transformSync(file);
  const mod = new /** @type {any} */ (vm).SourceTextModule(transformed, {
    context: vm.createContext({ React }),
    identifier: file,
    importModuleDynamically,
  });
  moduleCache.set(file, mod);
  importers.set(mod, new Set([identifier]));
  watchForChanges(mod);
  return mod;
}

/**
 * @param {string} specifier
 * @param {import('./types').Importer} importer
 * @return {Promise<import('./types').SourceTextModule>}
 */
async function importModuleDynamically(specifier, importer) {
  const mod = load(specifier, importer);
  if (mod.status === 'unlinked') await mod.link(load);
  if (mod.status === 'linked') await mod.evaluate();
  return mod;
}

export function hotReload() {
  _hotReload = true;
}

/**
 * @param {string} specifier
 * @param {string} cwd
 * @return {Promise<import('./types').SourceTextModule>}
 */
export function loadModule(specifier, cwd) {
  return importModuleDynamically(specifier, {
    identifier: join(cwd, '[minx]'),
  });
}
