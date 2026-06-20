import { resolve } from 'node:path';
import type { AppOptions, LogMode, RunMode } from '../domain/types.js';

export interface ParseResult {
  readonly options?: AppOptions;
  readonly help?: string;
}

export class ArgumentParser {
  parse(argv: string[]): ParseResult {
    const values = new Map<string, string>();
    const flags = new Set<string>();
    const positional: string[] = [];

    for (let index = 0; index < argv.length; index += 1) {
      const arg = argv[index];

      if (!arg) {
        continue;
      }

      if (!arg.startsWith('--')) {
        positional.push(arg);
        continue;
      }

      if (arg === '--help' || arg === '-h') {
        return { help: this.usage() };
      }

      if (this.isValueOption(arg)) {
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) {
          throw new Error(`Missing value for ${arg}`);
        }
        values.set(arg, value);
        index += 1;
        continue;
      }

      if (this.isFlag(arg)) {
        flags.add(arg);
        continue;
      }

      throw new Error(`Unknown option: ${arg}`);
    }

    if (flags.has('--dry-run') && flags.has('--execute')) {
      throw new Error('Use either --dry-run or --execute, not both.');
    }

    const targetPath = values.get('--path') ?? positional[0];
    if (!targetPath) {
      throw new Error('Target folder is required. Use --path <dir> or positional path.');
    }

    const mode: RunMode = flags.has('--execute') ? 'execute' : 'dry-run';
    const logMode: LogMode = flags.has('--verbose') ? 'verbose' : 'simple';
    const recursive = flags.has('--recursive');
    const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');

    return {
      options: {
        targetPath: resolve(targetPath),
        mode,
        logMode,
        recursive,
        reportPath: resolve(values.get('--report') ?? `reports/report-${timestamp}.txt`),
        errorLogPath: resolve(values.get('--error-log') ?? `reports/errors-${timestamp}.txt`),
      },
    };
  }

  usage(): string {
    return [
      'Usage:',
      '  npm run dev -- --path <folder> [--dry-run|--execute] [--recursive] [--verbose]',
      '  npm run start -- --path <folder> [--dry-run|--execute] [--recursive] [--verbose]',
      '',
      'Options:',
      '  --path <folder>       Folder to scan recursively. Positional path also works.',
      '  --dry-run             Do not remove files. Default mode.',
      '  --execute             Remove duplicate files.',
      '  --recursive           Scan subfolders recursively.',
      '  --verbose             Print detailed progress logs.',
      '  --report <file>       Report txt output path.',
      '  --error-log <file>    Error txt output path.',
      '  --help                Show this help.',
    ].join('\n');
  }

  private isValueOption(arg: string): boolean {
    return ['--path', '--report', '--error-log'].includes(arg);
  }

  private isFlag(arg: string): boolean {
    return ['--dry-run', '--execute', '--recursive', '--verbose', '--simple'].includes(arg);
  }
}
