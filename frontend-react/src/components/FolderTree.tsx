import React, { useState, useEffect } from 'react';
import type { FileNode, Config } from '../types';

// Define Handle Interface
export interface FolderTreeHandle {
    selectNextNode: () => void;
    selectPrevNode: () => void;
}

export interface FolderTreeProps {
    root: FileNode; // Root Node
    config: Config;
    onSelect: (node: FileNode) => void;
    onMerge: (node: FileNode, direction: 'left-to-right' | 'right-to-left') => void;
    onDelete: (node: FileNode, side: 'left' | 'right') => void;
    searchQuery?: string;
    setSearchQuery?: (q: string) => void;
    selectedNode?: FileNode | null;
}

export interface FolderTreeHandle {
    selectNextNode: () => void;
    selectPrevNode: () => void;
}

export const FolderTree = React.forwardRef<FolderTreeHandle, FolderTreeProps>(({
    root, config, onSelect, onMerge, onDelete, searchQuery = "", setSearchQuery, selectedNode
}, ref) => {
    const [focusedPath, setFocusedPath] = useState<string | null>(null);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

    const toggleExpand = (path: string) => {
        const next = new Set(expandedPaths);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        setExpandedPaths(next);
    };

    // Auto-Expand Logic: When root changes, expand all directories to match Legacy behavior

    // Auto-Expand Logic: When root changes, expand all directories to match Legacy behavior
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

    // Sync focusedPath with external selectedNode
    useEffect(() => {
        if (selectedNode) {
            setFocusedPath(selectedNode.path);
        }
    }, [selectedNode]);


    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Prevent focus stealing if clicking nested interactive elements?
        // But we want the tree to focus.
        e.currentTarget.focus();
    };

    const handleKeyNav = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const agentView = document.querySelector('.agent-view-container') as HTMLElement;
            if (agentView) agentView.focus();
            return;
        }

        if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();

        // 1. Flatten visible nodes to list for Up/Down
        const visibleNodes = flattenVisibleNodes(root, expandedPaths, config, searchQuery);
        if (visibleNodes.length === 0) return;

        let currentIndex = -1;
        if (focusedPath) {
            currentIndex = visibleNodes.findIndex(n => n.path === focusedPath);
        }

        if (e.key === 'ArrowDown') {
            const nextIndex = Math.min(currentIndex + 1, visibleNodes.length - 1);
            const nextPath = visibleNodes[nextIndex].path;
            setFocusedPath(nextPath);
            scrollToPath(nextPath);
        } else if (e.key === 'ArrowUp') {
            const nextIndex = Math.max(currentIndex - 1, 0);
            const nextPath = visibleNodes[nextIndex].path;
            setFocusedPath(nextPath);
            scrollToPath(nextPath);
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
                }
            }
        } else if (e.key === ' ' || e.key === 'Enter') {
            if (focusedPath) {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) {
                    if (node.type === 'directory') toggleExpand(node.path);
                    else {
                        // If file is already selected, maybe toggle close?
                        // For now, always select. User asked for "Space closes file" -> if we can deselect.
                        // Assuming onSelect handles it or we just re-select.
                        onSelect(node);
                    }
                }
            }
        }
    };

    // Helper to flatten
    const flattenVisibleNodes = (node: FileNode, expanded: Set<string>, cfg: Config, query: string = ""): FileNode[] => {
        const list: FileNode[] = [];
        const filters = cfg.folderFilters || { same: true, modified: true, added: true, removed: true };

        const matchesSearch = (n: FileNode): boolean => {
            if (!query) return true;
            // Simplified search check (should match TreeNode logic)
            const name = n.name.toLowerCase(); // Or check left/right/unified names? Simpler to check local name for now/all.
            if (name.includes(query.toLowerCase())) return true;
            if (n.children) return n.children.some(matchesSearch);
            return false;
        };

        const traverse = (n: FileNode) => {
            if (filters[n.status] === false) return;
            // Check Search Visibility
            if (query && !matchesSearch(n)) return;

            list.push(n);
            if (n.type === 'directory' && expanded.has(n.path) && n.children) {
                n.children.forEach(traverse);
            }
        };
        // Ensure root is processed
        traverse(node);
        return list;
    };

    React.useImperativeHandle(ref, () => ({
        selectNextNode: () => {
            const visibleNodes = flattenVisibleNodes(root, expandedPaths, config, searchQuery);
            if (visibleNodes.length === 0) return;
            let currentIndex = -1;
            if (focusedPath) currentIndex = visibleNodes.findIndex(n => n.path === focusedPath);

            // If nothing focused, start at 0.
            const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, visibleNodes.length - 1);
            const node = visibleNodes[nextIndex];
            if (node) {
                setFocusedPath(node.path);
                if (node.type !== 'directory') onSelect(node);
            }
        },
        selectPrevNode: () => {
            const visibleNodes = flattenVisibleNodes(root, expandedPaths, config, searchQuery);
            if (visibleNodes.length === 0) return;
            let currentIndex = -1;
            if (focusedPath) currentIndex = visibleNodes.findIndex(n => n.path === focusedPath);

            const nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
            const node = visibleNodes[nextIndex];
            if (node) {
                setFocusedPath(node.path);
                if (node.type !== 'directory') onSelect(node);
            }
        }
    }));


    const scrollToPath = (path: string) => {
        setTimeout(() => {
            const el = document.querySelector(`[data-node-path="${CSS.escape(path)}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 0);
    };

    return (
        <div className="tree-container custom-scroll"
            style={{ position: 'relative', outline: 'none', border: '2px solid transparent' }}
            tabIndex={0}
            onKeyDown={handleKeyNav}
            onClick={handleContainerClick}
            onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
            {/* Search Overlay Removed - Moved to Parent */}

            {config.viewOptions?.folderViewMode === 'unified' ? (
                <div className="tree-column unified">
                    <TreeColumn
                        nodes={[root]}
                        side="unified"
                        expandedPaths={expandedPaths}
                        focusedPath={focusedPath}
                        onToggle={toggleExpand}
                        config={config}
                        searchQuery={searchQuery}
                        actions={{ onSelect, onMerge, onDelete }}
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
            )}
        </div>
    );
});


interface TreeColumnProps {
    nodes: FileNode[];
    side: 'left' | 'right' | 'unified';
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

const TreeColumn: React.FC<TreeColumnProps> = (props) => {
    if (!props.nodes) return null;

    return (
        <>
            {props.nodes.map((node, idx) => (
                <TreeNode
                    key={node.path + idx}
                    node={node}
                    {...props}
                />
            ))}
        </>
    );
}

interface TreeNodeProps extends TreeColumnProps {
    node: FileNode;
}

const isNodeVisible = (node: FileNode, filters: Record<string, any>): boolean => {
    if (filters[node.status] !== false) return true;
    if (node.type === 'directory' && node.children) {
        return node.children.some(child => isNodeVisible(child, filters));
    }
    return false;
};

const TreeNode: React.FC<TreeNodeProps> = ({ node, side, expandedPaths, focusedPath, onToggle, config, searchQuery, actions }) => {

    const filters = config.folderFilters || { same: true, modified: true, added: true, removed: true };

    if (!isNodeVisible(node, filters)) {
        return null;
    }

    const isExpanded = expandedPaths.has(node.path);
    const isDir = node.type === 'directory';

    const matchesSearch = (n: FileNode, query: string): boolean => {
        if (!query) return true;
        const name = (side === 'left' ? (n.left_name || n.name) : (side === 'right' ? (n.right_name || n.name) : n.name)).toLowerCase();
        if (name.includes(query.toLowerCase())) return true;
        if (n.children) {
            return n.children.some(child => matchesSearch(child, query));
        }
        return false;
    };

    if (searchQuery && !matchesSearch(node, searchQuery)) {
        return null;
    }

    // Alignment Logic (Only for Split View)
    let isSpacer = false;
    if (side === 'left' && node.status === 'added') isSpacer = true;
    if (side === 'right' && node.status === 'removed') isSpacer = true;
    // Unified view has no spacers

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
    let fileName = node.name;
    if (side === 'left') fileName = node.left_name || node.name;
    if (side === 'right') fileName = node.right_name || node.name;
    // Unified: uses node.name

    const handleExpand = (e: React.MouseEvent) => {
        // Allow bubbling to focus container
        if (isDir) onToggle(node.path);
    };

    const handleSelect = (e: React.MouseEvent) => {
        // Allow bubbling to focus container
        if (!isDir) actions.onSelect(node);
    };

    const isFocused = node.path === focusedPath;

    return (
        <div className={`tree-item ${isFocused ? 'focused' : ''}`} data-status={node.status} data-node-path={node.path}>
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
                    {/* Unified Actions */}
                    {side === 'unified' && (
                        <>
                            {/* Left Side Actions: [Trash Left] [->] */}
                            {(node.status === 'modified' || node.status === 'removed') && (
                                <>
                                    <button className="merge-btn delete-btn" onClick={(e) => {
                                        e.stopPropagation();
                                        actions.onDelete(node, 'left');
                                    }} title="Delete from Left">
                                        🗑️
                                    </button>
                                    <button className="merge-btn" onClick={(e) => {
                                        e.stopPropagation();
                                        actions.onMerge(node, 'left-to-right');
                                    }} title="Copy Left to Right">
                                        →
                                    </button>
                                </>
                            )}

                            {/* Right Side Actions: [<-] [Trash Right] */}
                            {(node.status === 'modified' || node.status === 'added') && (
                                <>
                                    <button className="merge-btn" onClick={(e) => {
                                        e.stopPropagation();
                                        actions.onMerge(node, 'right-to-left');
                                    }} title="Copy Right to Left">
                                        ←
                                    </button>
                                    <button className="merge-btn delete-btn" onClick={(e) => {
                                        e.stopPropagation();
                                        actions.onDelete(node, 'right');
                                    }} title="Delete from Right">
                                        🗑️
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {/* Split View Actions */}
                    {side !== 'unified' && (
                        (node.status === 'modified' || (node.status === 'added' && side === 'right') || (node.status === 'removed' && side === 'left')) && (
                            <>
                                <button className="merge-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    const direction = side === 'left' ? 'left-to-right' : 'right-to-left';
                                    actions.onMerge(node, direction);
                                }} title={side === 'left' ? "Copy to Right" : "Copy to Left"}>
                                    {side === 'left' ? '→' : '←'}
                                </button>
                                <button className="merge-btn delete-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    actions.onDelete(node, side);
                                }} title="Delete Item">
                                    🗑️
                                </button>
                            </>
                        )
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
