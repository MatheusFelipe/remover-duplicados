import type { LogMode } from '../domain/types.js';

export class ProgressLogger {
  constructor(private readonly mode: LogMode) {}

  info(message: string): void {
    console.log(message);
  }

  verbose(message: string): void {
    if (this.mode === 'verbose') {
      console.log(message);
    }
  }

  progress(message: string): void {
    if (this.mode === 'simple') {
      process.stdout.write(`\r${message}`);
      return;
    }

    console.log(message);
  }

  finishProgress(message: string): void {
    if (this.mode === 'simple') {
      process.stdout.write(`\r${message}\n`);
      return;
    }

    console.log(message);
  }
}
