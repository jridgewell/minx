import { writeFile, copyFile } from 'fs/promises';
import { join } from 'path';

import fg from 'fast-glob';

import { render } from './react-dom.mjs';
import { loadModule } from './load-module.mjs';
import { forEach, interleave, map } from './async-iterable-concurrent.mjs';
import { ensureDir, replaceExt } from './disk.mjs';

/** @type {import('./types').FileData} */
let FileData;
/** @type {import('./types').ModuleRecord} */
let ModuleRecord;
/** @type {import('./types').RenderRecord} */
let RenderRecord;

/**
 * @param {Parameters<fg>[0]} glob
 * @param {Parameters<fg>[1]} opts
 */
function streamGlob(glob, opts) {
  return /** @type {AsyncIterable<string>} */ (fg.stream(glob, opts));
}

/**
 * @param {string} inDir
 * @param {string} outDir
 * @return {(data: string) => FileData}
 */
function fileData(inDir, outDir) {
  return (file) => {
    const src = join(inDir, file);
    const dest = replaceExt(join(outDir, file), '.html');
    console.log(`built ${src} -> ${dest}`);
    return { file, cwd: inDir, src, dest };
  };
}

/**
 * @return {(data: FileData) => Promise<ModuleRecord>}
 */
function importFiles() {
  return async (data) => {
    return {
      data,
      mod: await loadModule(data.file, data.cwd),
    };
  };
}

/**
 * @param {boolean | string} pretty
 * @return {(mod: ModuleRecord) => Promise<RenderRecord>}
 */
function renderModules(pretty) {
  return async ({ data, mod }) => {
    return {
      data,
      render: render(await mod.namespace.default(), pretty),
    };
  };
}

/**
 * @return {(render: RenderRecord) => Promise<void>}
 */
function writeRenders() {
  return async ({ render, data }) => {
    const { dest } = data;
    await ensureDir(dest);
    return writeFile(dest, render);
  };
}

/**
 * @param {string[]} cwds
 * @param {string} outDir
 * @return {AsyncIterable<void>}
 */
function copyAllPublicFiles(cwds, outDir) {
  const streams = cwds.map((cwd) => {
    const files = streamGlob('**', { cwd });
    return map(files, (file) => {
      return { file, cwd };
    });
  });

  const files = interleave(streams);
  const copies = map(files, ({ file, cwd }) => {
    return copyPublicFile(file, cwd, outDir);
  });
  return copies;
}

/**
 * @param {string} file
 * @param {string} cwd
 * @param {string} outDir
 * @return {Promise<void>}
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
 *   glob: string | string[],
 *   pretty: boolean | string,
 *   public?: string[]
 * }} options
 */
export async function build({
  in: inDir,
  out: outDir,
  glob,
  pretty,
  public: pubs,
}) {
  const stream = streamGlob(glob, { cwd: inDir });
  const files = map(stream, fileData(inDir, outDir));
  const modules = map(files, importFiles());
  const renders = map(modules, renderModules(pretty));
  const rendering = map(renders, writeRenders());

  const copying = copyAllPublicFiles(pubs || [], outDir);
  await forEach(interleave([rendering, copying]), 100);
}
