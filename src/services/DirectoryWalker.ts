import type { Dirent } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import type { DirectoryEntry, FileEntry, OperationError, WalkResult } from '../domain/types.js';
import type { ErrorLogStream } from './ErrorLogStream.js';
import type { ProgressLogger } from './ProgressLogger.js';

export class DirectoryWalker {
  constructor(
    private readonly logger: ProgressLogger,
    private readonly errorLog: ErrorLogStream,
  ) {}

  async walk(rootPath: string): Promise<WalkResult> {
    const absoluteRoot = resolve(rootPath);
    const directories: DirectoryEntry[] = [];
    const files: FileEntry[] = [];
    const errors: OperationError[] = [];

    await this.walkDirectory(absoluteRoot, absoluteRoot, directories, files, errors);
    this.logger.finishProgress(
      `Traversal done: ${directories.length} folders, ${files.length} files, ${errors.length} errors.`,
    );

    return {
      rootPath: absoluteRoot,
      directories,
      files,
      errors,
    };
  }

  private async walkDirectory(
    rootPath: string,
    currentPath: string,
    directories: DirectoryEntry[],
    files: FileEntry[],
    errors: OperationError[],
  ): Promise<void> {
    const directory: DirectoryEntry = {
      absolutePath: currentPath,
      relativePath: this.toRelative(rootPath, currentPath),
    };
    directories.push(directory);
    this.logger.verbose(`Scanning folder: ${directory.relativePath}`);

    let entries: Dirent[];
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      this.recordError(errors, 'traversal', currentPath, error);
      return;
    }

    for (const entry of entries) {
      const absolutePath = resolve(currentPath, entry.name);

      if (entry.isDirectory()) {
        await this.walkDirectory(rootPath, absolutePath, directories, files, errors);
        continue;
      }

      if (!entry.isFile()) {
        this.logger.verbose(`Skipping non-file entry: ${this.toRelative(rootPath, absolutePath)}`);
        continue;
      }

      try {
        const fileStat = await stat(absolutePath);
        const file: FileEntry = {
          absolutePath,
          relativePath: this.toRelative(rootPath, absolutePath),
          extension: extname(entry.name).toLowerCase(),
          sizeBytes: fileStat.size,
        };
        files.push(file);
        this.logger.progress(`Scanning: ${directories.length} folders, ${files.length} files`);
      } catch (error) {
        this.recordError(errors, 'traversal', absolutePath, error);
      }
    }
  }

  private toRelative(rootPath: string, absolutePath: string): string {
    const relativePath = relative(rootPath, absolutePath);
    return relativePath === '' ? '.' : relativePath;
  }

  private recordError(
    errors: OperationError[],
    phase: OperationError['phase'],
    path: string,
    error: unknown,
  ): void {
    const operationError: OperationError = {
      at: new Date(),
      phase,
      path,
      message: error instanceof Error ? error.message : String(error),
    };

    errors.push(operationError);
    this.errorLog.write(operationError);
    this.logger.verbose(`Error at ${path}: ${operationError.message}`);
  }
}
