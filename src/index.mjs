import { mkdir, writeFile } from 'fs/promises';
import { dirname, basename, extname, join } from 'path';

import fg from 'fast-glob';

import { render } from './react-dom.mjs';
import { loadModule } from './load-module.mjs';
import { cleanup } from './cleanup.mjs';

/**
 * @param {string[]} files
 * @param {string} importer
 * @return {Promise<import('./types').ModuleRecord[]>}
 */
function importFiles(files, importer) {
  const mods = files.map((f) => importFile(f, importer));
  return Promise.all(mods);
}

/**
 * @param {string} file
 * @param {string} importer
 * @return {Promise<import('./types').ModuleRecord>}
 */
async function importFile(file, importer) {
  return {
    dir: dirname(file),
    filename: basename(file, extname(file)),
    mod: await loadModule(file, importer),
  };
}

/**
 * @param {import('./types').ModuleRecord[]} modules
 * @return {Promise<import('./types').RenderRecord[]>}
 */
function renderModules(modules) {
  const renders = modules.map(renderModule);
  return Promise.all(renders);
}

/**
 * @param {import('./types').ModuleRecord} module
 * @return {Promise<import('./types').RenderRecord>}
 */
async function renderModule({ dir, filename, mod }) {
  return {
    dir,
    filename,
    render: render(await mod.namespace.default()),
  };
}

/**
 * @param {import('./types').RenderRecord[]} renders
 * @param {string} outDir
 * @return {Promise<unknown[]>}
 */
function writeRenders(renders, outDir) {
  const writes = renders.map((r) => writeRender(r, outDir));
  return Promise.all(writes);
}

/**
 * @param {import('./types').RenderRecord} renderRecord
 * @param {string} outDir
 * @return {Promise<unknown>}
 */
async function writeRender({ render, dir, filename }, outDir) {
  const dirpath = join(outDir, dir);
  await mkdir(dirpath, { recursive: true });
  const file = join(dirpath, filename) + '.html';
  return writeFile(file, render);
}

/**
 * @param {{
 *   in: string,
 *   out: string,
 *   glob: string
 * }} options
 */
export async function build({ in: inDir, out: outDir, glob }) {
  const files = await fg(glob, { cwd: inDir });
  const clean = cleanup(outDir);

  const modules = await importFiles(
    files,
    join(process.cwd(), inDir, '[minx]'),
  );

  const renders = await renderModules(modules);
  await clean;
  await writeRenders(renders, outDir);
}
