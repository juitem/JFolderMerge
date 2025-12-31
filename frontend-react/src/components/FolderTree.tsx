import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useKeyLogger } from '../hooks/useKeyLogger';
import type { FileNode, Config } from '../types';

// SHARED HELPERS (Module Scope)
const isNodeVisible = (node: FileNode, filters: Record<string, any>): boolean => {
    if (filters[node.status] !== false) return true;
    if (node.type === 'directory' && node.children) {
        return node.children.some(child => isNodeVisible(child, filters));
    }
    return false;
};

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

// Define Handle Interface
export interface FolderTreeHandle {
    selectNextNode: () => void;
    selectPrevNode: () => void;
    selectNextChangedNode: () => void;
    selectPrevChangedNode: () => void;
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
    onFocus?: (node: FileNode) => void;
}

export interface FolderTreeHandle {
    selectNextNode: () => void;
    selectPrevNode: () => void;
    focus: () => void;
    selectNextChangedNode: () => void;
    selectPrevChangedNode: () => void;
}

export const FolderTree = React.forwardRef<FolderTreeHandle, FolderTreeProps>(({
    root, config, onSelect, onMerge, onDelete, searchQuery = "", selectedNode, onFocus
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

    const containerRef = React.useRef<HTMLDivElement>(null);

    const scrollToPath = (path: string) => {
        setTimeout(() => {
            const elements = document.querySelectorAll(`[data-node-path="${CSS.escape(path)}"]`);
            elements.forEach(el => {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }, 50); // Increased timeout slightly to ensure DOM is ready
    };

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

        // Restore focus/scroll if we had a selection
        // Use a slight delay to allow expansion rendering
        if (focusedPath) {
            scrollToPath(focusedPath);
        }
    }, [root]); // Keep dependency on root only. focusedPath is captured from closure (which is fine, we want the *current* focus at moment of refresh)

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

    // Logging
    const { logKey } = useKeyLogger('FolderTree');

    const handleKeyNav = (e: React.KeyboardEvent) => {
        // Log the event
        const visibleNodes = flattenVisibleNodes(root, expandedPaths, config, searchQuery);
        logKey(e, {
            focusedPath,
            expandedCount: expandedPaths.size,
            visibleCount: visibleNodes.length
        });

        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const agentView = document.querySelector('.agent-view-container') as HTMLElement;
            if (agentView) agentView.focus();
            return;
        }

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
        }

        // 1. Flatten visible nodes to list for Up/Down
        if (visibleNodes.length === 0) return;

        let currentIndex = -1;
        if (focusedPath !== null) {
            currentIndex = visibleNodes.findIndex(n => n.path === focusedPath);
        }

        if (e.key === 'ArrowDown') {
            const nextIndex = (currentIndex + 1) % visibleNodes.length;
            const nextPath = visibleNodes[nextIndex].path;

            logKey(e, {
                action: 'ArrowDown',
                currentIndex,
                nextIndex,
                length: visibleNodes.length,
                nextPath
            });
            setFocusedPath(nextPath);
            scrollToPath(nextPath);
            if (onFocus) onFocus(visibleNodes[nextIndex]);
        } else if (e.key === 'ArrowUp') {
            const nextIndex = (currentIndex === -1)
                ? visibleNodes.length - 1
                : (currentIndex - 1 + visibleNodes.length) % visibleNodes.length;
            const nextPath = visibleNodes[nextIndex].path;
            logKey(e, { action: 'ArrowUp', currentIndex, nextIndex, length: visibleNodes.length, nextPath });
            setFocusedPath(nextPath);
            scrollToPath(nextPath);
            if (onFocus) onFocus(visibleNodes[nextIndex]);
        } else if (e.key === 'ArrowRight') {
            if (focusedPath) {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node && node.type === 'directory') {
                    if (!expandedPaths.has(node.path)) {
                        // Case 1: Closed Directory -> Expand
                        toggleExpand(node.path);
                    } else {
                        // Case 2: Open Directory -> Move to First Child (Next Index)
                        const nextNode = visibleNodes[currentIndex + 1];
                        if (nextNode) {
                            // Strict Child Check
                            const sep = node.path.includes('\\') ? '\\' : '/';
                            if (nextNode.path.startsWith(node.path + sep)) {
                                setFocusedPath(nextNode.path);
                                scrollToPath(nextNode.path);
                            }
                        }
                    }
                }
            }
        } else if (e.key === 'ArrowLeft') {
            if (focusedPath) {
                const node = visibleNodes.find(n => n.path === focusedPath);
                if (node) {
                    if (node.type === 'directory' && expandedPaths.has(node.path)) {
                        // Case 1: Open Directory -> Collapse
                        toggleExpand(node.path);
                    } else {
                        // Case 2: File or Closed Directory -> Jump to Parent
                        // We search backwards for the parent
                        // A parent must appear BEFORE the child in the list
                        // A parent's path is a prefix of the child's path
                        // OR: We can just use string manipulation if we trust paths

                        // Strategy: Search backwards in visibleNodes for the closest directory that is a parent
                        for (let i = currentIndex - 1; i >= 0; i--) {
                            const candidate = visibleNodes[i];
                            if (candidate.type === 'directory') {
                                // Strict parent check
                                const sep = candidate.path.includes('\\') ? '\\' : '/';
                                if (node.path.startsWith(candidate.path + sep)) {
                                    setFocusedPath(candidate.path);
                                    scrollToPath(candidate.path);
                                    break;
                                }
                            }
                        }
                    }
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

        // Use Shared Helpers
        const traverse = (n: FileNode) => {
            if (!isNodeVisible(n, filters)) return;
            if (query && !matchesSearch(n, query)) return;  // Note: Flatten matches against ONE name (canonical? or any?)

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
        },
        selectNextChangedNode: () => {
            const visibleNodes = flattenVisibleNodes(root, expandedPaths, config, searchQuery);
            if (visibleNodes.length === 0) return;
            let currentIndex = -1;
            if (focusedPath) currentIndex = visibleNodes.findIndex(n => n.path === focusedPath);

            // Find NEXT changed node (wrap around)
            for (let i = 1; i <= visibleNodes.length; i++) {
                const idx = (currentIndex + i) % visibleNodes.length;
                const node = visibleNodes[idx];
                if (node.status !== 'same' && node.type !== 'directory') {
                    setFocusedPath(node.path);
                    onSelect(node);
                    return;
                }
            }
        },
        selectPrevChangedNode: () => {
            const visibleNodes = flattenVisibleNodes(root, expandedPaths, config, searchQuery);
            if (visibleNodes.length === 0) return;
            let currentIndex = -1;
            if (focusedPath) currentIndex = visibleNodes.findIndex(n => n.path === focusedPath);

            // Find PREV changed node (wrap around)
            for (let i = 1; i <= visibleNodes.length; i++) {
                const idx = (currentIndex - i + visibleNodes.length) % visibleNodes.length;
                const node = visibleNodes[idx];
                if (node.status !== 'same' && node.type !== 'directory') {
                    setFocusedPath(node.path);
                    onSelect(node);
                    return;
                }
            }
        },
        focus: () => {
            // Find the tree container and focus it
            // We can use a local ref for the div
            // Since we didn't attach a RefObject to the div in previous code (we used class selection in other places which is bad), 
            // let's assume valid scope or use a real ref.
            // Actually, the ref argument is forwarded. 
            // Wait, we are inside component. We need a ref to the DIV.
            // I'll add `containerRef`.
            if (containerRef.current) containerRef.current.focus();
        }
    }));




    // Memoize stats calculation
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
                    const childStats = traverse(child);
                    current.added += childStats.added;
                    current.removed += childStats.removed;
                    current.modified += childStats.modified;
                }
            }

            stats.set(node.path, current);
            return current;
        };

        if (root) traverse(root);
        return stats;
    }, [root]);


    return (
        <div className="tree-container custom-scroll"
            ref={containerRef}
            style={{ position: 'relative', outline: 'none', border: '2px solid transparent' }}
            tabIndex={0}
            onKeyDown={handleKeyNav}
            onClick={handleContainerClick}
            onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
            {/* Search Overlay Removed - Moved to Parent */}

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
                        depth={0}
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
                            depth={0}
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
                            depth={0}
                            actions={{ onSelect, onMerge, onDelete, onFocus }}
                            folderStats={folderStats}
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
    depth?: number;
    actions: {
        onSelect: (node: FileNode) => void;
        onMerge: (node: FileNode, dir: 'left-to-right' | 'right-to-left') => void;
        onDelete: (node: FileNode, side: 'left' | 'right') => void;
        onFocus?: (node: FileNode) => void;
    };
    folderStats?: Map<string, { added: number, removed: number, modified: number }>;
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
                    depth={props.depth || 0}
                />
            ))}
        </>
    );
}

