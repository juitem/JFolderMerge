import { describe, it, expect, vi } from 'vitest';
import { fileMutationService } from './FileMutationService';
import { api } from '../../api';

// Mock API
vi.mock('../../api', () => ({
    api: {
        saveFile: vi.fn().mockResolvedValue({ success: true }),
        copyItem: vi.fn().mockResolvedValue({ success: true }),
        deleteItem: vi.fn().mockResolvedValue({ success: true })
    }
}));

describe('FileMutationService', () => {
    const originalContent = "line1\nline2\nline3";

    it('should insert a line correctly', async () => {
        const result = await fileMutationService.applyLineChange('/', originalContent, {
            type: 'insert',
            lineIndex: 1,
            text: "new-line"
        });
        expect(result.content).toBe("line1\nnew-line\nline2\nline3");
        expect(api.saveFile).toHaveBeenCalled();
    });

    it('should delete a line correctly', async () => {
        const result = await fileMutationService.applyLineChange('/', originalContent, {
            type: 'delete',
            lineIndex: 2
        });
        expect(result.content).toBe("line1\nline3");
    });

    it('should replace a line correctly', async () => {
        const result = await fileMutationService.applyLineChange('/', originalContent, {
            type: 'replace',
            lineIndex: 2,
            text: "replaced"
        });
        expect(result.content).toBe("line1\nreplaced\nline3");
    });

    it('should apply bulk patches in reverse order to maintain indices', async () => {
        const result = await fileMutationService.applyBulkPatch('/', originalContent, [
            { type: 'replace', anchor: 1, lines: ["R1"] },
            { type: 'insert', anchor: 2, lines: ["I2.1", "I2.2"] },
            { type: 'delete', anchor: 3, lines: ["L3"] }
        ]);

        // Step by step (logical reverse):
        // 1. Delete line 3: "line1\nline2"
        // 2. Insert at 2: "line1\nline2\nI2.1\nI2.2" (Wait, anchor 2 is index 1? Or 2-indexed? Lines.splice(2, 0, ...))
        // Actually FileMutationService.ts:
        // delete: lines.splice(anchor - 1, count)
        // insert: lines.splice(anchor, 0, ...lines)
        // replace: lines.splice(anchor - 1, count, ...lines)

        // Let's re-verify logic:
        // "line1", "line2", "line3"
        // P[3]: delete 3 -> ["line1", "line2"]
        // P[2]: insert at 2 -> ["line1", "line2", "I2.1", "I2.2"]
        // P[1]: replace 1 -> ["R1", "line2", "I2.1", "I2.2"]

        expect(result.content).toBe("R1\nline2\nI2.1\nI2.2");
    });

    it('should execute mergeBatch correctly', async () => {
        const items = [
            { src: 's1', dest: 'd1', isDir: false },
            { src: 's2', dest: 'd2', isDir: true }
        ];
        const result = await fileMutationService.mergeBatch(items);
        expect(result).toHaveLength(2);
        expect(result[0].success).toBe(true);
        expect(api.copyItem).toHaveBeenCalledTimes(2);
    });

    it('should execute deleteBatch correctly', async () => {
        const paths = ['p1', 'p2'];
        const result = await fileMutationService.deleteBatch(paths);
        expect(result).toHaveLength(2);
        expect(result[1].success).toBe(true);
        expect(api.deleteItem).toHaveBeenCalledTimes(2);
    });
});
