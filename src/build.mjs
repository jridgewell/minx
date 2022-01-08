import { writeFile, copyFile } from 'fs/promises';
import { dirname, basename, extname, join } from 'path';

import fg from 'fast-glob';

import { render } from './react-dom.mjs';
import { loadModule } from './load-module.mjs';
import { toArray, map } from './async-iterable-concurrent.mjs';
import { ensureDir, replaceExt } from './disk.mjs';

/**
 * @param {string} inDir
 * @param {string} outDir
 * @return {(file: string) => Promise<import('./types').ModuleRecord>}
 */
function importFiles(inDir, outDir) {
  return (f) => importFile(f, inDir, outDir);
}

/**
 * @param {string} file
 * @param {string} inDir
 * @param {string} outDir
 * @return {Promise<import('./types').ModuleRecord>}
 */
async function importFile(file, inDir, outDir) {
  console.log(
    `building ${join(inDir, file)} -> ${replaceExt(
      join(outDir, file),
      '.html',
    )}`,
  );

  return {
    file,
    mod: await loadModule(file, inDir),
  };
}

/**
 * @param {boolean | string} pretty
 * @return {(mod: import('./types').ModuleRecord) => Promise<import('./types').RenderRecord>}
 */
function renderModules(pretty) {
  return (m) => renderModule(m, pretty);
}

/**
 * @param {import('./types').ModuleRecord} module
 * @param {boolean | string} pretty
 * @return {Promise<import('./types').RenderRecord>}
 */
async function renderModule({ file, mod }, pretty) {
  return {
    file,
    render: render(await mod.namespace.default(), pretty),
  };
}

/**
 * @param {string} outDir
 * @return {(render: import('./types').RenderRecord) => Promise<unknown>}
 */
function writeRenders(outDir) {
  return (r) => writeRender(r, outDir);
}

/**
 * @param {import('./types').RenderRecord} renderRecord
 * @param {string} outDir
 * @return {Promise<unknown>}
 */
async function writeRender({ render, file }, outDir) {
  const outputFile =
    join(outDir, dirname(file), basename(file, extname(file))) + '.html';
  await ensureDir(outputFile);
  return writeFile(outputFile, render);
}

/**
 * @param {string} cwd
 * @param {string} outDir
 * @return {Promise<unknown[]>}
 */
async function copyPublicFiles(cwd, outDir) {
  const stream = fg.stream('**', { cwd });
  const copies = [];
  for await (const file of stream) {
    copies.push(copyPublicFile(/** @type {string} */ (file), cwd, outDir));
  }
  return Promise.all(copies);
}

/**
 * @param {string} file
 * @param {string} cwd
 * @param {string} outDir
 * @return {Promise<unknown>}
 */
async function copyPublicFile(file, cwd, outDir) {
  const src = join(cwd, file);
  const dest = join(outDir, file);
  await ensureDir(dest);
  return copyFile(src, dest);
}

/**
 * @param {{
 *   in: string,
 *   out: string,
 *   glob: string,
 *   ignore: string[],
 *   pretty: boolean | string,
 *   public?: string[]
 * }} options
 */
export async function build({
  in: inDir,
  out: outDir,
  glob,
  ignore,
  pretty,
  public: pubs,
}) {
  const files = /** @type {AsyncIterable<string>} */ (
    fg.stream(glob, { cwd: inDir, ignore })
  );
  const modules = map(files, importFiles(inDir, outDir));
  const renders = map(modules, renderModules(pretty));
  const writes = map(renders, writeRenders(outDir));

  const copies = [];
  if (pubs) {
    for (const p of pubs) copies.push(copyPublicFiles(p, outDir));
  }

  await toArray(writes, 100);
  await Promise.all(copies);
}
