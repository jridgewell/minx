import { URL } from 'url';
import { networkInterfaces } from 'os';
import { extname } from 'path';

import express from 'express';

import { globStream } from './glob-stream.mjs';
import { loadModule, enableHotReload } from './load-module.mjs';
import { render } from './react-dom.mjs';
import { replaceExt } from './disk.mjs';

/** @type {import('express').RequestHandler} */
let RequestHandler;

/**
 * Determines if a file exists with any extension that is matchable by the glob.
 *
 * @param {string} file
 * @param {string} inDir
 * @param {string | string[]} glob
 * @return {Promise<string|undefined>}
 */
async function lookupFile(file, inDir, glob) {
  const stream = globStream(glob, { cwd: inDir });
  for await (const f of stream) {
    if (f.startsWith(file)) return f;
  }
  return undefined;
}

/**
 * Extracts just the pathname (removing queryParams and any encoding
 * weirdness), and removes the leading slash so the file can be looked up
 * relative to our cwd.
 *
 * @param {string} url
 * @return {string}
 */
function normalizePathname(url) {
  const u = new URL(/** @type {string} */ (url), 'localhost://');
  return u.pathname.slice(1);
}

/**
 * Handles several types of requsets, allowing any EXT that matches our glob:
 * 1. Explicit file extension `foo/*.html`, serving `foo/*.EXT`
 * 2. Missing file extension `foo`, serving `foo/index.EXT`
 * 3. Trailing slash `foo/`, in which we look up `foo/index.EXT`
 *
 * @param {string} inDir
 * @param {string | string[]} glob
 * @param {boolean | string} pretty
 * @return {RequestHandler}
 */
function handler(inDir, glob, pretty) {
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
      res.end(render(output, pretty));
    } catch (e) {
      next(e);
    }
  };
}

/**
 * @param {string} port
 */
function listIp4Addresses(port) {
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
 *   glob: string | string[],
 *   pretty: boolean | string,
 *   public?: string[]
 * }} options
 */
export async function serve({ in: inDir, port, glob, public: pubs, pretty }) {
  enableHotReload();

  const app = express();
  app.use(handler(inDir, glob, pretty));
  if (pubs) {
    for (const pub of pubs) app.use(express.static(pub));
  }
  app.listen(port);

  listIp4Addresses(port);
}
