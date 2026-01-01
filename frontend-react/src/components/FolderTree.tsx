import React, { useRef, useEffect } from 'react';
import { useTreeNavigation } from '../hooks/logic/useTreeNavigation';
import { useKeyLogger } from '../hooks/useKeyLogger';
import type { FileNode, Config } from '../types';
import { VirtualTreeList } from './tree/VirtualTreeList';
import { treeService } from '../services/tree/TreeService';
import { layoutService } from '../services/layout/LayoutService';
import { contextService, ContextKeys } from '../services/context/ContextService';

// Interfaces match previous definition to prevent breakage
export interface FolderTreeProps {
    root: FileNode;
    config: Config;
    onSelect: (node: FileNode | null) => void;
    onMerge: (node: FileNode, direction: 'left-to-right' | 'right-to-left') => void;
    onDelete: (node: FileNode, side: 'left' | 'right') => void;
    searchQuery?: string;
    setSearchQuery?: (q: string) => void;
    selectedNode?: FileNode | null;
    onFocus?: (node: FileNode) => void;
}

export interface FolderTreeHandle {
    selectNextNode: () => void;
    selectPrevNode: () => void;
    selectFirst: () => void;
    selectLast: () => void;
    selectNextChangedNode: () => void;
    selectPrevChangedNode: () => void;
    focus: () => void;
}

