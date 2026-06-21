import type { LogMode } from '../domain/types.js';

export class ProgressLogger {
  private readonly startedAt = Date.now();

  constructor(private readonly mode: LogMode) {}

  info(message: string): void {
    if (this.mode === 'silent') {
      return;
    }

    console.log(this.format(message));
  }

  verbose(message: string): void {
    if (this.mode === 'verbose') {
      console.log(this.format(message));
    }
  }

  progress(message: string): void {
    if (this.mode === 'silent') {
      return;
    }

    if (this.mode === 'simple') {
      process.stdout.write(`\r${message}`);
      return;
    }

    console.log(this.format(message));
  }

  finishProgress(message: string): void {
    if (this.mode === 'silent') {
      return;
    }

    if (this.mode === 'simple') {
      process.stdout.write(`\r${message}\n`);
      return;
    }

    console.log(this.format(message));
  }

  private format(message: string): string {
    if (this.mode !== 'verbose') {
      return message;
    }

    return `[${this.elapsed()}] ${message}`;
  }

  private elapsed(): string {
    const elapsedMs = Date.now() - this.startedAt;
    return `${(elapsedMs / 1000).toFixed(1)}s`;
  }
}
