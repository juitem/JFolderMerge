import type { FileNode } from '../../types';

export interface NodeStats {
    added: number;
    removed: number;
    modified: number;
}

class StatsService {
    calculateGlobal(root: FileNode | null): NodeStats {
        if (!root) return { added: 0, removed: 0, modified: 0 };

        const stats: NodeStats = { added: 0, removed: 0, modified: 0 };
        const traverse = (node: FileNode) => {
            if (node.type === 'file') {
                if (node.status === 'added') stats.added++;
                if (node.status === 'removed') stats.removed++;
                if (node.status === 'modified') stats.modified++;
            }
            node.children?.forEach(traverse);
        };

        traverse(root);
        return stats;
    }

    calculateFolder(node: FileNode): NodeStats {
        const stats: NodeStats = { added: 0, removed: 0, modified: 0 };
        const traverse = (n: FileNode) => {
            if (n.type === 'file') {
                if (n.status === 'added') stats.added++;
                if (n.status === 'removed') stats.removed++;
                if (n.status === 'modified') stats.modified++;
            }
            n.children?.forEach(traverse);
        };

        traverse(node);
        return stats;
    }

    /**
     * Generates a Map of path -> Stats for all folders in the tree.
     * Useful for memoized rendering in the tree view.
     */
    mapAllFolders(root: FileNode | null): Map<string, NodeStats> {
        const map = new Map<string, NodeStats>();
        if (!root) return map;

        const traverse = (node: FileNode): NodeStats => {
            const current: NodeStats = { added: 0, removed: 0, modified: 0 };

            if (node.type === 'file') {
                if (node.status === 'added') current.added = 1;
                if (node.status === 'removed') current.removed = 1;
                if (node.status === 'modified') current.modified = 1;
            } else if (node.children) {
                for (const child of node.children) {
                    const s = traverse(child);
                    current.added += s.added;
                    current.removed += s.removed;
                    current.modified += s.modified;
                }
            }

            map.set(node.path, current);
            return current;
        };

        traverse(root);
        return map;
    }

    calculateLineStats(unifiedDiff: string[] | undefined): { added: number, removed: number, groups: number } {
        if (!unifiedDiff) return { added: 0, removed: 0, groups: 0 };

        let added = 0;
        let removed = 0;
        let groups = 0;

        unifiedDiff.forEach(line => {
            if (line.startsWith('@@')) {
                groups++;
                return;
            }
            if (line.startsWith('+') && !line.startsWith('+++')) added++;
            if (line.startsWith('-') && !line.startsWith('---')) removed++;
        });

        return { added, removed, groups };
    }
}

export const statsService = new StatsService();
