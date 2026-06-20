import { unlink } from 'node:fs/promises';
import type {
  DuplicateGroup,
  FileEntry,
  OperationError,
  RemovalResult,
  RunMode,
} from '../domain/types.js';
import type { ErrorLogStream } from './ErrorLogStream.js';
import type { ProgressLogger } from './ProgressLogger.js';

export class FileRemovalService {
  constructor(
    private readonly logger: ProgressLogger,
    private readonly errorLog: ErrorLogStream,
  ) {}

  async remove(groups: DuplicateGroup[], mode: RunMode): Promise<RemovalResult> {
    const planned = groups.flatMap((group) => group.duplicates);
    const removed: FileEntry[] = [];
    const failed: OperationError[] = [];

    if (mode === 'dry-run') {
      this.logger.info(`Dry-run: ${planned.length} duplicate files would be removed.`);
      return {
        planned,
        removed: [],
        failed,
        bytesRemoved: 0,
      };
    }

    for (const file of planned) {
      try {
        await unlink(file.absolutePath);
        removed.push(file);
        this.logger.progress(`Removing: ${removed.length}/${planned.length} files`);
      } catch (error) {
        const operationError = this.toOperationError(file.absolutePath, error);
        failed.push(operationError);
        this.errorLog.write(operationError);
        this.logger.verbose(`Remove failed: ${file.relativePath} - ${operationError.message}`);
      }
    }

    this.logger.finishProgress(`Removal done: ${removed.length} removed, ${failed.length} failed.`);

    return {
      planned,
      removed,
      failed,
      bytesRemoved: removed.reduce((total, file) => total + file.sizeBytes, 0),
    };
  }

  private toOperationError(path: string, error: unknown): OperationError {
    return {
      at: new Date(),
      phase: 'remove',
      path,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
