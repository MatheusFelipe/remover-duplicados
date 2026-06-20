import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, sep } from 'node:path';
import type {
  DetectionResult,
  DuplicateGroup,
  FileEntry,
  RemovalResult,
  RunMode,
  RunStats,
  WalkResult,
} from '../domain/types.js';

interface TreeNode {
  readonly name: string;
  readonly directories: Map<string, TreeNode>;
  readonly files: Set<string>;
}

export class ReportWriter {
  async write(params: {
    readonly reportPath: string;
    readonly mode: RunMode;
    readonly walk: WalkResult;
    readonly detection: DetectionResult;
    readonly removal: RemovalResult;
  }): Promise<void> {
    await mkdir(dirname(params.reportPath), { recursive: true });
    const stats = this.buildStats(params.walk, params.detection, params.removal);
    const snapshotRemoved =
      params.mode === 'dry-run' ? params.removal.planned : params.removal.removed;

    const content = [
      'Duplicate Remover Report',
      '========================',
      '',
      `Generated at: ${new Date().toISOString()}`,
      `Mode: ${params.mode}`,
      `Root: ${params.walk.rootPath}`,
      '',
      this.renderStats(stats),
      this.renderGroups(params.detection.groups),
      this.renderRemoval(params.mode, params.removal),
      this.renderErrors(params.walk, params.detection, params.removal),
      'Filesystem Snapshot',
      '===================',
      this.renderSnapshot(params.walk, snapshotRemoved),
      '',
    ].join('\n');

    await writeFile(params.reportPath, content, 'utf8');
  }

  private buildStats(
    walk: WalkResult,
    detection: DetectionResult,
    removal: RemovalResult,
  ): RunStats {
    const duplicateFiles = detection.groups.flatMap((group) => group.duplicates);

    return {
      directoriesFound: walk.directories.length,
      filesFound: walk.files.length,
      duplicateGroupsFound: detection.groups.length,
      duplicateFilesFound: duplicateFiles.length,
      bucketsCreated: detection.bucketsCreated,
      candidateBuckets: detection.candidateBuckets,
      hashedFiles: detection.hashedFiles,
      bytesRecoverable: duplicateFiles.reduce((total, file) => total + file.sizeBytes, 0),
      bytesRemoved: removal.bytesRemoved,
      errorsFound: walk.errors.length + detection.errors.length + removal.failed.length,
    };
  }

  private renderStats(stats: RunStats): string {
    return [
      'Statistics',
      '==========',
      `Folders found: ${stats.directoriesFound}`,
      `Files found: ${stats.filesFound}`,
      `Buckets created: ${stats.bucketsCreated}`,
      `Candidate buckets: ${stats.candidateBuckets}`,
      `Files hashed: ${stats.hashedFiles}`,
      `Duplicate groups: ${stats.duplicateGroupsFound}`,
      `Duplicate files: ${stats.duplicateFilesFound}`,
      `Recoverable bytes: ${stats.bytesRecoverable}`,
      `Removed bytes: ${stats.bytesRemoved}`,
      `Errors: ${stats.errorsFound}`,
      '',
    ].join('\n');
  }

  private renderGroups(groups: DuplicateGroup[]): string {
    const lines = ['Duplicate Groups', '================'];

    if (groups.length === 0) {
      lines.push('No duplicates found.', '');
      return lines.join('\n');
    }

    groups.forEach((group, index) => {
      lines.push(
        `Group ${index + 1}: ${group.extension || '(no extension)'} | ${group.sizeBytes} bytes | ${group.md5}`,
        `Keep: ${group.keep.relativePath}`,
        'Duplicates:',
      );

      for (const duplicate of group.duplicates) {
        lines.push(`- ${duplicate.relativePath}`);
      }

      lines.push('');
    });

    return lines.join('\n');
  }

  private renderRemoval(mode: RunMode, removal: RemovalResult): string {
    const title = mode === 'dry-run' ? 'Planned Removals' : 'Removal Results';
    const actionLabel = mode === 'dry-run' ? 'Would remove' : 'Removed';
    const files = mode === 'dry-run' ? removal.planned : removal.removed;
    const lines = [title, '='.repeat(title.length)];

    if (files.length === 0) {
      lines.push('No files to remove.', '');
      return lines.join('\n');
    }

    for (const file of files) {
      lines.push(`${actionLabel}: ${file.relativePath} (${file.sizeBytes} bytes)`);
    }

    if (removal.failed.length > 0) {
      lines.push('', 'Failed removals:');
      for (const error of removal.failed) {
        lines.push(`- ${error.path}: ${error.message}`);
      }
    }

    lines.push('');
    return lines.join('\n');
  }

  private renderErrors(
    walk: WalkResult,
    detection: DetectionResult,
    removal: RemovalResult,
  ): string {
    const errors = [...walk.errors, ...detection.errors, ...removal.failed];
    const lines = ['Errors', '======'];

    if (errors.length === 0) {
      lines.push('No errors.', '');
      return lines.join('\n');
    }

    for (const error of errors) {
      lines.push(`- ${error.at.toISOString()} | ${error.phase} | ${error.path} | ${error.message}`);
    }

    lines.push('');
    return lines.join('\n');
  }

  private renderSnapshot(walk: WalkResult, removedFiles: FileEntry[]): string {
    const removed = new Set(removedFiles.map((file) => file.relativePath));
    const root: TreeNode = {
      name: basename(walk.rootPath),
      directories: new Map(),
      files: new Set(),
    };

    for (const directory of walk.directories) {
      if (directory.relativePath !== '.') {
        this.getOrCreateDirectory(root, directory.relativePath.split(sep));
      }
    }

    for (const file of walk.files) {
      if (removed.has(file.relativePath)) {
        continue;
      }

      const parts = file.relativePath.split(sep);
      const fileName = parts.pop();

      if (!fileName) {
        continue;
      }

      const directory = this.getOrCreateDirectory(root, parts);
      directory.files.add(fileName);
    }

    return this.renderNode(root).join('\n');
  }

  private getOrCreateDirectory(root: TreeNode, parts: string[]): TreeNode {
    let current = root;

    for (const part of parts) {
      if (part === '') {
        continue;
      }

      let next = current.directories.get(part);

      if (!next) {
        next = {
          name: part,
          directories: new Map(),
          files: new Set(),
        };
        current.directories.set(part, next);
      }

      current = next;
    }

    return current;
  }

  private renderNode(node: TreeNode, depth = 0): string[] {
    const prefix = depth === 0 ? '' : `${'  '.repeat(depth - 1)}|_`;
    const lines = [`${prefix}${node.name}/`];

    const directories = [...node.directories.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    const files = [...node.files].sort((left, right) => left.localeCompare(right));

    for (const directory of directories) {
      lines.push(...this.renderNode(directory, depth + 1));
    }

    for (const file of files) {
      lines.push(`${'  '.repeat(depth)}|_${file}`);
    }

    return lines;
  }
}
