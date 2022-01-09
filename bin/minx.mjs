#!/usr/bin/env -S node --no-warnings --experimental-vm-modules

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { URL } from 'url';

import { build, serve } from '../src/index.mjs';

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const packageConfig = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

const program = new Command();
program.version(packageConfig.version, '-v, --version');

const buildCommand = program.command('build');
buildCommand.option('-c, --config <file>', 'config file for default options');
buildCommand.option('-i, --in <dir>', 'input directory to build', 'website');
buildCommand.option('-o, --out <dir>', 'output directory to build', '_site');
buildCommand.option(
  '-g, --glob <pattern...>',
  'glob patterns to search for files to transform',
  '**/*.{js,mjs}',
);
buildCommand.option('--public <directory...>', 'directories to copy over');
buildCommand.option('--pretty [whitespace]', 'pretty print the resulting html');
buildCommand.action(mergeConfig(buildCommand, build));

const serveCommand = program.command('serve');
serveCommand.option('-c, --config <file>', 'config file for default options');
serveCommand.option('-i, --in <dir>', 'input directory to build', 'website');
serveCommand.option('--port <dir>', 'port to use', '8080');
serveCommand.option(
  '-g, --glob <pattern...>',
  'glob patterns to search for files to transform',
  '**/*.{js,mjs}',
);
serveCommand.option('--public <directory...>', 'directories to copy over');
serveCommand.option('--pretty [whitespace]', 'pretty print the resulting html');
serveCommand.action(mergeConfig(serveCommand, serve));

/**
 * @param {string} file
 * @return {T|null}
 * @template T
 */
function readFileJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Extracts the config option, and if present, merges the the config's JSON
 * into the options. Precedence is given to
 * 1. CLI options
 * 2. Config options
 * 3. Default options
 *
 * @param {Command} cmd
 * @param {(opts: T)=>R} fn
 * @return {(opts: any) => R}
 * @template T
 * @template R
 */
function mergeConfig(cmd, fn) {
  return (opts) => {
    const { config, ..._opts } = opts;
    if (config) {
      const json = readFileJson(config);
      for (const key in json) {
        const source = cmd.getOptionValueSource(key) ?? 'default';
        if (source === 'default') _opts[key] = json[key];
      }
    }
    return fn(_opts);
  };
}

program.parse();