// Re-implemented FolderTree using Headless Hook
const FolderTreeComponent = React.forwardRef<FolderTreeHandle, FolderTreeProps>(({
    root, config, onSelect, onMerge, onDelete, searchQuery = "", selectedNode, onFocus
}, ref) => {

    // 0. Wrapper for Navigation Selection
    const onNavigationSelect = React.useCallback((node: FileNode) => {
        if (selectedNode) {
            onSelect(node);
        }
    }, [selectedNode, onSelect]);

    // 1. Use Headless Navigation Hook
    const {
        focusedPath,
        setFocusedPath,
        expandedPaths,
        toggleExpand,
        visibleNodes,
        moveFocus,
        selectNextChange,
        selectPrevChange
    } = useTreeNavigation(root, config, searchQuery, onNavigationSelect);

    // 2. Sync External Selection to Internal Focus
    useEffect(() => {
        if (selectedNode) {
            setFocusedPath(selectedNode.path);
        }
    }, [selectedNode, setFocusedPath]);

    // 3. Expose Methods via Ref
    const treeId = React.useRef(`tree-${Math.random().toString(36).substr(2, 9)}`).current;



    // Internal handle implementation
    const handle = React.useMemo(() => ({
        moveFocus: (dir: number) => moveFocus(dir), // Exposed for TreeService
        selectNextNode: () => moveFocus(1),
        selectPrevNode: () => moveFocus(-1),
        selectFirst: () => {
            if (visibleNodes.length > 0) {
                const first = visibleNodes[0];
                setFocusedPath(first.path);
                containerRef.current?.focus();
                if (first.type === 'file') onSelect(first);
            }
        },
        selectLast: () => {
            if (visibleNodes.length > 0) {
                const last = visibleNodes[visibleNodes.length - 1];
                setFocusedPath(last.path);
                containerRef.current?.focus();
                if (last.type === 'file') onSelect(last);
            }
        },
        selectNextChangedNode: selectNextChange,
        selectPrevChangedNode: selectPrevChange,
        focus: () => {
            if (containerRef.current) containerRef.current.focus();
        },
        toggleExpand, // Added for command support
        selectCurrent: () => { // Added for command support
            const node = visibleNodes.find(n => n.path === focusedPath);
            if (node) {
                if (node.type === 'directory') toggleExpand(node.path);
                else onSelect(node);
            }
        },
        // Helpers for commands
        expandPath: (path: string) => {
            if (!expandedPaths.has(path)) toggleExpand(path);
        },
        collapsePath: (path: string) => {
            if (expandedPaths.has(path)) toggleExpand(path);
        },
        refresh: () => { } // distinct from reload?
    }), [moveFocus, selectNextChange, selectPrevChange, toggleExpand, visibleNodes, focusedPath, onSelect, expandedPaths]);

    // Expose to Parent
    React.useImperativeHandle(ref, () => handle);

    // Register with TreeService
    useEffect(() => {
        // @ts-ignore
        treeService.register(treeId, handle);
        return () => treeService.unregister(treeId);
    }, [treeId, handle]);

    // Handle Focus/Blur for Context
    const focusTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleFocus = () => {
        // @ts-ignore
        contextService.set(ContextKeys.TREE_FOCUSED, true);
        treeService.setActive(treeId);

        // Debounce onFocus to prevent rapid re-renders in parent
        if (onFocus && focusedPath) {
            if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
            focusTimeoutRef.current = setTimeout(() => {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) onFocus(node);
            }, 50);
        }
    };

    // Clear timeout on unmount
    useEffect(() => () => {
        if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    }, []);

    // Sync focus when path changes (only if active)
    useEffect(() => {
        const isActive = document.activeElement === containerRef.current;
        if (isActive && focusedPath && onFocus) {
            if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
            focusTimeoutRef.current = setTimeout(() => {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) onFocus(node);
            }, 50);
        }
    }, [focusedPath, visibleNodes, onFocus]);

    const handleBlur = () => {
        // @ts-ignore
        contextService.set(ContextKeys.TREE_FOCUSED, false);
    };

    // 4. Keyboard Handling (Local)
    const containerRef = useRef<HTMLDivElement>(null);
    const { logKey } = useKeyLogger('FolderTree');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        logKey(e, { focusedPath, visibleCount: visibleNodes.length });

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        switch (e.key) {
            case 'ArrowDown':
                moveFocus(1);
                break;
            case 'ArrowUp':
                moveFocus(-1);
                break;
            case 'ArrowRight': {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) {
                    if (e.ctrlKey) {
                        if (node.status === 'added') onDelete(node, 'right');
                        else if (node.status === 'removed') onMerge(node, 'left-to-right');
                        else if (node.status === 'modified') onMerge(node, 'left-to-right');
                    } else if (node.type === 'directory') {
                        if (!expandedPaths.has(node.path)) toggleExpand(node.path);
                        else moveFocus(1); // Move to child
                    }
                }
                break;
            }
            case 'ArrowLeft': {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) {
                    if (e.ctrlKey) {
                        if (node.status === 'added') onMerge(node, 'right-to-left');
                        else if (node.status === 'removed') onDelete(node, 'left');
                        else if (node.status === 'modified') onMerge(node, 'right-to-left');
                    } else if (node.type === 'directory' && expandedPaths.has(node.path)) {
                        toggleExpand(node.path);
                    } else {
                        // Jump to Parent Logic
                        const currentIndex = visibleNodes.indexOf(node);
                        let parentIndex = -1;
                        for (let i = currentIndex - 1; i >= 0; i--) {
                            if ((visibleNodes[i] as any).depth < (node as any).depth) {
                                parentIndex = i;
                                break;
                            }
                        }
                        if (parentIndex !== -1) {
                            moveFocus(parentIndex - currentIndex);
                        }
                    }
                }
                break;
            }
            case ' ': {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) {
                    if (node.type === 'directory') toggleExpand(node.path);
                    else {
                        if (selectedNode?.path === node.path) {
                            onSelect(null);
                        } else {
                            onSelect(node);
                        }
                    }
                }
                break;
            }
            case 'Enter': {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) {
                    if (node.type === 'directory') toggleExpand(node.path);
                    else {
                        onSelect(node);
                        layoutService.focusContent();
                    }
                }
                break;
            }
        }
    };

    // 5. Scroll Into View
    useEffect(() => {
        if (focusedPath) {
            const el = document.querySelector(`[data-node-path="${CSS.escape(focusedPath)}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [focusedPath]);

    // 6. Memoized Stats
    const folderStats = React.useMemo(() => {
        const stats = new Map<string, { added: number, removed: number, modified: number }>();
        const traverse = (node: FileNode): { added: number, removed: number, modified: number } => {
            const current = { added: 0, removed: 0, modified: 0 };
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
            stats.set(node.path, current);
            return current;
        };
        if (root) traverse(root);
        return stats;
    }, [root]);

    // Shared Click Handler
    const handleNodeSelect = React.useCallback((n: FileNode) => {
        if (n.type === 'directory') {
            toggleExpand(n.path);
            containerRef.current?.focus();
        } else {
            onSelect(n);
            containerRef.current?.focus();
        }
    }, [toggleExpand, onSelect]);

    // Memoize Actions Object to prevent child re-renders
    const actions = React.useMemo(() => ({
        onSelect: handleNodeSelect,
        onMerge,
        onDelete,
        onFocus
    }), [onSelect, onMerge, onDelete, onFocus, toggleExpand]); // toggleExpand is stable from hook but good to include

    return (
        <div
            className="tree-container custom-scroll"
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
        >
            {visibleNodes.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
                    No files to display.
                </div>
            ) : config.viewOptions?.folderViewMode === 'unified' || config.viewOptions?.folderViewMode === 'flat' ? (
                <div className="tree-column unified" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <VirtualTreeList
                        visibleNodes={visibleNodes}
                        side="unified"
                        expandedPaths={expandedPaths}
                        focusedPath={focusedPath}
                        selectedPath={selectedNode?.path} // Pass Selection
                        onToggle={toggleExpand}
                        config={config}
                        searchQuery={searchQuery}
                        actions={actions}
                        folderStats={folderStats}
                    />
                </div>
            ) : (
                <div className="split-tree-view" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                    <div id="tree-left" className="tree-column" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <VirtualTreeList
                            visibleNodes={visibleNodes}
                            side="left"
                            expandedPaths={expandedPaths}
                            focusedPath={focusedPath}
                            selectedPath={selectedNode?.path} // Pass Selection
                            onToggle={toggleExpand}
                            config={config}
                            searchQuery={searchQuery}
                            actions={actions}
                            folderStats={folderStats}
                        />
                    </div>
                    <div id="tree-right" className="tree-column" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <VirtualTreeList
                            visibleNodes={visibleNodes}
                            side="right"
                            expandedPaths={expandedPaths}
                            focusedPath={focusedPath}
                            selectedPath={selectedNode?.path} // Pass Selection
                            onToggle={toggleExpand}
                            config={config}
                            searchQuery={searchQuery}
                            actions={actions}
                            folderStats={folderStats}
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

export const FolderTree = React.memo(FolderTreeComponent);
