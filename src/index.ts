import { resolve } from 'node:path';
import { DuplicateRemovalApp } from './app/DuplicateRemovalApp.js';
import type {
  AppOptions,
  DuplicateRemovalResult,
  RemoverDuplicadosOptions,
  RunMode,
} from './domain/types.js';
import { defaultOutputPaths } from './services/runDefaults.js';

export type {
  AppOptions,
  DetectionResult,
  DirectoryEntry,
  DuplicateGroup,
  DuplicateRemovalResult,
  FileEntry,
  LogMode,
  OperationError,
  RemovalResult,
  RemoverDuplicadosOptions,
  RunMode,
  RunStats,
  WalkResult,
} from './domain/types.js';

export async function removerDuplicados(
  options: RemoverDuplicadosOptions,
): Promise<DuplicateRemovalResult> {
  return new DuplicateRemovalApp().run(toAppOptions(options));
}

function toAppOptions(options: RemoverDuplicadosOptions): AppOptions {
  const mode = resolveMode(options);
  const outputPaths = defaultOutputPaths(options);

  return {
    targetPath: resolve(options.targetPath),
    mode,
    logMode: options.verbose ? 'verbose' : 'silent',
    recursive: options.recursive ?? false,
    reportPath: outputPaths.reportPath,
    errorLogPath: outputPaths.errorLogPath,
  };
}

function resolveMode(options: RemoverDuplicadosOptions): RunMode {
  const executeMode: RunMode = options.execute ? 'execute' : 'dry-run';

  if (options.mode && options.execute !== undefined && options.mode !== executeMode) {
    throw new Error('Use either mode or execute, not conflicting values.');
  }

  return options.mode ?? executeMode;
}