interface TreeNodeProps extends TreeColumnProps {
    node: FileNode;
}



const TreeNode: React.FC<TreeNodeProps> = ({ node, side, expandedPaths, focusedPath, onToggle, config, searchQuery, actions, depth = 0, folderStats }) => {

    const filters = config.folderFilters || { same: true, modified: true, added: true, removed: true };

    if (!isNodeVisible(node, filters)) {
        return null;
    }

    const isExpanded = expandedPaths.has(node.path);
    const isDir = node.type === 'directory';



    if (searchQuery && !matchesSearch(node, searchQuery)) {
        return null;
    }

    // Alignment Logic (Only for Split View)
    let isSpacer = false;
    if (side === 'left' && node.status === 'added') isSpacer = true;
    if (side === 'right' && node.status === 'removed') isSpacer = true;
    // Unified view has no spacers

    if (isSpacer) {
        const isFocused = node.path === focusedPath;
        return (
            <div className={`tree-item ${isFocused ? 'focused' : ''}`} data-node-path={node.path}>
                <div className={`tree-row spacer ${isFocused ? 'focused-row' : ''}`}></div>
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
                            depth={depth + 1}
                            folderStats={folderStats}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Content Row
    let fileName: React.ReactNode = node.name;
    if (depth === 0) {
        if (side === 'unified') {
            fileName = (
                <>
                    {node.left_name || node.name}
                    <span className="vs-badge">vs</span>
                    {node.right_name || node.name}
                </>
            );
        } else {
            // Split view columns (left or right)
            fileName = side === 'left' ? (node.left_name || node.name) : (node.right_name || node.name);
        }
    } else {
        if (side === 'left') fileName = node.left_name || node.name;
        if (side === 'right') fileName = node.right_name || node.name;
    }
    // Unified: uses node.name for non-root

    const isFlat = config.viewOptions?.folderViewMode === 'flat';

    const handleExpand = () => {
        // Allow bubbling to focus container
        if (isDir) {
            onToggle(node.path);
            // Also focus on click
            if (actions.onFocus) actions.onFocus(node);
        }
    };

    const handleSelect = () => {
        // Allow bubbling to focus container
        if (!isDir) {
            actions.onSelect(node);
            if (actions.onFocus) actions.onFocus(node);
        }
    };

    const isFocused = node.path === focusedPath;

    // Stats for Directory
    const stats = isDir && folderStats ? folderStats.get(node.path) : null;
    const showStats = isDir && isFlat && stats && (stats.removed > 0 || stats.modified > 0 || stats.added > 0);

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

                <span className="item-name">
                    {config.viewOptions?.folderViewMode === 'flat' && depth > 0 && (
                        <span className="depth-badge">{depth}</span>
                    )}
                    {fileName}
                    {showStats && (
                        <sup style={{ marginLeft: '6px', fontSize: '0.65rem', fontWeight: 700 }}>
                            {stats!.removed > 0 && <span style={{ color: '#ef4444', marginRight: '3px' }}>-{stats!.removed}</span>}
                            {stats!.modified > 0 && <span style={{ color: '#f59e0b', marginRight: '3px' }}>!{stats!.modified}</span>}
                            {stats!.added > 0 && <span style={{ color: '#10b981' }}>+{stats!.added}</span>}
                        </sup>
                    )}
                </span>

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
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    </button>
                                    <button className="merge-btn to-right" onClick={(e) => {
                                        e.stopPropagation();
                                        actions.onMerge(node, 'left-to-right');
                                    }} title="Merge Left to Right">
                                        <ArrowRight size={14} strokeWidth={3} />
                                    </button>
                                </>
                            )}

                            {/* Spacer for Removed (Aligns with Modified) */}
                            {node.status === 'removed' && <div style={{ width: 86, height: 24 }} />}

                            {/* Spacer for Added (Aligns with Modified) */}
                            {node.status === 'added' && <div style={{ width: 86, height: 24 }} />}

                            {/* Right Side Actions: [<-] [Trash Right] */}
                            {(node.status === 'modified' || node.status === 'added') && (
                                <>
                                    <button className="merge-btn to-left" onClick={(e) => {
                                        e.stopPropagation();
                                        actions.onMerge(node, 'right-to-left');
                                    }} title="Merge Right to Left">
                                        <ArrowLeft size={14} strokeWidth={3} />
                                    </button>
                                    <button className="merge-btn delete-btn" onClick={(e) => {
                                        e.stopPropagation();
                                        actions.onDelete(node, 'right');
                                    }} title="Delete from Right">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {/* Split View Actions */}
                    {side !== 'unified' && (
                        (node.status === 'modified' || (node.status === 'added' && side === 'right') || (node.status === 'removed' && side === 'left')) && (
                            <>
                                <button className={`merge-btn ${side === 'left' ? 'to-right' : 'to-left'}`} onClick={(e) => {
                                    e.stopPropagation();
                                    const direction = side === 'left' ? 'left-to-right' : 'right-to-left';
                                    actions.onMerge(node, direction);
                                }} title={side === 'left' ? "Merge to Right" : "Merge to Left"}>
                                    {side === 'left' ? <ArrowRight size={14} strokeWidth={3} /> : <ArrowLeft size={14} strokeWidth={3} />}
                                </button>
                                <button className="merge-btn delete-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    actions.onDelete(node, side);
                                }} title="Delete Item">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </>
                        )
                    )}
                </div>
            </div>

            {isDir && isExpanded && (
                <div className={`tree-children visible ${isFlat ? 'flat' : ''}`}>
                    <TreeColumn
                        nodes={node.children || []}
                        side={side}
                        expandedPaths={expandedPaths}
                        focusedPath={focusedPath}
                        onToggle={onToggle}
                        config={config}
                        searchQuery={searchQuery}
                        actions={actions}
                        depth={depth + 1}
                    />
                </div>
            )}
        </div>
    );
};
