import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type {
  DetectionResult,
  DuplicateGroup,
  FileEntry,
  OperationError,
} from '../domain/types.js';
import type { ErrorLogStream } from './ErrorLogStream.js';
import { toOperationError } from './operationError.js';
import type { ProgressLogger } from './ProgressLogger.js';

export class DuplicateDetector {
  constructor(
    private readonly logger: ProgressLogger,
    private readonly errorLog: ErrorLogStream,
  ) {}

  async detect(files: FileEntry[]): Promise<DetectionResult> {
    const buckets = this.createBuckets(files);
    const candidateBuckets = [...buckets.values()].filter((bucket) => bucket.length > 1);
    const candidateFiles = candidateBuckets.reduce((total, bucket) => total + bucket.length, 0);
    const errors: OperationError[] = [];
    const groups: DuplicateGroup[] = [];
    let hashedFiles = 0;

    this.logger.info(
      `Buckets: ${buckets.size} total, ${candidateBuckets.length} candidate buckets, ${candidateFiles} files for hashing.`,
    );

    for (const bucket of candidateBuckets) {
      const byHash = new Map<string, FileEntry[]>();

      for (const file of bucket) {
        try {
          this.logger.verbose(
            `Hashing file ${hashedFiles + 1}/${candidateFiles}: ${file.relativePath} (${file.sizeBytes} bytes)`,
          );
          const md5 = await this.md5(file.absolutePath);
          hashedFiles += 1;
          const hashBucket = byHash.get(md5) ?? [];
          hashBucket.push(file);
          byHash.set(md5, hashBucket);
          this.logger.progress(
            `Hashing: ${hashedFiles}/${candidateFiles} files (${this.percentage(
              hashedFiles,
              candidateFiles,
            )}%)`,
          );
        } catch (error) {
          this.recordError(errors, 'hash', file.absolutePath, error);
        }
      }

      for (const [md5, hashBucket] of byHash.entries()) {
        if (hashBucket.length < 2) {
          continue;
        }

        const sorted = [...hashBucket].sort((left, right) =>
          left.relativePath.localeCompare(right.relativePath),
        );
        const [keep, ...duplicates] = sorted;

        if (!keep) {
          continue;
        }

        groups.push({
          extension: keep.extension,
          sizeBytes: keep.sizeBytes,
          md5,
          keep,
          duplicates,
        });
      }
    }

    this.logger.finishProgress(
      `Hashing done: ${hashedFiles}/${candidateFiles} files hashed (${this.percentage(
        hashedFiles,
        candidateFiles,
      )}%), ${groups.length} duplicate groups.`,
    );

    return {
      groups,
      bucketsCreated: buckets.size,
      candidateBuckets: candidateBuckets.length,
      hashedFiles,
      errors,
    };
  }

  private createBuckets(files: FileEntry[]): Map<string, FileEntry[]> {
    const buckets = new Map<string, FileEntry[]>();

    for (const file of files) {
      const key = `${file.extension}|${file.sizeBytes}`;
      const bucket = buckets.get(key) ?? [];
      bucket.push(file);
      buckets.set(key, bucket);
    }

    return buckets;
  }

  private md5(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('md5');
      const stream = createReadStream(path);

      stream.on('error', reject);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  private percentage(done: number, total: number): number {
    if (total === 0) {
      return 100;
    }

    return Math.floor((done / total) * 100);
  }

  private recordError(
    errors: OperationError[],
    phase: OperationError['phase'],
    path: string,
    error: unknown,
  ): void {
    const operationError = toOperationError({ phase, path, error });

    errors.push(operationError);
    this.errorLog.write(operationError);
    this.logger.verbose(`Error at ${path}: ${operationError.message}`);
  }
}
