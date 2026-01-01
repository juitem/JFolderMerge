import { useState, useCallback, useMemo, useEffect } from 'react';
import type { FileNode, Config } from '../../types';

// Helper: Is Node Visible based on Config Filters?
const isNodeVisible = (node: FileNode, filters: Record<string, any>): boolean => {
    if (filters[node.status] !== false) return true;
    if (node.type === 'directory' && node.children) {
        return node.children.some(child => isNodeVisible(child, filters));
    }
    return false;
};

// Helper: Matches Search?
const matchesSearch = (n: FileNode, query: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    const matchName = n.name.toLowerCase().includes(q) ||
        (n.left_name && n.left_name.toLowerCase().includes(q)) ||
        (n.right_name && n.right_name.toLowerCase().includes(q));

    if (matchName) return true;
    if (n.children) return n.children.some(child => matchesSearch(child, query));
    return false;
};

export const useTreeNavigation = (
    root: FileNode | null,
    config: Config | null,
    searchQuery: string = "",
    onSelect?: (node: FileNode) => void
) => {
    const [focusedPath, setFocusedPath] = useState<string | null>(null);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

    // 1. Auto-Expand on Load
    useEffect(() => {
        if (!root) return;
        const allPaths = new Set<string>();
        const traverse = (node: FileNode) => {
            if (node.type === 'directory') {
                allPaths.add(node.path);
                if (node.children) node.children.forEach(traverse);
            }
        };
        traverse(root);
        setExpandedPaths(allPaths);
    }, [root]);

    // 2. Compute Visible Nodes (Flattened)
    const visibleNodes = useMemo(() => {
        if (!root || !config) return [];
        const list: FileNode[] = [];
        const filters = config.folderFilters || { same: true, modified: true, added: true, removed: true };

        const traverse = (n: FileNode, depth: number) => {
            if (!isNodeVisible(n, filters)) return;
            if (searchQuery && !matchesSearch(n, searchQuery)) return;

            // Clone node to add depth without mutating original data
            // (Or just mutate if we own the data? Better to shallow clone for React)
            const nodeWithDepth = { ...n, depth };

            list.push(nodeWithDepth);
            if (n.type === 'directory' && expandedPaths.has(n.path) && n.children) {
                n.children.forEach(child => traverse(child, depth + 1));
            }
        };
        traverse(root, 0);
        return list;
    }, [root, config, searchQuery, expandedPaths]);

    // 3. Navigation Actions
    const toggleExpand = useCallback((path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }, []);


    const focusNode = useCallback((path: string) => {
        setFocusedPath(path);
        // We might want to scroll into view here or in the UI layer
    }, []);

    const moveFocus = useCallback((delta: number) => {
        if (visibleNodes.length === 0) return;

        let currentIndex = -1;
        if (focusedPath) {
            currentIndex = visibleNodes.findIndex(n => n.path === focusedPath);
        }

        let nextIndex = currentIndex + delta;
        // Wrap around? Or clamp? 
        // User requested Wrap-around in previous tasks.
        if (nextIndex < 0) nextIndex = visibleNodes.length - 1;
        if (nextIndex >= visibleNodes.length) nextIndex = 0;

        const nextNode = visibleNodes[nextIndex];
        setFocusedPath(nextNode.path);

        // Auto-select ONLY if it's a file? Or just focus?
        // Usually just focus. 
    }, [visibleNodes, focusedPath]);

    const selectNextChange = useCallback(() => {
        if (visibleNodes.length === 0) return;
        let currentIndex = -1;
        if (focusedPath) currentIndex = visibleNodes.findIndex(n => n.path === focusedPath);

        // Scan forward
        for (let i = 1; i <= visibleNodes.length; i++) {
            const idx = (currentIndex + i) % visibleNodes.length;
            const node = visibleNodes[idx];
            if (node.status !== 'same' && node.type !== 'directory') {
                setFocusedPath(node.path);
                if (onSelect) onSelect(node);
                return;
            }
        }
    }, [visibleNodes, focusedPath, onSelect]);

    const selectPrevChange = useCallback(() => {
        if (visibleNodes.length === 0) return;
        let currentIndex = -1;
        if (focusedPath) currentIndex = visibleNodes.findIndex(n => n.path === focusedPath);

        // Scan backward
        for (let i = 1; i <= visibleNodes.length; i++) {
            const idx = (currentIndex - i + visibleNodes.length) % visibleNodes.length;
            const node = visibleNodes[idx];
            if (node.status !== 'same' && node.type !== 'directory') {
                setFocusedPath(node.path);
                if (onSelect) onSelect(node);
                return;
            }
        }
    }, [visibleNodes, focusedPath, onSelect]);

    return {
        focusedPath,
        setFocusedPath,
        expandedPaths,
        toggleExpand,
        visibleNodes,
        moveFocus,
        selectNextChange,
        selectPrevChange,
        focusNode // Expose
    };
};
