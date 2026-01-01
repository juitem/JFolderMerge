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

            const nodeWithDepth = { ...n, depth };

            list.push(nodeWithDepth);
            if (n.type === 'directory' && expandedPaths.has(n.path) && n.children) {
                n.children.forEach(child => traverse(child, depth + 1));
            }
        };
        traverse(root, 0);
        return list;
    }, [root, config, searchQuery, expandedPaths]);

    // [AUTO-EXPAND] Compute ALL potential searchable nodes (Ignoring collapse state)
    const allNodes = useMemo(() => {
        if (!root || !config) return [];
        const list: FileNode[] = [];
        const filters = config.folderFilters || { same: true, modified: true, added: true, removed: true };

        const traverse = (n: FileNode) => {
            // Respect filters & Search, but NOT expansion
            if (!isNodeVisible(n, filters)) return;
            if (searchQuery && !matchesSearch(n, searchQuery)) return;

            list.push(n);
            if (n.type === 'directory' && n.children) {
                n.children.forEach(traverse);
            }
        };
        traverse(root);
        return list;
    }, [root, config, searchQuery]);

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

    const selectNextChange = useCallback(() => {
        // [AUTO-EXPAND] Use allNodes (ignoring collapse state) to find hidden changes
        if (!allNodes || allNodes.length === 0) return;

        let currentIndex = -1;
        if (effectivePath) currentIndex = allNodes.findIndex(n => n.path === effectivePath);

        // Scan forward in ALL nodes
        for (let i = 1; i <= allNodes.length; i++) {
            const idx = (currentIndex + i) % allNodes.length;
            const node = allNodes[idx];

            // Skip directories for "Next Change" (usually want files), or allow? 
            // Usually we want *files* with changes.
            if (node.status !== 'same' && node.type !== 'directory') {
                // FOUND!
                // 1. Expand Parents
                const parts = node.path.split('/');
                const parentsToExpand = new Set<string>();
                let currentPath = "";
                // Reconstruct paths: /root, /root/A, ...
                // Assuming path starts with /
                for (let j = 1; j < parts.length - 1; j++) {
                    currentPath += "/" + parts[j];
                    parentsToExpand.add(currentPath);
                }

                if (parentsToExpand.size > 0) {
                    setExpandedPaths(prev => {
                        const next = new Set(prev);
                        parentsToExpand.forEach(p => next.add(p));
                        return next;
                    });
                }

                // 2. Focus
                setFocusedPath(node.path);
                if (onSelect) onSelect(node);
                return;
            }
        }
    }, [allNodes, effectivePath, onSelect]);

    const selectPrevChange = useCallback(() => {
        if (!allNodes || allNodes.length === 0) return;

        let currentIndex = -1;
        if (effectivePath) currentIndex = allNodes.findIndex(n => n.path === effectivePath);

        // Scan backward
        for (let i = 1; i <= allNodes.length; i++) {
            const idx = (currentIndex - i + allNodes.length) % allNodes.length;
            const node = allNodes[idx];

            if (node.status !== 'same' && node.type !== 'directory') {
                // FOUND!
                // 1. Expand Parents
                const parts = node.path.split('/');
                const parentsToExpand = new Set<string>();
                let currentPath = "";
                for (let j = 1; j < parts.length - 1; j++) {
                    currentPath += "/" + parts[j];
                    parentsToExpand.add(currentPath);
                }

                if (parentsToExpand.size > 0) {
                    setExpandedPaths(prev => {
                        const next = new Set(prev);
                        parentsToExpand.forEach(p => next.add(p));
                        return next;
                    });
                }

                // 2. Focus
                setFocusedPath(node.path);
                if (onSelect) onSelect(node);
                return;
            }
        }
    }, [allNodes, effectivePath, onSelect]);

    return {
        focusedPath: effectivePath, // Return Derived Focus
        setFocusedPath,
        expandedPaths,
        toggleExpand,
        visibleNodes,
        moveFocus,
        selectNextChange,
        selectPrevChange,
        focusNode
    };
};
