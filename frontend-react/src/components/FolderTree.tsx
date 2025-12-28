import React, { useState } from 'react';
import type { FileNode, Config } from '../types';

interface FolderTreeProps {
    root: FileNode; // Root Node
    config: Config;
    onSelect: (node: FileNode) => void;
    onMerge: (node: FileNode, direction: 'left-to-right' | 'right-to-left') => void;
    onDelete: (node: FileNode, side: 'left' | 'right') => void;
    searchQuery?: string;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
    root, config, onSelect, onMerge, onDelete, searchQuery = ""
}) => {
    const [focusedPath, setFocusedPath] = useState<string | null>(null);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

    const toggleExpand = (path: string) => {
        const next = new Set(expandedPaths);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        setExpandedPaths(next);
    };

    // Global Key Listener for Tree Navigation
    // We bind it to the document or a container ref.
    // For simplicity, let's use useEffect to bind to document when this component is mounted.
    // Ensure we don't conflict if multiple trees existed (but we only have one).

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
                // Prevent scrolling
                if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
                handleKeyNav(e);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [expandedPaths, focusedPath, root, config]); // Re-bind when state changes to access latest

    // Auto-Expand Logic: When root changes, expand all directories to match Legacy behavior
    React.useEffect(() => {
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


    const handleKeyNav = (e: KeyboardEvent) => {
        // 1. Flatten visible nodes to list for Up/Down
        const visibleNodes = flattenVisibleNodes(root, expandedPaths, config);
        if (visibleNodes.length === 0) return;

        let currentIndex = -1;
        if (focusedPath) {
            currentIndex = visibleNodes.findIndex(n => n.path === focusedPath);
        }

        if (e.key === 'ArrowDown') {
            const nextIndex = Math.min(currentIndex + 1, visibleNodes.length - 1);
            setFocusedPath(visibleNodes[nextIndex].path);
        } else if (e.key === 'ArrowUp') {
            const nextIndex = Math.max(currentIndex - 1, 0);
            setFocusedPath(visibleNodes[nextIndex].path);
        } else if (e.key === 'ArrowRight') {
            if (focusedPath) {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node && node.type === 'directory') {
                    if (!expandedPaths.has(node.path)) toggleExpand(node.path);
                }
            }
        } else if (e.key === 'ArrowLeft') {
            if (focusedPath) {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node && node.type === 'directory' && expandedPaths.has(node.path)) {
                    toggleExpand(node.path);
                } else {
                    // Jump to parent?
                    // Basic: just collapse if open.
                    // Advanced: Go to parent path.
                    // Let's implement Parent Jump later if needed.
                }
            }
        } else if (e.key === 'Enter') {
            if (focusedPath) {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) {
                    if (node.type === 'directory') toggleExpand(node.path);
                    else onSelect(node);
                }
            }
        }
    };

    // Helper to flatten
    const flattenVisibleNodes = (node: FileNode, expanded: Set<string>, cfg: Config): FileNode[] => {
        const list: FileNode[] = [];
        const filters = cfg.folderFilters || { same: true, modified: true, added: true, removed: true };

        const traverse = (n: FileNode) => {
            if (filters[n.status] === false) return;
            list.push(n);
            if (n.type === 'directory' && expanded.has(n.path) && n.children) {
                n.children.forEach(traverse);
            }
        };
        // Root usually is the base, we want children of root?
        // In legacy, we iterated children.
        // My FolderTree renders `TreeColumn` with `[root]`.
        // So Root IS the first item?
        // Let's check FolderTree usage.
        // It passes `nodes={[root]}`. So root is visible.
        traverse(node);
        return list;
    };


    return (
        <div className="tree-container">


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
                        actions={{ onSelect, onMerge, onDelete }}
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
                        actions={{ onSelect, onMerge, onDelete }}
                    />
                </div>
            </div>
        </div>
    );
};

interface TreeColumnProps {
    nodes: FileNode[];
    side: 'left' | 'right';
    expandedPaths: Set<string>;
    focusedPath: string | null;
    onToggle: (path: string) => void;
    config: Config;
    searchQuery?: string;
    actions: {
        onSelect: (node: FileNode) => void;
        onMerge: (node: FileNode, dir: 'left-to-right' | 'right-to-left') => void;
        onDelete: (node: FileNode, side: 'left' | 'right') => void;
    };
}

