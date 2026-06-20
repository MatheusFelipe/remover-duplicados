import { resolve } from 'node:path';

export function defaultOutputPaths(params: {
  readonly reportPath?: string;
  readonly errorLogPath?: string;
}): { readonly reportPath: string; readonly errorLogPath: string } {
  const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');

  return {
    reportPath: resolve(params.reportPath ?? `reports/report-${timestamp}.txt`),
    errorLogPath: resolve(params.errorLogPath ?? `reports/errors-${timestamp}.txt`),
  };
}
