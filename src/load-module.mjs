import vm from 'vm';
import { join, dirname } from 'path';
import { watch } from 'fs/promises';

import * as React from 'preact/compat';

import { transformSync } from './esbuild.mjs';

const context = vm.createContext({ React, console });

/** @type {import('./types').CachedModuleRecord} */
let CachedModuleRecord;
/** @type {import('./types').SourceTextModule} */
let SourceTextModule;
/** @type {import('./types').Importer} */
let Importer;

/**
 * @type {Map<string, CachedModuleRecord>}
 */
const moduleCache = new Map();

/** @type {Importer} */
let root;

let _hotReload = false;

/**
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
    for await (const _ of watcher) invalidate(identifier);
  } catch {}
}

/**
 * @param {string} identifier
 */
function invalidate(identifier) {
  const cached = moduleCache.get(identifier);
  if (!cached) return;

  const { abort, importers } = cached;
  moduleCache.delete(identifier);
  abort.abort();

  for (const importer of importers) invalidate(importer.identifier);
}

/**
 * @param {string} specifier
 * @param {Importer} importer
 * @return {string}
 */
function resolve(specifier, importer) {
  const { identifier } = importer;
  return join(dirname(identifier), specifier);
}

/**
 * @param {string} specifier
 * @param {Importer} importer
 * @return {SourceTextModule}
 */
function load(specifier, importer) {
  const file = resolve(specifier, importer);
  let cached = moduleCache.get(file);
  if (cached) {
    if (_hotReload) cached.importers.add(importer);
    return cached.mod;
  }

  console.log('\t', `compiling "${file}"`);
  const transformed = transformSync(file);
  const mod = new /** @type {any} */ (vm).SourceTextModule(transformed, {
    context,
    identifier: file,
    importModuleDynamically,
  });
  const importers = new Set([importer]);
  const abort = new AbortController();

  moduleCache.set(file, { mod, importers, abort });

  if (_hotReload) watchForChanges(mod, abort);

  return mod;
}

/**
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
    const file = resolve(specifier, importer);
    invalidate(file);
    throw e;
  }
}

export function hotReload() {
  _hotReload = true;
}

/**
 * @param {string} specifier
 * @param {string} cwd
 * @return {Promise<SourceTextModule>}
 */
export function loadModule(specifier, cwd) {
  root ||= { identifier: join(cwd, '[minx]') };
  return importModuleDynamically(specifier, root);
}
