import { describe, it, expect } from 'vitest';
import { statsService } from './StatsService';
import type { FileNode } from '../../types';

describe('StatsService', () => {
    const mockTree: FileNode = {
        name: 'root',
        path: '/',
        type: 'directory',
        status: 'modified',
        children: [
            { name: 'added.txt', path: '/added.txt', type: 'file', status: 'added' },
            { name: 'removed.txt', path: '/removed.txt', type: 'file', status: 'removed' },
            { name: 'modified.txt', path: '/modified.txt', type: 'file', status: 'modified' },
            { name: 'same.txt', path: '/same.txt', type: 'file', status: 'same' },
            {
                name: 'sub', path: '/sub', type: 'directory', status: 'modified',
                children: [
                    { name: 'sub-added.txt', path: '/sub/a.txt', type: 'file', status: 'added' }
                ]
            }
        ]
    };

    it('should calculate global stats correctly', () => {
        const stats = statsService.calculateGlobal(mockTree);
        expect(stats).toEqual({ added: 2, removed: 1, modified: 1 });
    });

    it('should calculate folder stats correctly', () => {
        const subFolder = mockTree.children![4];
        const stats = statsService.calculateFolder(subFolder);
        expect(stats).toEqual({ added: 1, removed: 0, modified: 0 });
    });

    it('should map all folders to stats', () => {
        const map = statsService.mapAllFolders(mockTree);
        expect(map.get('/')).toEqual({ added: 2, removed: 1, modified: 1 });
        expect(map.get('/sub')).toEqual({ added: 1, removed: 0, modified: 0 });
    });

    it('should calculate line stats from unified diff', () => {
        const diff = [
            '@@ -1,3 +1,4 @@',
            ' same line',
            '-removed line',
            '+added line',
            '+another added line'
        ];
        const stats = statsService.calculateLineStats(diff);
        expect(stats).toEqual({ added: 2, removed: 1, groups: 1 });
    });
});
