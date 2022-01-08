import { URL } from 'url';
import { networkInterfaces } from 'os';

import express from 'express';
import fg from 'fast-glob';

import { loadModule, hotReload } from './load-module.mjs';
import { render } from './react-dom.mjs';

/**
 * @param {string} file
 * @param {string} inDir
 * @param {string} glob
 * @return {Promise<string|undefined>}
 */
async function lookupFile(file, inDir, glob) {
  const files = await fg(glob, { cwd: inDir });
  return files.find((f) => f.startsWith(file));
}

/**
 * @param {string} inDir
 * @param {string} glob
 * @return {import('express').RequestHandler}
 */
function handler(inDir, glob) {
  return async (req, res, next) => {
    const url = new URL(/** @type {string} */ (req.url), 'localhost://');
    let { pathname } = url;

    console.log(`request for "${pathname}"`);

    if (pathname.endsWith('/')) pathname += 'index';
    const match = await lookupFile(pathname.slice(1), inDir, glob);
    if (!match) return next();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const mod = await loadModule(match, inDir);
    const output = await mod.namespace.default();
    res.end(render(output));
  };
}

/**
 * @param {string} port
 */
function listAddresses(port) {
  console.log('Listening on:');
  for (const device of Object.values(networkInterfaces())) {
    if (!device) continue;
    for (const detail of device) {
      if (detail.family === 'IPv4') {
        console.log(`- http://${detail.address}:${port}/`);
      }
    }
  }
}

/**
 * @param {{
 *   in: string,
 *   port: string,
 *   glob: string,
 * }} options
 */
export async function serve({ in: inDir, port, glob }) {
  hotReload();

  const app = express();
  app.use(handler(inDir, glob));
  app.use(express.static(inDir));
  app.listen(port);

  listAddresses(port);
}
