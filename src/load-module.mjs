import vm from 'vm';
import { join } from 'path';
import { watch } from 'fs/promises';

import * as React from 'preact/compat';

import { transformSync } from './esbuild.mjs';
import { resolve } from './disk.mjs';

/** @type {import('./types').SourceTextModule} */
let SourceTextModule;
/** @type {import('./types').ReloadRecord} */
let ReloadRecord;

/**
 * The global context object provided for all modules that we load.
 */
const context = vm.createContext({ React, console });

/**
 * Caches the module instances, so they may be reused if they are imported by
 * multiple parent modules.
 *
 * @type {Map<string, SourceTextModule>}
 */
const moduleCache = new Map();

/**
 * We delay creating the root importer, because it needs to be relative to the
 * inDir provided via option parsing. This is used as the root of the module
 * graph.
 *
 * @type {SourceTextModule}
 */
let root;

/**
 * If set, we'll install a file watcher to listen for changes to modules. Once
 * changed, we'll invalidate the module graph up to the root so it may be
 * reloaded on next request.
 */
let hotReloadEnabled = false;

/**
 * Holds the data needed to invalidate a module to be reloaded.
 *
 * @type {WeakMap<SourceTextModule, ReloadRecord>}
 */
const reloadCache = new WeakMap();

/**
 * Watches the module's file for changes so it can be removed from cache on
 * change.
 *
 * @param {SourceTextModule} mod
 * @return {AbortController}
 */
function watchForChanges(mod) {
  const { identifier } = mod;
  const abort = new AbortController();

  const watcher = watch(identifier, {
    persistent: false,
    signal: abort.signal,
  });

  (async () => {
    try {
      for await (const _ of watcher) break;
      invalidate(mod);
    } catch {}
  })();

  return abort;
}

/**
 * Invalidates a module and every module that imported it, removing it from
 * cache so it may be reloaded on next request.
 *
 * @param {SourceTextModule} mod
 */
function invalidate(mod) {
  const cached = reloadCache.get(mod);
  // The module may already have been invalidated if there was another path to
  // it in the module graph.
  if (!cached) return;

  const { abort, importers } = cached;
  moduleCache.delete(mod.identifier);
  reloadCache.delete(mod);
  abort.abort();

  for (const importer of importers) invalidate(importer);
}

/**
 * Loads the specified module (relative to the importing module) and stores it
 * in the module cache.
 *
 * @param {string} specifier
 * @param {SourceTextModule} importer
 * @return {SourceTextModule}
 */
function load(specifier, importer) {
  const file = resolve(importer.identifier, specifier);
  let cached = moduleCache.get(file);
  if (cached) {
    const reload = reloadCache.get(cached);
    if (reload) {
      reload.importers.add(/** @type {SourceTextModule} */ (importer));
    }
    return cached;
  }

  console.log('\t', `compiling "${file}"`);
  const transformed = transformSync(file);
  const mod = new /** @type {any} */ (vm).SourceTextModule(transformed, {
    context,
    identifier: file,
    importModuleDynamically,
  });
  moduleCache.set(file, mod);

  if (hotReloadEnabled) {
    reloadCache.set(mod, {
      abort: watchForChanges(mod),
      importers: new Set([/** @type {SourceTextModule} */ (importer)]),
    });
  }

  return mod;
}

/**
 * Loads, links, and evaluates a module so that it may be imported.
 *
 * @param {string} specifier
 * @param {SourceTextModule} importer
 * @return {Promise<SourceTextModule>}
 */
async function importModuleDynamically(specifier, importer) {
  const mod = load(specifier, importer);
  try {
    if (mod.status === 'unlinked') await mod.link(load);
    if (mod.status === 'linked') await mod.evaluate();
  } catch (e) {
    invalidate(mod);
    throw e;
  }
  return mod;
}

export function enableHotReload() {
  hotReloadEnabled = true;
}

/**
 * Loads the module from the root of our synthetic module graph.
 *
 * @param {string} specifier
 * @param {string} cwd
 * @return {Promise<SourceTextModule>}
 */
export function loadModule(specifier, cwd) {
  if (!root) {
    const identifier = join(cwd, '[minx]');
    root = /** @type {SourceTextModule} */ ({ identifier });
  }
  return importModuleDynamically(specifier, root);
}
