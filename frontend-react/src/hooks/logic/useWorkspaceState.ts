import { useState, useCallback, useEffect } from 'react';
import { useConfig } from '../../contexts/ConfigContext';
import { useTreeData } from './useTreeData';
import type { FileNode } from '../../types';

export const useWorkspaceState = () => {
    const { config: _config } = useConfig();

    // Path State
    const [leftPath, setLeftPath] = useState("");
    const [rightPath, setRightPath] = useState("");

    // Tree Data (with Patching capability)
    const { treeData, loading, error, compare, patchNode, removeNode } = useTreeData();

    // Selection State
    const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);

    // Sync Node Selection on Reload
    // When treeData refreshes, we want to keep selection if possible
    useEffect(() => {
        if (!treeData || !selectedNode) return;

        // Find updated node
        const findNode = (n: FileNode, path: string): FileNode | null => {
            if (n.path === path) return n;
            if (n.children) {
                for (const child of n.children) {
                    const found = findNode(child, path);
                    if (found) return found;
                }
            }
            return null;
        };

        const current = findNode(treeData, selectedNode.path);
        if (current && current !== selectedNode) {
            setSelectedNode(current);
        }
    }, [treeData]);


    const handleCompare = useCallback(() => {
        // Trigger comparison
        // We need exclude settings. They usually come from UI or Config.
        // For now, we assume they are passed or managed elsewhere?
        // Wait, useAppLogic managed them.
        // Let's accept them as args to this function or keep them in this hook.
        // Ideally workspace state includes filter state.
    }, []);

    return {
        leftPath, setLeftPath,
        rightPath, setRightPath,
        treeData,
        loading,
        error,
        compare,       // Exposed basic compare
        patchNode,     // Exposed for optimistic updates
        removeNode,    // Exposed for optimistic updates
        selectedNode, setSelectedNode,
        handleCompare
    };
};
