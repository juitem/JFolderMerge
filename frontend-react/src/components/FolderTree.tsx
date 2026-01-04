import React, { useRef, useEffect } from 'react';
import { useTreeNavigation } from '../hooks/logic/useTreeNavigation';
import { useKeyLogger } from '../hooks/useKeyLogger';
import type { FileNode, Config } from '../types';
import { VirtualTreeList } from './tree/VirtualTreeList';
import { treeService } from '../services/tree/TreeService';
import { layoutService } from '../services/layout/LayoutService';
import { contextService, ContextKeys } from '../services/context/ContextService';
import { StatusBar } from './StatusBar';
import { SelectionPopup } from './tree/SelectionPopup';

// Helper component to sync scroll between two trees
const TreeScrollerSync: React.FC<{
    children: (refs: { left: React.RefObject<HTMLElement | Window | null>, right: React.RefObject<HTMLElement | Window | null> }) => React.ReactNode,
    visibleNodes: any[]
}> = ({ children, visibleNodes }) => {
    const leftRef = useRef<HTMLElement | Window | null>(null);
    const rightRef = useRef<HTMLElement | Window | null>(null);
    const isScrolling = useRef<string | null>(null);

    useEffect(() => {
        const left = leftRef.current;
        const right = rightRef.current;
        if (!left || !right) return;

        // Sync logic only works if both are HTMLElements for now
        if (!(left instanceof HTMLElement) || !(right instanceof HTMLElement)) return;

        const onScrollLeft = () => {
            if (isScrolling.current && isScrolling.current !== 'left') return;
            isScrolling.current = 'left';
            right.scrollTop = left.scrollTop;
            right.scrollLeft = left.scrollLeft;
            setTimeout(() => { if (isScrolling.current === 'left') isScrolling.current = null; }, 50);
        };

        const onScrollRight = () => {
            if (isScrolling.current && isScrolling.current !== 'right') return;
            isScrolling.current = 'right';
            left.scrollTop = right.scrollTop;
            left.scrollLeft = right.scrollLeft;
            setTimeout(() => { if (isScrolling.current === 'right') isScrolling.current = null; }, 50);
        };

        left.addEventListener('scroll', onScrollLeft);
        right.addEventListener('scroll', onScrollRight);

        return () => {
            left.removeEventListener('scroll', onScrollLeft);
            right.removeEventListener('scroll', onScrollRight);
        };
    }, [visibleNodes]); // Re-bind if node count changes as containers might reset

    return <>{children({ left: leftRef, right: rightRef })}</>;
};

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
    selectionSet?: Set<string>;
    onToggleSelection?: (path: string) => void;
    onToggleBatchSelection?: (paths: string[]) => void;
    hiddenPaths?: Set<string>;
    toggleHiddenPath?: (path: string) => void;
    showHidden?: boolean;
    toggleShowHidden?: () => void;
    onClearSelection?: () => void;
    isExplicitSelectionMode?: boolean;
    onToggleExplicitSelectionMode?: () => void;

    // Props for StatusBar
    globalStats?: { added: number, removed: number, modified: number };
    currentFolderStats?: { added: number, removed: number, modified: number } | null;
    fileLineStats?: { added: number, removed: number, groups: number } | null;
    selectionCount?: number;
    onSelectByStatus?: (status: 'added' | 'removed' | 'modified') => void;
    onExecuteBatchMerge?: (dir: 'left-to-right' | 'right-to-left') => void;
    onExecuteBatchDelete?: (side: 'left' | 'right') => void;
}

export interface FolderTreeHandle {
    selectNextNode: () => void;
    selectPrevNode: () => void;
    selectFirst: () => void;
    selectLast: () => void;
    selectNextChangedNode: () => void;
    selectPrevChangedNode: () => void;
    selectFirstChangedNode: () => void;
    selectLastChangedNode: () => void;
    selectNextStatus: (status: 'added' | 'removed' | 'modified') => void;
    selectPrevStatus: (status: 'added' | 'removed' | 'modified') => void;
    focus: () => void;
    toggleExpand: (path: string) => void;
    selectCurrent: () => void;
    expandPath: (path: string) => void;
    collapsePath: (path: string) => void;
    refresh: () => void;
}

