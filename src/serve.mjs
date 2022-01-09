import { URL } from 'url';
import { networkInterfaces } from 'os';
import { extname } from 'path';

import express from 'express';
import fg from 'fast-glob';

import { loadModule, hotReload } from './load-module.mjs';
import { render } from './react-dom.mjs';
import { replaceExt } from './disk.mjs';

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
 * @param {string} url
 * @return {string}
 */
function normalizePathname(url) {
  const u = new URL(/** @type {string} */ (url), 'localhost://');
  return u.pathname.slice(1);
}

/**
 * @param {string} inDir
 * @param {string} glob
 * @return {import('express').RequestHandler}
 */
function handler(inDir, glob) {
  return async (req, res, next) => {
    let pathname = normalizePathname(req.url);

    if (!pathname || pathname.endsWith('/')) {
      pathname += 'index';
    } else if (!extname(pathname)) {
      pathname += '/index';
    } else if (pathname.endsWith('.html')) {
      pathname = replaceExt(pathname, '');
    } else {
      return next();
    }

    try {
      const match = await lookupFile(pathname, inDir, glob);
      if (!match) return next();

      console.log(`serving "${match}"`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const mod = await loadModule(match, inDir);
      const output = await mod.namespace.default();
      res.end(render(output, false));
    } catch (e) {
      next(e);
    }
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
  console.log('');
}

/**
 * @param {{
 *   in: string,
 *   port: string,
 *   glob: string,
 *   public?: string[]
 * }} options
 */
export async function serve({ in: inDir, port, glob, public: pubs }) {
  hotReload();

  const app = express();
  app.use(handler(inDir, glob));
  if (pubs) {
    for (const pub of pubs) app.use(express.static(pub));
  }
  app.listen(port);

  listAddresses(port);
}
