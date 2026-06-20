import type { LogMode } from '../domain/types.js';

export class ProgressLogger {
  constructor(private readonly mode: LogMode) {}

  info(message: string): void {
    if (this.mode === 'silent') {
      return;
    }

    console.log(message);
  }

  verbose(message: string): void {
    if (this.mode === 'verbose') {
      console.log(message);
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

    console.log(message);
  }

  finishProgress(message: string): void {
    if (this.mode === 'silent') {
      return;
    }

    if (this.mode === 'simple') {
      process.stdout.write(`\r${message}\n`);
      return;
    }

    console.log(message);
  }
}
