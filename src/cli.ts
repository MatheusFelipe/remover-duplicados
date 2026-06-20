#!/usr/bin/env node
import { DuplicateRemovalApp } from './app/DuplicateRemovalApp.js';
import { ArgumentParser } from './services/ArgumentParser.js';

const parser = new ArgumentParser();

try {
  const result = parser.parse(process.argv.slice(2));

  if (result.help) {
    console.log(result.help);
    process.exitCode = 0;
  } else if (result.options) {
    await new DuplicateRemovalApp().run(result.options);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(parser.usage());
  process.exitCode = 1;
}
