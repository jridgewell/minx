#!/usr/bin/env -S node --no-warnings --experimental-vm-modules

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { URL } from 'url';

import { build, serve } from '../src/index.mjs';

const packageConfig = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

const program = new Command();
program.version(packageConfig.version, '-v, --version');

const buildCommand = program.command('build');
buildCommand.option('-i, --in <dir>', 'input directory to build', '.');
buildCommand.option('-o, --out <dir>', 'output directory to build', 'docs');
buildCommand.option(
  '-g, --glob <pattern>',
  'glob pattern to search for files to transform',
  '**/*.{js,mjs}',
);
buildCommand.action(build);

const serveCommand = program.command('serve');
serveCommand.option('-i, --in <dir>', 'input directory to build', '.');
serveCommand.option('-p, --port <dir>', 'port to use', '8080');
serveCommand.option(
  '-g, --glob <pattern>',
  'glob pattern to search for files to transform',
  '**/*.{js,mjs}',
);
serveCommand.action(serve);

program.parse();