const TreeColumn: React.FC<TreeColumnProps> = ({ nodes, side, expandedPaths, focusedPath, onToggle, config, searchQuery, actions }) => {
    if (!nodes) return null;

    return (
        <>
            {nodes.map((node, idx) => (
                <TreeNode
                    key={node.path + idx}
                    node={node}
                    side={side}
                    expandedPaths={expandedPaths}
                    focusedPath={focusedPath}
                    onToggle={onToggle}
                    config={config}
                    searchQuery={searchQuery}
                    actions={actions}
                />
            ))}
        </>
    );
}

interface TreeNodeProps {
    node: FileNode;
    side: 'left' | 'right';
    expandedPaths: Set<string>;
    focusedPath: string | null;
    onToggle: (path: string) => void;
    config: Config;
    searchQuery?: string;
    actions: {
        onSelect: (node: FileNode) => void;
        onMerge: (node: FileNode, dir: 'left-to-right' | 'right-to-left') => void;
        onDelete: (node: FileNode, side: 'left' | 'right') => void;
    };
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, side, expandedPaths, focusedPath, onToggle, config, searchQuery, actions }) => {

    const filters = config.folderFilters || { same: true, modified: true, added: true, removed: true };
    if (filters[node.status] === false) {
        return null;
    }

    const isExpanded = expandedPaths.has(node.path);
    const isDir = node.type === 'directory';

    // Search Logic:
    // If query exists:
    // - Show if NAME matches query
    // - OR (if Dir) if any visible children match query

    // We need to know if we should render.
    // This is recursive. If we are a leaf (file), check match.
    // If directory, check self match OR children match.
    // Optimization: This check is expensive on every render if not memoized.

    const matchesSearch = (n: FileNode, query: string): boolean => {
        if (!query) return true;
        const name = (side === 'left' ? (n.left_name || n.name) : (n.right_name || n.name)).toLowerCase();
        if (name.includes(query.toLowerCase())) return true;
        if (n.children) {
            return n.children.some(child => matchesSearch(child, query));
        }
        return false;
    };

    if (searchQuery && !matchesSearch(node, searchQuery)) {
        return null; // Hidden by search
    }

    // Alignment Logic
    let isSpacer = false;
    if (side === 'left' && node.status === 'added') isSpacer = true;
    if (side === 'right' && node.status === 'removed') isSpacer = true;

    if (isSpacer) {
        return (
            <div className="tree-item">
                <div className="tree-row spacer"></div>
                {isDir && isExpanded && (
                    <div className="tree-children visible">
                        <TreeColumn
                            nodes={node.children || []}
                            side={side}
                            expandedPaths={expandedPaths}
                            focusedPath={focusedPath}
                            onToggle={onToggle}
                            config={config}
                            actions={actions}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Content Row
    const fileName = side === 'left' ? (node.left_name || node.name) : (node.right_name || node.name);

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDir) onToggle(node.path);
    };

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDir) actions.onSelect(node);
    };

    const isFocused = node.path === focusedPath;

    return (
        <div className={`tree-item ${isFocused ? 'focused' : ''}`} data-status={node.status}>
            <div className={`tree-row ${isDir ? '' : 'file-row'} ${isFocused ? 'focused-row' : ''}`} onClick={isDir ? handleExpand : handleSelect}>
                {isDir ? (
                    <span
                        className={`chevron ${isExpanded ? 'expanded' : ''}`}
                        style={{ display: 'flex' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </span>
                ) : (
                    <span style={{ width: '16px', display: 'inline-flex' }}></span>
                )}

                <span className="item-name">{fileName}</span>

                {node.status !== 'same' && (
                    <span className={`item-status ${node.status}`}>{node.status}</span>
                )}

                <div className="merge-actions">
                    {(node.status === 'modified' || (node.status === 'added' && side === 'right') || (node.status === 'removed' && side === 'left')) && (
                        <>
                            <button className="merge-btn" onClick={(e) => {
                                e.stopPropagation();
                                const direction = side === 'left' ? 'left-to-right' : 'right-to-left';
                                actions.onMerge(node, direction);
                            }} title={side === 'left' ? "Copy to Right" : "Copy to Left"}>
                                {side === 'left' ? '→' : '←'}
                            </button>
                            {/* Trash Button */}
                            <button className="merge-btn delete-btn" onClick={(e) => {
                                e.stopPropagation();
                                actions.onDelete(node, side);
                            }} title="Delete Item">
                                🗑️
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isDir && isExpanded && (
                <div className="tree-children visible">
                    <TreeColumn
                        nodes={node.children || []}
                        side={side}
                        expandedPaths={expandedPaths}
                        focusedPath={focusedPath}
                        onToggle={onToggle}
                        config={config}
                        searchQuery={searchQuery}
                        actions={actions}
                    />
                </div>
            )}
        </div>
    );
};
