import { stat } from 'node:fs/promises';
import type { AppOptions, OperationError } from '../domain/types.js';
import { DirectoryWalker } from '../services/DirectoryWalker.js';
import { DuplicateDetector } from '../services/DuplicateDetector.js';
import { ErrorLogStream } from '../services/ErrorLogStream.js';
import { FileRemovalService } from '../services/FileRemovalService.js';
import { ProgressLogger } from '../services/ProgressLogger.js';
import { ReportWriter } from '../services/ReportWriter.js';

export class DuplicateRemovalApp {
  async run(options: AppOptions): Promise<void> {
    const logger = new ProgressLogger(options.logMode);
    const errorLog = new ErrorLogStream(options.errorLogPath);
    await errorLog.open();

    try {
      await this.validateTarget(options.targetPath, errorLog);

      logger.info(`Mode: ${options.mode}`);
      logger.info(`Target: ${options.targetPath}`);
      logger.info(`Report: ${options.reportPath}`);
      logger.info(`Error log: ${options.errorLogPath}`);

      const walker = new DirectoryWalker(logger, errorLog);
      const detector = new DuplicateDetector(logger, errorLog);
      const remover = new FileRemovalService(logger, errorLog);
      const reportWriter = new ReportWriter();

      const walk = await walker.walk(options.targetPath);
      const detection = await detector.detect(walk.files);
      const removal = await remover.remove(detection.groups, options.mode);

      await reportWriter.write({
        reportPath: options.reportPath,
        mode: options.mode,
        walk,
        detection,
        removal,
      });

      logger.info(`Report written: ${options.reportPath}`);
    } finally {
      await errorLog.close();
    }
  }

  private async validateTarget(targetPath: string, errorLog: ErrorLogStream): Promise<void> {
    try {
      const targetStat = await stat(targetPath);

      if (!targetStat.isDirectory()) {
        throw new Error(`Target path is not a directory: ${targetPath}`);
      }
    } catch (error) {
      const operationError: OperationError = {
        at: new Date(),
        phase: 'validation',
        path: targetPath,
        message: error instanceof Error ? error.message : String(error),
      };
      errorLog.write(operationError);
      throw error;
    }
  }
}
