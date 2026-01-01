import type { FileNode } from '../../types';
import { TreeColumn } from './TreeColumn';
import type { TreeColumnProps } from './TreeColumn';
import { TreeRowActions } from './TreeRowActions';

export const TreeNode: React.FC<TreeColumnProps & { node: FileNode }> = ({
    node, side, expandedPaths, focusedPath, onToggle, config, searchQuery, actions, depth = 0, folderStats
}) => {
    // Visibility Check (Should match hook logic)
    const filters = config.folderFilters || { same: true, modified: true, added: true, removed: true };

    // Simple helpers to keep code dense
    const isVisible = (n: FileNode): boolean => {
        if (filters[n.status] !== false) return true;
        if (n.type === 'directory' && n.children) return n.children.some(c => isVisible(c));
        return false;
    };

    if (!isVisible(node)) return null;

    // Search Check
    const matches = (n: FileNode): boolean => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return n.name.toLowerCase().includes(q) ||
            (n.children?.some(matches) ?? false);
    };
    if (!matches(node)) return null;

    const isExpanded = expandedPaths.has(node.path);
    const isDir = node.type === 'directory';
    const isFocused = node.path === focusedPath;

    // Alignment logic
    let isSpacer = false;
    if (side === 'left' && node.status === 'added') isSpacer = true;
    if (side === 'right' && node.status === 'removed') isSpacer = true;

    if (isSpacer) {
        return (
            <div className={`tree-item ${isFocused ? 'focused' : ''}`} data-node-path={node.path}>
                <div className={`tree-row spacer ${isFocused ? 'focused-row' : ''}`} />
                {isDir && isExpanded && <div className="tree-children visible"><TreeColumn nodes={node.children || []} side={side} expandedPaths={expandedPaths} focusedPath={focusedPath} onToggle={onToggle} config={config} actions={actions} depth={depth + 1} folderStats={folderStats} /></div>}
            </div>
        );
    }

    // Name Rendering
    let fileName: React.ReactNode = node.name;
    if (depth === 0 && side === 'unified') {
        fileName = <>{node.left_name || node.name}<span className="vs-badge">vs</span>{node.right_name || node.name}</>;
    } else {
        if (side === 'left') fileName = node.left_name || node.name;
        if (side === 'right') fileName = node.right_name || node.name;
    }

    const stats = isDir && folderStats ? folderStats.get(node.path) : null;
    const isFlat = config.viewOptions?.folderViewMode === 'flat';
    const showStats = isDir && isFlat && stats && (stats.removed > 0 || stats.modified > 0 || stats.added > 0);

    return (
        <div className={`tree-item ${isFocused ? 'focused' : ''}`} data-status={node.status} data-node-path={node.path}>
            <div
                className={`tree-row ${isDir ? '' : 'file-row'} ${isFocused ? 'focused-row' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isDir) { onToggle(node.path); actions.onFocus?.(node); }
                    else { actions.onSelect(node); actions.onFocus?.(node); }
                }}
            >
                {isDir ? (
                    <span className={`chevron ${isExpanded ? 'expanded' : ''}`} style={{ display: 'flex' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </span>
                ) : <span style={{ width: '16px', display: 'inline-flex' }} />}

                <span className="item-name">
                    {isFlat && depth > 0 && <span className="depth-badge">{depth}</span>}
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
                    <span className={`item-status ${node.status}`} title={node.status}>
                        {node.status === 'added' ? 'A' : node.status === 'removed' ? 'R' : 'M'}
                    </span>
                )}

                <TreeRowActions node={node} side={side} actions={actions} />
            </div>
            {isDir && isExpanded && (
                <div className={`tree-children visible ${isFlat ? 'flat' : ''}`}>
                    <TreeColumn nodes={node.children || []} side={side} expandedPaths={expandedPaths} focusedPath={focusedPath} onToggle={onToggle} config={config} actions={actions} depth={depth + 1} folderStats={folderStats} />
                </div>
            )}
        </div>
    );
};
