import { api } from '../../api';
import { loggingService } from '../infrastructure/LoggingService';

export interface FileMutationResult {
    success: boolean;
    content?: string;
    error?: string;
}

class FileMutationService {
    private module = 'MutationService';

    async applyLineChange(
        path: string,
        currentContent: string,
        change: {
            type: 'insert' | 'replace' | 'delete';
            lineIndex: number; // 1-indexed
            text?: string;
            deleteCount?: number;
        }
    ): Promise<FileMutationResult> {
        loggingService.info(this.module, `Applying line change to ${path}`, change);

        let lines = currentContent.split(/\r?\n/);

        try {
            if (change.type === 'delete') {
                lines.splice(change.lineIndex - 1, change.deleteCount || 1);
            } else if (change.type === 'replace') {
                lines[change.lineIndex - 1] = change.text || "";
            } else if (change.type === 'insert') {
                lines.splice(change.lineIndex, 0, change.text || "");
            }

            const newContent = lines.join('\n');
            await api.saveFile(path, newContent);

            return { success: true, content: newContent };
        } catch (e: any) {
            loggingService.error(this.module, `Failed to apply line change to ${path}`, e);
            return { success: false, error: e.message };
        }
    }

    async applyBulkPatch(
        path: string,
        currentContent: string,
        patches: Array<{
            type: 'insert' | 'delete' | 'replace';
            anchor: number; // 1-indexed
            lines: string[];
            deleteCount?: number;
        }>
    ): Promise<FileMutationResult> {
        loggingService.info(this.module, `Applying bulk patch to ${path}`, { count: patches.length });

        let lines = currentContent.split(/\r?\n/);

        try {
            // Sort patches in reverse order to maintain indices
            const sortedPatches = [...patches].sort((a, b) => b.anchor - a.anchor);

            for (const p of sortedPatches) {
                if (p.type === 'delete') {
                    lines.splice(p.anchor - 1, p.lines.length);
                } else if (p.type === 'insert') {
                    lines.splice(p.anchor, 0, ...p.lines);
                } else if (p.type === 'replace') {
                    const deleteCount = p.deleteCount || p.lines.length;
                    lines.splice(p.anchor - 1, deleteCount, ...p.lines);
                }
            }

            const newContent = lines.join('\n');
            await api.saveFile(path, newContent);

            return { success: true, content: newContent };
        } catch (e: any) {
            loggingService.error(this.module, `Failed to apply bulk patch to ${path}`, e);
            return { success: false, error: e.message };
        }
    }

    async mergeFile(src: string, dest: string, isDir: boolean): Promise<boolean> {
        loggingService.info(this.module, `Merging ${src} into ${dest}`);
        try {
            await api.copyItem(src, dest, isDir);
            return true;
        } catch (e: any) {
            loggingService.error(this.module, `Merge failed: ${src} -> ${dest}`, e);
            throw e;
        }
    }

    async deleteItem(path: string): Promise<boolean> {
        loggingService.info(this.module, `Deleting item: ${path}`);
        try {
            await api.deleteItem(path);
            return true;
        } catch (e: any) {
            loggingService.error(this.module, `Delete failed: ${path}`, e);
            throw e;
        }
    }

    async mergeBatch(items: { src: string, dest: string, isDir: boolean }[]): Promise<Array<{ path: string, success: boolean, error?: string }>> {
        loggingService.info(this.module, `Starting batch merge of ${items.length} items`);
        const results = [];
        for (const item of items) {
            try {
                await this.mergeFile(item.src, item.dest, item.isDir);
                results.push({ path: item.src, success: true });
            } catch (e: any) {
                results.push({ path: item.src, success: false, error: e.message });
            }
        }
        return results;
    }

    async deleteBatch(paths: string[]): Promise<Array<{ path: string, success: boolean, error?: string }>> {
        loggingService.info(this.module, `Starting batch delete of ${paths.length} items`);
        const results = [];
        for (const path of paths) {
            try {
                await this.deleteItem(path);
                results.push({ path, success: true });
            } catch (e: any) {
                results.push({ path, success: false, error: e.message });
            }
        }
        return results;
    }
}

export const fileMutationService = new FileMutationService();
