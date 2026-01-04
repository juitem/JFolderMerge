import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
    onSelect?: (node: FileNode) => void,
    hiddenPaths?: Set<string>,
    showHidden?: boolean
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

            const isHidden = !!hiddenPaths?.has(n.path);
            if (isHidden && !showHidden) return; // Skip if hidden and not showing hidden

            const nodeWithDepth = { ...n, depth, isHidden };

            list.push(nodeWithDepth);
            if (n.type === 'directory' && expandedPaths.has(n.path) && n.children) {
                n.children.forEach(child => traverse(child, depth + 1));
            }
        };
        traverse(root, 0);
        return list;
    }, [root, config, searchQuery, expandedPaths, hiddenPaths, showHidden]);

    // [AUTO-EXPAND] Compute ALL potential searchable nodes (Ignoring collapse state)
    const allNodes = useMemo(() => {
        if (!root || !config) return [];
        const list: FileNode[] = [];
        const filters = config.folderFilters || { same: true, modified: true, added: true, removed: true };

        const traverse = (n: FileNode) => {
            // Respect filters & Search, but NOT expansion
            if (!isNodeVisible(n, filters)) return;
            if (searchQuery && !matchesSearch(n, searchQuery)) return;

            const isHidden = !!hiddenPaths?.has(n.path);
            if (isHidden && !showHidden) return; // Skip if hidden and not showing hidden

            list.push(n);
            if (n.type === 'directory' && n.children) {
                n.children.forEach(traverse);
            }
        };
        traverse(root);
        return list;
    }, [root, config, searchQuery, hiddenPaths, showHidden]);

    // [STABILITY] Derived Focus State (Synchronous)
    // Instead of waiting for useEffect to repair, we calculate the "Effective" focus during render.
    // This prevents "flicker" and ensures moveFocus always starts from a valid place.
    const lastValidIndex = useRef<number>(0); // Default to 0

    // 1. Resolve Effective Focus
    let effectivePath = focusedPath;
    let effectiveIndex = -1;

    // Check availability
    if (visibleNodes.length > 0) {
        // Try strict match
        if (focusedPath) {
            effectiveIndex = visibleNodes.findIndex(n => n.path === focusedPath);
        }

        // If invalid, fallback to last known valid index (Clamped)
        if (effectiveIndex === -1) {
            let fallback = lastValidIndex.current;
            if (fallback >= visibleNodes.length) fallback = visibleNodes.length - 1;
            if (fallback < 0) fallback = 0;

            effectiveIndex = fallback;
            effectivePath = visibleNodes[fallback]?.path || null;

            // [OPTIONAL] Sync back to state immediately? 
            // Better to let visual be stable, and update state on next interaction or effect?
            // If we don't sync, 'focusedPath' remains null/stale in state vs effective.
            // Let's rely on 'effectivePath' for rendering and interaction.
        } else {
            // Update cache
            lastValidIndex.current = effectiveIndex;
        }
    } else {
        effectivePath = null;
        effectiveIndex = -1;
    }

    // 2. Navigation Actions use Effective Path
    const moveFocus = useCallback((delta: number) => {
        if (visibleNodes.length === 0) return;

        // Start from Effective Index (never -1 if list has items)
        let currentIndex = effectiveIndex;

        // Double check bounds (paranoid)
        if (currentIndex === -1) currentIndex = 0;

        let nextIndex = currentIndex + delta;

        // [LOGIC] Wrap Handling
        if (nextIndex < 0) {
            nextIndex = visibleNodes.length - 1; // Wrap to Bottom
        } else if (nextIndex >= visibleNodes.length) {
            nextIndex = 0; // Wrap to Top
        }

        const nextNode = visibleNodes[nextIndex];

        // [DEBUG]
        console.debug(`[Navigation] Move ${currentIndex} -> ${nextIndex} (${nextNode.path})`);

        setFocusedPath(nextNode.path);
        // Updating state will trigger re-render, and effectiveIndex will match new path
    }, [visibleNodes, effectiveIndex]); // Depend on effectiveIndex (derived)

    // Unused repair effect removed.

    const focusNode = useCallback((path: string) => {
        setFocusedPath(path);
    }, []);

    // 3. Navigation Actions
    const toggleExpand = useCallback((path: string) => {
        // [DESIGN] Prevent Root from being collapsed to ensure tree visibility
        if (root && path === root.path) return;

        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }, [root]);

    const expandParents = useCallback((path: string) => {
        const parts = path.split('/');
        const parentsToExpand = new Set<string>();

        let currentPath = path.startsWith('/') ? '/' : '';
        for (let j = 0; j < parts.length - 1; j++) {
            const part = parts[j];
            if (part === '') continue;

            if (currentPath !== '' && currentPath !== '/') {
                currentPath += '/';
            }
            currentPath += part;
            parentsToExpand.add(currentPath);
        }

        if (parentsToExpand.size > 0) {
            setExpandedPaths(prev => {
                const next = new Set(prev);
                parentsToExpand.forEach(p => next.add(p));
                return next;
            });
        }
    }, []);

    const selectNextChange = useCallback(() => {
        if (!allNodes || allNodes.length === 0) return;

        // Find any changed file (not same) - Filter first to quick check
        const hasChanges = allNodes.some(n => (n.status !== 'same' && n.status !== undefined) && n.type !== 'directory');
        if (!hasChanges) return;

        let startIndex = -1;
        if (effectivePath) {
            startIndex = allNodes.findIndex(n => n.path === effectivePath);
        }

        // Search forwards from startIndex + 1
        for (let i = 1; i < allNodes.length; i++) {
            const idx = (startIndex + i) % allNodes.length;
            const node = allNodes[idx];

            // Skip directories and valid status check
            if (node.type !== 'directory' && node.status && node.status !== 'same') {
                expandParents(node.path);
                setFocusedPath(node.path);
                if (onSelect) onSelect(node);
                return;
            }
        }
    }, [allNodes, effectivePath, onSelect, expandParents]);

    const selectPrevChange = useCallback(() => {
        if (!allNodes || allNodes.length === 0) return;
        let currentIndex = -1;
        if (effectivePath) currentIndex = allNodes.findIndex(n => n.path === effectivePath);

        for (let i = 1; i <= allNodes.length; i++) {
            const idx = (currentIndex - i + allNodes.length) % allNodes.length;
            const node = allNodes[idx];
            if (node.status !== 'same' && node.type !== 'directory') {
                expandParents(node.path);
                setFocusedPath(node.path);
                if (onSelect) onSelect(node);
                return;
            }
        }
    }, [allNodes, effectivePath, onSelect, expandParents]);

    const selectFirstChange = useCallback(() => {
        if (!allNodes || allNodes.length === 0) return;
        for (let i = 0; i < allNodes.length; i++) {
            const node = allNodes[i];
            if (node.status !== 'same' && node.type !== 'directory') {
                expandParents(node.path);
                setFocusedPath(node.path);
                if (onSelect) onSelect(node);
                return;
            }
        }
    }, [allNodes, onSelect, expandParents]);

    const selectLastChange = useCallback(() => {
        if (!allNodes || allNodes.length === 0) return;
        for (let i = allNodes.length - 1; i >= 0; i--) {
            const node = allNodes[i];
            if (node.status !== 'same' && node.type !== 'directory') {
                expandParents(node.path);
                setFocusedPath(node.path);
                if (onSelect) onSelect(node);
                return;
            }
        }
    }, [allNodes, onSelect, expandParents]);

    const selectNextStatus = useCallback((status: 'added' | 'removed' | 'modified') => {
        if (!allNodes || allNodes.length === 0) return;
        let currentIndex = -1;
        if (effectivePath) currentIndex = allNodes.findIndex(n => n.path === effectivePath);

        for (let i = 1; i <= allNodes.length; i++) {
            const idx = (currentIndex + i) % allNodes.length;
            const node = allNodes[idx];

            if (node.status === status && node.type !== 'directory') {
                expandParents(node.path);
                setFocusedPath(node.path);
                if (onSelect) onSelect(node);
                return;
            }
        }
    }, [allNodes, effectivePath, onSelect, expandParents]);

    const selectPrevStatus = useCallback((status: 'added' | 'removed' | 'modified') => {
        if (!allNodes || allNodes.length === 0) return;
        let currentIndex = -1;
        if (effectivePath) currentIndex = allNodes.findIndex(n => n.path === effectivePath);

        for (let i = 1; i <= allNodes.length; i++) {
            const idx = (currentIndex - i + allNodes.length) % allNodes.length;
            const node = allNodes[idx];

            if (node.status === status && node.type !== 'directory') {
                expandParents(node.path);
                setFocusedPath(node.path);
                if (onSelect) onSelect(node);
                return;
            }
        }
    }, [allNodes, effectivePath, onSelect, expandParents]);

    return {
        focusedPath: effectivePath, // Return Derived Focus
        setFocusedPath,
        expandedPaths,
        toggleExpand,
        visibleNodes,
        moveFocus,
        selectNextChange,
        selectPrevChange,
        selectFirstChange,
        selectLastChange,
        selectNextStatus,
        selectPrevStatus,
        focusNode
    };
};
