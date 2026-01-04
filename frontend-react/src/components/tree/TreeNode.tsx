import React from 'react';
import type { FileNode, Config } from '../../types';
import { TreeRowActions } from './TreeRowActions';
import { layoutService } from '../../services/layout/LayoutService';
import { Folder, FolderOpen, FileText, ChevronRight } from 'lucide-react';

export interface TreeNodeProps {
    node: FileNode;
    side: 'left' | 'right' | 'unified';
    isExpanded: boolean;
    isFocused: boolean;
    focusZone?: 'content' | 'accept' | 'revert';
    isSelected?: boolean;
    onToggle: (path: string) => void;
    actions: {
        onSelect: (node: FileNode, event?: React.MouseEvent) => void;
        onMerge: (node: FileNode, direction: 'left-to-right' | 'right-to-left') => void;
        onDelete: (node: FileNode, side: 'left' | 'right') => void;
        onFocus?: (node: FileNode) => void;
        onHide?: (path: string) => void;
        onContextMenu?: (e: React.MouseEvent, node: FileNode) => void;
    };
    // stats removed from props or ignored if unused
    stats?: { added: number, removed: number, modified: number };
    style?: React.CSSProperties;
    config: Config;
    searchQuery: string;
    focusedPath?: string | null;
    folderStats?: Map<string, any>;
    expandedPaths?: Set<string>;
    isInSelectionSet?: boolean;
    onToggleSelection?: (path: string) => void;
    isSelectionMode?: boolean;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({
    node,
    side,
    isExpanded,
    isFocused,
    isSelected,
    onToggle,
    actions,
    style,
    config,
    isInSelectionSet,
    onToggleSelection,
    isSelectionMode,
    focusZone = 'content'
}) => {
    // Debugging: Ensure onToggleSelection is defined
    const handleCheckboxClick = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggleSelection) {
            onToggleSelection(node.path);
        }
    }, [onToggleSelection, node.path]);
    const isFlat = config.viewOptions?.folderViewMode === 'flat';
    const statusMode = (config.viewOptions?.statusDisplayMode as number) ?? 2;
    const showText = statusMode === 1 || statusMode === 2;
    const showIcon = statusMode === 0 || statusMode === 2;

    // In flat mode, use fixed padding for ALL items to align them.
    // In tree mode, use depth-based padding.
    const depth = node.depth || 0;
    const paddingLeft = isFlat ? 4 : (depth * 16 + 4);

    const isFolder = node.type === 'directory';

    const isMissingOnSide = (side === 'left' && node.status === 'added') ||
        (side === 'right' && node.status === 'removed');

    return (
        <div
            className={`tree-row tree-node ${isFolder ? 'directory' : 'file'} ${isFocused ? 'focused-row' : ''} ${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''} ${node.status} ${(node as any).isHidden ? 'is-hidden' : ''}`}
            onClick={(e) => actions.onSelect(node, e)}
            onContextMenu={(e) => actions.onContextMenu && actions.onContextMenu(e, node)}
            onDoubleClick={(e) => {
                actions.onSelect(node, e);
                // Also trigger focus to content if it's a file, as per cmd.open behavior
                if (node.type === 'file') {
                    layoutService.focusContent();
                }
            }}
            data-node-path={node.path}
            style={{
                ...style, // Absolute position from VirtualList
                paddingLeft: `${paddingLeft}px`,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
            }}
        >

            {/* Selection Checkbox */}
            {(config.viewOptions?.showSelectionCheckboxes !== false) && (isInSelectionSet || isSelectionMode || config.viewOptions?.showSelectionCheckboxes === true) && (
                <div
                    className="node-checkbox"
                    onClick={handleCheckboxClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        marginRight: '2px',
                        visibility: isMissingOnSide ? 'hidden' : 'visible'
                    }}
                >
                    <input
                        type="checkbox"
                        checked={isInSelectionSet || false}
                        readOnly
                        style={{ cursor: 'pointer' }}
                    />
                </div>
            )}

            {/* Expansion Toggle */}
            <span
                className="toggle-icon"
                onClick={(e) => {
                    e.stopPropagation();
                    if (isFolder) onToggle(node.path);
                }}
                style={{
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Hide toggle in flat mode OR for Root (depth 0) to enforce stability
                    // Also hide if missing on this side? Directories usually exist in both or handled differently.
                    // If directory is 'added', it's not on left.
                    visibility: (isFolder && !isFlat && depth > 0 && !isMissingOnSide) ? 'visible' : 'hidden',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.1s',
                    color: 'var(--text-secondary, #888)'
                }}
            >
                <ChevronRight size={14} />
            </span>

            {/* Icon Area with Depth Badge */}
            <div style={{
                position: 'relative',
                marginRight: '8px',
                display: 'flex',
                alignItems: 'center',
                opacity: isMissingOnSide ? 0 : 1
            }}>
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
                <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: isFolder ? 'var(--accent-color)' : 'var(--text-secondary)',
                    opacity: isFolder ? 1 : 0.8
                }}>
                    {isFolder ? (isExpanded ? <FolderOpen size={16} strokeWidth={2} /> : <Folder size={16} strokeWidth={2} />) : <FileText size={15} strokeWidth={1.5} />}
                </span>
            </div>

            {/* Name */}
            <span className="node-name" style={{
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                opacity: isMissingOnSide ? 0 : 1, // Visual hide
                color: showText ? (
                    node.status === 'added' ? 'var(--success)' :
                        node.status === 'removed' ? 'var(--danger-soft)' :
                            node.status === 'modified' ? 'var(--warning)' : undefined
                ) : undefined
            }}>
                {depth === 0 ? (
                    side === 'left' ? (node.left_name || node.name) :
                        side === 'right' ? (node.right_name || node.name) :
                            // Unified
                            (node.left_name && node.right_name && node.left_name !== node.right_name)
                                ? `${node.left_name} / ${node.right_name}`
                                : node.name
                ) : node.name}
            </span>

            {/* Status & Actions Rail */}
            <div className="merge-actions" style={{
                // Flex Layout (No Overlay)
                marginLeft: 'auto',
                width: side === 'unified' ? '156px' : 'auto',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                paddingRight: side === 'unified' ? 0 : '8px',
                zIndex: 5,
                flexShrink: 0
            }}>
                {/* Status Icon - Toggleable */}
                {showIcon && (
                    (node.status && node.status !== 'same') ? (
                        <span className={`item-status ${node.status}`}>
                            {node.status === 'added' ? 'A' :
                                node.status === 'removed' ? 'R' :
                                    node.status === 'modified' ? 'M' : ''}
                        </span>
                    ) : (
                        <div style={{ width: '20px' }}></div> /* Reserved space for stability */
                    )
                )}

                {/* Actions */}
                <TreeRowActions
                    node={node}
                    side={side}
                    actions={actions}
                    showMerge={config.viewOptions?.showMergeIcons !== false}
                    showDelete={config.viewOptions?.showDeleteIcons !== false}
                    showHide={config.viewOptions?.showHideIcons !== false}
                    focusZone={focusZone}
                />
            </div>
        </div>
    );
};

export const TreeNode = React.memo(TreeNodeComponent);
