import { api } from '../api';
import type { FileNode } from '../types';

export function useFileSystem(reloadCallback: () => void) {
    const copyItem = async (node: FileNode, direction: 'left-to-right' | 'right-to-left', leftPath: string, rightPath: string) => {
        const src = direction === 'left-to-right' ? `${leftPath}/${node.path}` : `${rightPath}/${node.path}`;
        const dest = direction === 'left-to-right' ? `${rightPath}/${node.path}` : `${leftPath}/${node.path}`;
        const isDir = node.type === 'directory';

        await api.copyItem(src, dest, isDir);
        reloadCallback();
    };

    const deleteItem = async (node: FileNode, side: 'left' | 'right', leftPath: string, rightPath: string) => {
        const path = side === 'left' ? `${leftPath}/${node.path}` : `${rightPath}/${node.path}`;
        await api.deleteItem(path);
        reloadCallback();
    };

    return {
        copyItem,
        deleteItem
    };
}
