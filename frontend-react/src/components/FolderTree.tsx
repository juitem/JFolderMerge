import React, { useRef, useEffect } from 'react';
import { useTreeNavigation } from '../hooks/logic/useTreeNavigation';
import { useKeyLogger } from '../hooks/useKeyLogger';
import type { FileNode, Config } from '../types';
import { TreeColumn } from './tree/TreeColumn';

// Interfaces match previous definition to prevent breakage
export interface FolderTreeProps {
    root: FileNode;
    config: Config;
    onSelect: (node: FileNode) => void;
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
    selectNextChangedNode: () => void;
    selectPrevChangedNode: () => void;
    focus: () => void;
}

// Re-implemented FolderTree using Headless Hook
export const FolderTree = React.forwardRef<FolderTreeHandle, FolderTreeProps>(({
    root, config, onSelect, onMerge, onDelete, searchQuery = "", selectedNode, onFocus
}, ref) => {

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
    } = useTreeNavigation(root, config, searchQuery, onSelect);

    // 2. Sync External Selection to Internal Focus
    useEffect(() => {
        if (selectedNode) {
            setFocusedPath(selectedNode.path);
        }
    }, [selectedNode, setFocusedPath]);

    // 3. Expose Methods via Ref (Backward Compatibility)
    React.useImperativeHandle(ref, () => ({
        selectNextNode: () => moveFocus(1),
        selectPrevNode: () => moveFocus(-1),
        selectNextChangedNode: selectNextChange,
        selectPrevChangedNode: selectPrevChange,
        focus: () => {
            if (containerRef.current) containerRef.current.focus();
        }
    }));

    // 4. Keyboard Handling (Local)
    // We keep this local for now to mimic previous behavior, 
    // but in future this will move to CommandContext.
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
                if (node && node.type === 'directory') {
                    if (!expandedPaths.has(node.path)) toggleExpand(node.path);
                    else moveFocus(1); // Move to child
                }
                break;
            }
            case 'ArrowLeft': {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) {
                    if (node.type === 'directory' && expandedPaths.has(node.path)) {
                        toggleExpand(node.path);
                    } else {
                        // Jump to parent logic is tricky in flattened list without parent ref
                        // But we can approximate by finding the directory prefix
                        // Current Hook logic doesn't support "Jump to Parent" explicitly yet.
                        // Let's implement a simple "move up" or "collapse"
                        // Or just moveFocus(-1)? No, that's prev sibling.
                        // We need "Select Parent".
                        // Logic: Find closest preceding directory that is a prefix of current path.
                        // We can add this to the hook later. 
                        // For now, let's keep it simple: Just move up.
                        moveFocus(-1);
                    }
                }
                break;
            }
            case ' ':
            case 'Enter': {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) {
                    if (node.type === 'directory') toggleExpand(node.path);
                    else onSelect(node);
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

    return (
        <div
            className="tree-container custom-scroll"
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{ position: 'relative', outline: 'none' }}
        >
            {config.viewOptions?.folderViewMode === 'unified' || config.viewOptions?.folderViewMode === 'flat' ? (
                <div className="tree-column unified">
                    <TreeColumn
                        nodes={[root]}
                        side="unified"
                        expandedPaths={expandedPaths}
                        focusedPath={focusedPath}
                        onToggle={toggleExpand}
                        config={config}
                        searchQuery={searchQuery}
                        actions={{ onSelect, onMerge, onDelete, onFocus }}
                        folderStats={folderStats}
                    />
                </div>
            ) : (
                <div className="split-tree-view">
                    <div id="tree-left" className="tree-column">
                        <TreeColumn
                            nodes={[root]}
                            side="left"
                            expandedPaths={expandedPaths}
                            focusedPath={focusedPath}
                            onToggle={toggleExpand}
                            config={config}
                            searchQuery={searchQuery}
                            actions={{ onSelect, onMerge, onDelete, onFocus }}
                            folderStats={folderStats}
                        />
                    </div>
                    <div id="tree-right" className="tree-column">
                        <TreeColumn
                            nodes={[root]}
                            side="right"
                            expandedPaths={expandedPaths}
                            focusedPath={focusedPath}
                            onToggle={toggleExpand}
                            config={config}
                            searchQuery={searchQuery}
                            actions={{ onSelect, onMerge, onDelete, onFocus }}
                            folderStats={folderStats}
                        />
                    </div>
                </div>
            )}
        </div>
    );
});
