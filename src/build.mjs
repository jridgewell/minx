import { join } from 'path';

import fg from 'fast-glob';

import { render } from './react-dom.mjs';
import { loadModule } from './load-module.mjs';
import { forEach, interleave, map } from './async-iterable-concurrent.mjs';
import { writeFile, copyFile, replaceExt } from './disk.mjs';

/** @type {import('./types').FileData} */
let FileData;
/** @type {import('./types').ModuleRecord} */
let ModuleRecord;
/** @type {import('./types').RenderRecord} */
let RenderRecord;

/**
 * For some reason TS won't allow using a ReadableStream as an AsyncIterable.
 *
 * @param {Parameters<fg>[0]} glob
 * @param {Parameters<fg>[1]} opts
 */
function streamGlob(glob, opts) {
  return /** @type {AsyncIterable<string>} */ (fg.stream(glob, opts));
}

/**
 * @param {string} cwd
 * @param {string} outDir
 * @return {(data: string) => FileData}
 */
function fileData(cwd, outDir) {
  return (file) => {
    const src = join(cwd, file);
    const dest = replaceExt(join(outDir, file), '.html');
    console.log(`building ${src} -> ${dest}`);
    return { file, cwd, src, dest };
  };
}

/**
 * @return {(data: FileData) => Promise<ModuleRecord>}
 */
function loadModules() {
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
  return ({ render, data }) => writeFile(data.dest, render);
}

/**
 * @param {string[]} cwds
 * @param {string} outDir
 * @return {AsyncIterable<void>}
 */
function copyAllPublicFiles(cwds, outDir) {
  // We allow copying multiple public directories, and each directory will
  // produce its own file stream. We need to interleave it in a way that we
  // remember the cwd used to find it.
  const streams = cwds.map((cwd) => {
    const files = streamGlob('**', { cwd });
    return map(files, (file) => ({ file, cwd }));
  });

  const copies = map(interleave(streams), ({ file, cwd }) => {
    const src = join(cwd, file);
    const dest = join(outDir, file);
    return copyFile(src, dest);
  });
  return copies;
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
  const modules = map(files, loadModules());
  const renders = map(modules, renderModules(pretty));
  const rendering = map(renders, writeRenders());

  const copying = copyAllPublicFiles(pubs || [], outDir);
  await forEach(interleave([rendering, copying]), 100);
}
