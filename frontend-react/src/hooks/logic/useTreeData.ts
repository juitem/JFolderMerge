import { useState, useEffect, useCallback } from 'react';
import { useFolderCompare } from '../useFolderCompare';
import type { FileNode } from '../../types';

export const useTreeData = () => {
    const { treeData: rawData, loading, error, compare } = useFolderCompare();
    const [treeData, setTreeData] = useState<FileNode | null>(null);

    // Sync when raw data changes (initial load or full reload)
    useEffect(() => {
        setTreeData(rawData);
    }, [rawData]);

    // Partial Update / Patch
    const patchNode = useCallback((path: string, updates: Partial<FileNode>) => {
        setTreeData(prevTree => {
            if (!prevTree) return null;

            // Helper to recursively find and update the node
            // We use a simplified immutable update pattern
            const updateRecursive = (node: FileNode): FileNode => {
                if (node.path === path) {
                    return { ...node, ...updates };
                }

                if (node.children) {
                    return {
                        ...node,
                        children: node.children.map(updateRecursive)
                    };
                }

                return node;
            };

            return updateRecursive(prevTree);
        });
    }, []);

    // Remove Node (Optimistic Delete)
    const removeNode = useCallback((path: string) => {
        setTreeData(prevTree => {
            if (!prevTree) return null;

            const removeRecursive = (node: FileNode): FileNode | null => {
                if (node.path === path) return null; // Remove this node

                if (node.children) {
                    const newChildren = node.children
                        .map(removeRecursive)
                        .filter((n): n is FileNode => n !== null);

                    if (newChildren.length !== node.children.length) {
                        return { ...node, children: newChildren };
                    }
                }
                return node;
            };

            // Handle root deletion case
            if (prevTree.path === path) return null;

            return removeRecursive(prevTree);
        });
    }, []);

    return {
        treeData,
        loading,
        error,
        compare,
        patchNode,
        removeNode
    };
};
