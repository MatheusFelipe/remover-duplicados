export type RunMode = 'dry-run' | 'execute';

export type LogMode = 'silent' | 'simple' | 'verbose';

export interface AppOptions {
  readonly targetPath: string;
  readonly mode: RunMode;
  readonly logMode: LogMode;
  readonly recursive: boolean;
  readonly reportPath: string;
  readonly errorLogPath: string;
}

export interface FileEntry {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly extension: string;
  readonly sizeBytes: number;
}

export interface DirectoryEntry {
  readonly absolutePath: string;
  readonly relativePath: string;
}

export interface OperationError {
  readonly at: Date;
  readonly phase: 'traversal' | 'hash' | 'remove' | 'report' | 'validation';
  readonly path: string;
  readonly message: string;
}

export interface WalkResult {
  readonly rootPath: string;
  readonly directories: DirectoryEntry[];
  readonly files: FileEntry[];
  readonly errors: OperationError[];
}

export interface DuplicateGroup {
  readonly extension: string;
  readonly sizeBytes: number;
  readonly md5: string;
  readonly keep: FileEntry;
  readonly duplicates: FileEntry[];
}

export interface DetectionResult {
  readonly groups: DuplicateGroup[];
  readonly bucketsCreated: number;
  readonly candidateBuckets: number;
  readonly hashedFiles: number;
  readonly errors: OperationError[];
}

export interface RemovalResult {
  readonly planned: FileEntry[];
  readonly removed: FileEntry[];
  readonly failed: OperationError[];
  readonly bytesRemoved: number;
}

export interface RunStats {
  readonly directoriesFound: number;
  readonly filesFound: number;
  readonly duplicateGroupsFound: number;
  readonly duplicateFilesFound: number;
  readonly bucketsCreated: number;
  readonly candidateBuckets: number;
  readonly hashedFiles: number;
  readonly bytesRecoverable: number;
  readonly bytesRemoved: number;
  readonly errorsFound: number;
}

export interface DuplicateRemovalResult {
  readonly targetPath: string;
  readonly mode: RunMode;
  readonly recursive: boolean;
  readonly reportPath: string;
  readonly errorLogPath: string;
  readonly walk: WalkResult;
  readonly detection: DetectionResult;
  readonly removal: RemovalResult;
  readonly duplicateGroupsFound: number;
  readonly duplicateFilesFound: number;
  readonly bytesRecoverable: number;
  readonly bytesRemoved: number;
  readonly errorsFound: number;
}

export interface RemoverDuplicadosOptions {
  readonly targetPath: string;
  readonly mode?: RunMode;
  readonly execute?: boolean;
  readonly recursive?: boolean;
  readonly verbose?: boolean;
  readonly reportPath?: string;
  readonly errorLogPath?: string;
}