// Re-implemented FolderTree using Headless Hook
const FolderTreeComponent = React.forwardRef<FolderTreeHandle, FolderTreeProps>(({
    root, config, onSelect, onMerge, onDelete, searchQuery = "", selectedNode, onFocus,
    selectionSet, onToggleSelection, onToggleBatchSelection, hiddenPaths, toggleHiddenPath, showHidden, toggleShowHidden, onClearSelection,
    isExplicitSelectionMode, onToggleExplicitSelectionMode,
    globalStats, currentFolderStats, fileLineStats, selectionCount = 0, onSelectByStatus, onExecuteBatchMerge, onExecuteBatchDelete
}, ref) => {

    // Internal Ref for Container
    const containerRef = React.useRef<HTMLDivElement>(null);
    const virtuosoRef = React.useRef<any>(null);

    // Optimistic Selection State (for instant UI feedback)
    const [optimisticSelectedPath, setOptimisticSelectedPath] = React.useState<string | null>(null);

    // Sync Optimistic State with Prop
    React.useEffect(() => {
        setOptimisticSelectedPath(null);
    }, [selectedNode]);

    // 0. Wrapper for Navigation Selection
    const onNavigationSelect = React.useCallback((node: FileNode) => {
        // Always select when jump-shortcuts are used. 
        // For simple arrow nav, we might want to be more conservative, 
        // but currently we'll favor correctness of navigation.
        onSelect(node);
    }, [onSelect]);

    // 1. Use Headless Navigation Hook
    const {
        focusedPath,
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
        selectPrevStatus
    } = useTreeNavigation(root, config, searchQuery, onNavigationSelect, hiddenPaths, showHidden);

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
            console.log('[FolderTree] selectFirst called', { visibleCount: visibleNodes.length });
            if (visibleNodes.length > 0) {
                // Design Philosophy: Root is container-only. Select first actual content item.
                let targetIndex = 0;
                const rootPath = root?.path || "";
                const firstNode = visibleNodes[0];

                console.log('[FolderTree] selectFirst Check:', {
                    rootPath,
                    firstNodePath: firstNode.path,
                    isRoot: firstNode.path === rootPath || firstNode.path === ""
                });

                // If first item is Root, strict check to select next item
                if (firstNode.path === rootPath || firstNode.path === "") {
                    if (visibleNodes.length > 1) {
                        console.log('[FolderTree] Skipping Root (Index 0), targeting Index 1');
                        targetIndex = 1;
                    } else {
                        console.log('[FolderTree] Only Root visible. Cannot skip.');
                    }
                }

                const target = visibleNodes[targetIndex];
                console.log('[FolderTree] Target First (Adjusted):', target.path);
                setFocusedPath(target.path);

                // Force Scroll to Top (0) to show context, even if selecting index 1
                virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start' });

                containerRef.current?.focus();
                setOptimisticSelectedPath(target.path);
                onSelect(target);
            }
        },
        selectLast: () => {
            console.log('[FolderTree] selectLast called', { visibleCount: visibleNodes.length });
            if (visibleNodes.length > 0) {
                const last = visibleNodes[visibleNodes.length - 1];
                console.log('[FolderTree] Target Last:', last.path);
                setFocusedPath(last.path);
                containerRef.current?.focus();
                setOptimisticSelectedPath(last.path);
                onSelect(last);
            }
        },
        selectNextChangedNode: selectNextChange,
        selectPrevChangedNode: selectPrevChange,
        selectFirstChangedNode: selectFirstChange,
        selectLastChangedNode: selectLastChange,
        selectNextStatus,
        selectPrevStatus,
        focus: () => {
            if (containerRef.current) containerRef.current.focus();
        },
        toggleExpand, // Added for command support
        selectCurrent: () => { // Added for command support
            const node = visibleNodes.find(n => n.path === focusedPath);
            if (node) {
                if (node.type === 'directory') toggleExpand(node.path);
                else {
                    setOptimisticSelectedPath(node.path);
                    onSelect(node);
                }
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
    }), [moveFocus, selectNextChange, selectPrevChange, toggleExpand, visibleNodes, focusedPath, onSelect, expandedPaths, containerRef]);

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
    const { logKey } = useKeyLogger('FolderTree');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        logKey(e, { focusedPath, visibleCount: visibleNodes.length });

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        switch (e.key) {
            case 'Escape':
                if (onClearSelection && selectionSet && selectionSet.size > 0) {
                    e.stopPropagation();
                    onClearSelection();
                }
                break;
            case 'ArrowDown':
                moveFocus(1);
                break;
            case 'ArrowUp':
                moveFocus(-1);
                break;
            case 'ArrowRight': {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) {
                    const isModifier = e.ctrlKey || e.metaKey;
                    if (isModifier) {
                        console.log('[FolderTree] Shortcut: ArrowRight + Modifier', { path: node.path, status: node.status });
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
                    const isModifier = e.ctrlKey || e.metaKey;
                    if (isModifier) {
                        console.log('[FolderTree] Shortcut: ArrowLeft + Modifier', { path: node.path, status: node.status });
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
            case 'a':
            case 'A':
                if (e.shiftKey) selectPrevStatus('added');
                else selectNextStatus('added');
                break;
            case 'r':
            case 'R':
                if (e.shiftKey) selectPrevStatus('removed');
                else selectNextStatus('removed');
                break;
            case 'c':
            case 'C':
                if (e.shiftKey) selectPrevStatus('modified');
                else selectNextStatus('modified');
                break;
            case 'h':
            case 'H': {
                if (e.altKey || e.ctrlKey || e.metaKey) {
                    if (toggleHiddenPath && focusedPath) {
                        e.preventDefault();
                        toggleHiddenPath(focusedPath);
                    }
                } else {
                    if (toggleShowHidden) {
                        e.preventDefault();
                        toggleShowHidden();
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
                            setOptimisticSelectedPath(node.path);
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
                        setOptimisticSelectedPath(node.path);
                        onSelect(node);
                        layoutService.focusContent();
                    }
                }
                break;
            }
        }
    };



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
    const handleNodeSelect = React.useCallback((n: FileNode, event?: React.MouseEvent) => {
        containerRef.current?.focus();

        // 1. Handle Directory Expansion (Single Click behavior preservation)
        if (n.type === 'directory' && !event?.ctrlKey && !event?.metaKey && !event?.shiftKey) {
            toggleExpand(n.path);
            return;
        }

        // 2. Multi-Selection Logic
        if (event?.ctrlKey || event?.metaKey) {
            // Toggle Selection
            if (onToggleSelection) {
                onToggleSelection(n.path);
            }
            onSelect(n);
            // Note: Optimistic update might interfere with multi-select if we aren't careful,
            // but here we are primarily focusing on the MAIN selection (for file view).
            // Let's set optimistic too.
            if (n.type === 'file') setOptimisticSelectedPath(n.path);

        } else if (event?.shiftKey && onToggleSelection) {
            // Range Selection
            if (focusedPath && visibleNodes.length > 0) {
                const startIdx = visibleNodes.findIndex(node => node.path === focusedPath);
                const endIdx = visibleNodes.findIndex(node => node.path === n.path);

                if (startIdx !== -1 && endIdx !== -1) {
                    const low = Math.min(startIdx, endIdx);
                    const high = Math.max(startIdx, endIdx);
                    const range = visibleNodes.slice(low, high + 1);

                    if (onToggleBatchSelection) {
                        const pathsToToggle = range
                            .filter(node => node.type === 'file' && (!selectionSet || !selectionSet.has(node.path)))
                            .map(node => node.path);
                        if (pathsToToggle.length > 0) onToggleBatchSelection(pathsToToggle);
                    } else {
                        range.forEach(node => {
                            if (node.type === 'file' && (!selectionSet || !selectionSet.has(node.path))) {
                                onToggleSelection(node.path);
                            }
                        });
                    }
                }
            }
            onSelect(n);
            if (n.type === 'file') setOptimisticSelectedPath(n.path);

        } else {
            // Single Selection
            if (n.type === 'file') {
                setOptimisticSelectedPath(n.path);
                onSelect(n);
            }

            if (n.type === 'file') {
                // duplicate removed
            }
        }
    }, [toggleExpand, onSelect, focusedPath, visibleNodes, onToggleSelection, onToggleBatchSelection, onClearSelection, selectionSet]);

    // Memoize Actions Object to prevent child re-renders
    const actions = React.useMemo(() => ({
        onSelect: handleNodeSelect,
        onMerge,
        onDelete,
        onFocus,
        onHide: toggleHiddenPath
    }), [onSelect, onMerge, onDelete, onFocus, handleNodeSelect, toggleHiddenPath]); // handleNodeSelect depends on others, so it covers it

    return (
        <div
            className="tree-container-wrapper"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0, // Ensure flex shrinking works
                overflow: 'hidden',
                flex: 1,
                position: 'relative' // Anchor for absolute children (SelectionPopup)
            }}
        >
            <div
                className="tree-container custom-scroll"
                ref={containerRef}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ flex: 1, overflow: 'auto', outline: 'none', minHeight: 0 }}
            >
                {visibleNodes.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
                        No files to display.
                    </div>
                ) : config.viewOptions?.folderViewMode === 'unified' || config.viewOptions?.folderViewMode === 'flat' ? (
                    <div className="tree-column unified" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <VirtualTreeList
                            visibleNodes={visibleNodes}
                            virtuosoRef={virtuosoRef}
                            side="unified"
                            expandedPaths={expandedPaths}
                            focusedPath={focusedPath}
                            selectedPath={optimisticSelectedPath ?? selectedNode?.path}
                            onToggle={toggleExpand}
                            config={config}
                            searchQuery={searchQuery}
                            actions={actions}
                            folderStats={folderStats}
                            selectionSet={selectionSet}
                            // @ts-ignore
                            isSelectionMode={selectionSet && selectionSet.size > 0}
                            onToggleSelection={onToggleSelection}
                        />
                    </div>
                ) : (
                    <div className="split-tree-view" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                        <TreeScrollerSync visibleNodes={visibleNodes}>
                            {(scrollerRefs) => (
                                <>
                                    <div id="tree-left" className="tree-column" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <VirtualTreeList
                                            visibleNodes={visibleNodes}
                                            virtuosoRef={virtuosoRef}
                                            side="left"
                                            expandedPaths={expandedPaths}
                                            focusedPath={focusedPath}
                                            selectedPath={optimisticSelectedPath ?? selectedNode?.path}
                                            onToggle={toggleExpand}
                                            config={config}
                                            searchQuery={searchQuery}
                                            actions={actions}
                                            folderStats={folderStats}
                                            selectionSet={selectionSet}
                                            // @ts-ignore
                                            isSelectionMode={selectionSet && selectionSet.size > 0}
                                            onToggleSelection={onToggleSelection}
                                            scrollerRef={(el) => (scrollerRefs.left.current = el)}
                                        />
                                    </div>
                                    <div id="tree-right" className="tree-column" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <VirtualTreeList
                                            visibleNodes={visibleNodes}
                                            side="right"
                                            expandedPaths={expandedPaths}
                                            focusedPath={focusedPath}
                                            selectedPath={optimisticSelectedPath ?? selectedNode?.path}
                                            onToggle={toggleExpand}
                                            config={config}
                                            searchQuery={searchQuery}
                                            actions={actions}
                                            folderStats={folderStats}
                                            selectionSet={selectionSet}
                                            // @ts-ignore
                                            isSelectionMode={selectionSet && selectionSet.size > 0}
                                            onToggleSelection={onToggleSelection}
                                            scrollerRef={(el) => (scrollerRefs.right.current = el)}
                                        />
                                    </div>
                                </>
                            )}
                        </TreeScrollerSync>
                    </div>
                )}
            </div>

            {/* Floating Selection Popup */}
            <SelectionPopup
                selectionCount={selectionCount}
                onExecuteBatchMerge={onExecuteBatchMerge!}
                onExecuteBatchDelete={onExecuteBatchDelete!}
                onClearSelection={onClearSelection!}
            />

            {/* Status Bar */}
            <div style={{ position: 'relative', zIndex: 5, flexShrink: 0 }}>
                <StatusBar
                    globalStats={globalStats}
                    currentFolderStats={currentFolderStats}
                    fileLineStats={fileLineStats}
                    selectionCount={selectionCount}
                    isExplicitSelectionMode={isExplicitSelectionMode}
                    onToggleExplicitSelectionMode={onToggleExplicitSelectionMode}
                    onSelectByStatus={onSelectByStatus!}
                    onClearSelection={onClearSelection!}
                    onExecuteBatchMerge={onExecuteBatchMerge!}
                    onExecuteBatchDelete={onExecuteBatchDelete!}
                />
            </div>
        </div>
    );
});

export const FolderTree = React.memo(FolderTreeComponent);
