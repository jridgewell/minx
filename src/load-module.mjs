import vm from 'vm';
import { join } from 'path';
import { watch } from 'fs/promises';

import * as React from 'preact/compat';

import { transformSync } from './esbuild.mjs';
import { resolve } from './disk.mjs';

/** @type {import('./types').CachedModuleRecord} */
let CachedModuleRecord;
/** @type {import('./types').SourceTextModule} */
let SourceTextModule;
/** @type {import('./types').Importer} */
let Importer;

/**
 * The global context object provided for all modules that we load.
 */
const context = vm.createContext({ React, console });

/**
 * Caches the module instances, so they may be reused if they are imported by
 * multiple parent modules.
 *
 * @type {Map<string, CachedModuleRecord>}
 */
const moduleCache = new Map();

/**
 * We delay creating the root importer, because it needs to be relative to the
 * inDir provided via option parsing. This is used as the root of the module
 * graph.
 *
 * @type {Importer}
 */
let root;

/**
 * If set, we'll install a file watcher to listen for changes to modules. Once
 * changed, we'll invalidate the module graph up to the root so it may be
 * reloaded on next request.
 */
let hotReloadEnabled = false;

/**
 * Watches the module's file for changes so it can be removed from cache on
 * change.
 *
 * @param {SourceTextModule} mod
 * @param {AbortController} abort
 */
async function watchForChanges(mod, abort) {
  const { identifier } = mod;
  const watcher = watch(identifier, {
    persistent: false,
    signal: abort.signal,
  });

  try {
    for await (const _ of watcher) break;
    invalidate(identifier);
  } catch {}
}

/**
 * Invalidates a module and every module that imported it, removing it from
 * cache so it may be reloaded on next request.
 *
 * @param {string} identifier
 */
function invalidate(identifier) {
  const cached = moduleCache.get(identifier);
  // The module may already have been invalidated if there was another path to
  // it in the module graph.
  if (!cached) return;

  const { abort, importers } = cached;
  moduleCache.delete(identifier);
  abort.abort();

  for (const importer of importers) invalidate(importer.identifier);
}

/**
 * Loads the specified module (relative to the importing module) and stores it
 * in the module cache.
 *
 * @param {string} specifier
 * @param {Importer} importer
 * @return {SourceTextModule}
 */
function load(specifier, importer) {
  const file = resolve(importer.identifier, specifier);
  let cached = moduleCache.get(file);
  if (cached) {
    if (hotReloadEnabled) cached.importers.add(importer);
    return cached.mod;
  }

  console.log('\t', `compiling "${file}"`);
  const transformed = transformSync(file);
  const mod = new /** @type {any} */ (vm).SourceTextModule(transformed, {
    context,
    identifier: file,
    importModuleDynamically,
  });
  const importers = new Set();
  const abort = new AbortController();

  moduleCache.set(file, { mod, importers, abort });

  if (hotReloadEnabled) {
    importers.add(importer);
    watchForChanges(mod, abort);
  }

  return mod;
}

/**
 * Loads, links, and evaluates a module so that it may be imported.
 *
 * @param {string} specifier
 * @param {Importer} importer
 * @return {Promise<SourceTextModule>}
 */
async function importModuleDynamically(specifier, importer) {
  try {
    const mod = load(specifier, importer);
    if (mod.status === 'unlinked') await mod.link(load);
    if (mod.status === 'linked') await mod.evaluate();
    return mod;
  } catch (e) {
    const file = resolve(importer.identifier, specifier);
    invalidate(file);
    throw e;
  }
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
  root ||= { identifier: join(cwd, '[minx]') };
  return importModuleDynamically(specifier, root);
}
