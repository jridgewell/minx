import vm from 'vm';
import { join, dirname } from 'path';
import { watch } from 'fs/promises';

import * as React from 'preact/compat';

import { transformSync } from './esbuild.mjs';

const context = vm.createContext({ React, console });

/**
 * @type {Map<string, import('./types').CachedModuleRecord>}
 */
const moduleCache = new Map();

let _hotReload = false;

/**
 * @param {import('./types').SourceTextModule} mod
 * @param {AbortController} abort
 */
async function watchForChanges(mod, abort) {
  const { identifier } = mod;
  const watcher = watch(identifier, {
    persistent: false,
    signal: abort.signal,
  });

  try {
    for await (const _ of watcher) invalidate(identifier, false);
  } catch {}
}

/**
 * @param {string} identifier
 * @param {boolean} depChange
 */
function invalidate(identifier, depChange) {
  const cached = moduleCache.get(identifier);
  if (!cached) return;

  if (depChange) console.log(`\bpurging importer "${identifier}"`);
  else console.log(`detected change in "${identifier}"`);

  const { abort, importers } = cached;
  moduleCache.delete(identifier);
  abort.abort();
  for (const importer of importers) invalidate(importer, true);
}

/**
 * @param {string} specifier
 * @param {import('./types').Importer} importer
 * @return {import('./types').SourceTextModule}
 */
function load(specifier, importer) {
  const { identifier } = importer;
  const file = join(dirname(identifier), specifier);

  let cached = moduleCache.get(file);
  if (cached) {
    if (_hotReload) cached.importers.add(identifier);
    return cached.mod;
  }

  console.log('\t', `compiling "${file}"`);
  const transformed = transformSync(file);
  const mod = new /** @type {any} */ (vm).SourceTextModule(transformed, {
    context,
    identifier: file,
    importModuleDynamically,
  });
  const importers = new Set([identifier]);
  const abort = new AbortController();

  moduleCache.set(file, { mod, importers, abort });

  if (_hotReload) watchForChanges(mod, abort);

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
