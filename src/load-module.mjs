import { readFileSync } from 'fs';
import vm from 'vm';
import { resolve, dirname } from 'path';

import * as React from 'preact';

import { transformContentsSync } from './esbuild.mjs';

/**
 * @type {Map<string, import('./types').SourceTextModule>}
 */
const moduleCache = new Map();

/**
 * @param {string} specifier
 * @param {import('./types').Importer} importer
 * @return {import('./types').SourceTextModule}
 */
function load(specifier, importer) {
  const file = resolve(dirname(importer.identifier), specifier);
  let cached = moduleCache.get(file);
  if (cached) return cached;

  const contents = readFileSync(file, 'utf8');
  const transformed = transformContentsSync(contents, file);
  const mod = new /** @type {any} */ (vm).SourceTextModule(transformed, {
    context: vm.createContext({ React }),
    identifier: file,
    importModuleDynamically,
  });
  moduleCache.set(file, mod);
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

/**
 * @param {string} specifier
 * @param {string} importer
 * @return {Promise<import('./types').SourceTextModule>}
 */
export function loadModule(specifier, importer) {
  return importModuleDynamically(specifier, { identifier: importer });
}
