import React from 'react';
import type { FileNode, Config } from '../../types';
import { TreeRowActions } from './TreeRowActions';

export interface TreeNodeProps {
    node: FileNode;
    side: 'left' | 'right' | 'unified';
    isExpanded: boolean;
    isFocused: boolean;
    onToggle: (path: string) => void;
    actions: {
        onSelect: (node: FileNode) => void;
        onMerge: (node: FileNode, direction: 'left-to-right' | 'right-to-left') => void;
        onDelete: (node: FileNode, side: 'left' | 'right') => void;
        onFocus?: (node: FileNode) => void;
    };
    // stats removed from props or ignored if unused
    stats?: { added: number, removed: number, modified: number };
    style?: React.CSSProperties;
    config: Config;
    searchQuery: string;
    focusedPath?: string | null;
    folderStats?: Map<string, any>;
    expandedPaths?: Set<string>;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
    node,
    side,
    isExpanded,
    isFocused,
    onToggle,
    actions,
    style,
    config // Make sure config is used
}) => {
    const isFlat = config.viewOptions?.folderViewMode === 'flat';

    // In flat mode, use fixed padding for ALL items to align them.
    // In tree mode, use depth-based padding.
    const depth = node.depth || 0;
    const paddingLeft = isFlat ? 4 : (depth * 16 + 4);

    const isFolder = node.type === 'directory';

    return (
        <div
            className={`tree-node ${isFocused ? 'focused' : ''} ${node.status}`}
            onClick={() => actions.onSelect(node)}
            data-node-path={node.path}
            style={{
                ...style, // Absolute position from VirtualList
                paddingLeft: `${paddingLeft}px`,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
            }}
        >
            {/* Expansion Toggle */}
            <span
                className="toggle-icon"
                onClick={(e) => {
                    e.stopPropagation();
                    if (isFolder) onToggle(node.path);
                }}
                style={{
                    width: '16px',
                    display: 'inline-block',
                    // Hide toggle in flat mode to enforce "flat" look, per user expectation of "consistent horizontal position"
                    visibility: (isFolder && !isFlat) ? 'visible' : 'hidden',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.1s'
                }}
            >
                ▶
            </span>

            {/* Icon Area with Depth Badge */}
            <div style={{ position: 'relative', marginRight: '6px', display: 'flex', alignItems: 'center' }}>
                {/* Depth Badge for Flat View */}
                {isFlat && isFolder && (
                    <span className="depth-badge" style={{
                        position: 'absolute',
                        top: '-6px',
                        left: '-4px',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        color: '#94a3b8',
                        zIndex: 1
                    }}>
                        {depth}
                    </span>
                )}
                <span>
                    {isFolder ? (isExpanded ? '📂' : '📁') : '📄'}
                </span>
            </div>

            {/* Name */}
            <span className="node-name" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {depth === 0 ? (
                    side === 'left' ? (node.left_name || node.name) :
                        side === 'right' ? (node.right_name || node.name) :
                            // Unified
                            (node.left_name && node.right_name && node.left_name !== node.right_name)
                                ? `${node.left_name} / ${node.right_name}`
                                : node.name
                ) : node.name}
            </span>

            {/* Status Icon */}
            {node.status && node.status !== 'same' && (
                <span className={`item-status ${node.status}`}>
                    {node.status === 'added' ? '+' :
                        node.status === 'removed' ? '-' :
                            node.status === 'modified' ? '!' : ''}
                </span>
            )}

            {/* Actions */}
            <TreeRowActions node={node} side={side} actions={actions} />
        </div>
    );
};
