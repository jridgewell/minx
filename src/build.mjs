import { join } from 'path';

import { render } from './react-dom.mjs';
import { loadModule, setupBootstrap } from './load-module.mjs';
import { forEach, cap, interleave, map } from './async-iterable-concurrent.mjs';
import { globStream, writeFile, copyFile, replaceExt } from './disk.mjs';

/** @type {import('./types').FileData} */
let FileData;
/** @type {import('./types').ModuleRecord} */
let ModuleRecord;
/** @type {import('./types').RenderRecord} */
let RenderRecord;

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
 * @param {string | string[]} glob
 * @param {string} cwd
 * @param {string} outDir
 * @return {AsyncIterable<void>}
 */
function copyAllPublicFiles(glob, cwd, outDir) {
  const files = globStream(glob, { cwd });
  return map(files, (file) => {
    const src = join(cwd, file);
    const dest = join(outDir, file);
    return copyFile(src, dest);
  });
}

/**
 * @param {{
 *   in: string,
 *   out: string,
 *   glob: string | string[],
 *   pretty: boolean | string,
 *   public?: string | string[],
 *   bootstrap?: string,
 * }} options
 */
export async function build({
  in: inDir,
  out: outDir,
  glob,
  pretty,
  public: pubs,
  bootstrap,
}) {
  await setupBootstrap(bootstrap);

  const stream = globStream(glob, { cwd: inDir });
  const files = map(stream, fileData(inDir, outDir));
  const modules = map(files, loadModules());
  const renders = map(modules, renderModules(pretty));
  const rendering = map(renders, writeRenders());

  const copying = copyAllPublicFiles(pubs || '', inDir, outDir);
  await forEach(cap(interleave([rendering, copying])), 100);
}
