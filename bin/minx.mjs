#!/usr/bin/env node --no-warnings --experimental-vm-modules

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { URL } from 'url';

import { build } from '../src/index.mjs';

const packageConfig = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

const program = new Command();
program.version(packageConfig.version, '-v, --version');

const serve = program.command('serve');
serve.action(() => {
  throw new Error('TODO: serve');
});

const buildCommand = program.command('build');
buildCommand.option('-i, --in <dir>', 'input directory to build', '.');
buildCommand.option('-o, --out <dir>', 'output directory to build', 'docs');
buildCommand.option(
  '-g, --glob <pattern>',
  'glob pattern to search for files to transform',
  '**/*.{js,mjs}',
);
buildCommand.action(build);

program.parse();
