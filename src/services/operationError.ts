import type { OperationError } from '../domain/types.js';

export function toOperationError(params: {
  readonly phase: OperationError['phase'];
  readonly path: string;
  readonly error: unknown;
}): OperationError {
  return {
    at: new Date(),
    phase: params.phase,
    path: params.path,
    message: params.error instanceof Error ? params.error.message : String(params.error),
  };
}
