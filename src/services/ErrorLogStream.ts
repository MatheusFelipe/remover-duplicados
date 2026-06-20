import { createWriteStream, type WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { OperationError } from '../domain/types.js';

export class ErrorLogStream {
  private stream?: WriteStream;

  constructor(private readonly filePath: string) {}

  async open(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    this.stream = createWriteStream(this.filePath, { flags: 'a' });
    this.stream.write(`\n=== Run started at ${new Date().toISOString()} ===\n`);
  }

  write(error: OperationError): void {
    const line = [
      error.at.toISOString(),
      error.phase,
      error.path,
      error.message.replaceAll('\n', ' '),
    ].join(' | ');

    this.stream?.write(`${line}\n`);
  }

  async close(): Promise<void> {
    if (!this.stream) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.stream?.end((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
