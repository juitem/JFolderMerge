import React, { useRef, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { VirtuosoHandle } from 'react-virtuoso';
import type { FileNode, Config } from '../../types';
import { TreeNode } from './TreeNode';

interface VirtualTreeListProps {
    visibleNodes: FileNode[];
    focusedPath: string | null;
    expandedPaths: Set<string>;
    onToggle: (path: string) => void;
    config: Config;
    searchQuery: string;
    folderStats: Map<string, { added: number, removed: number, modified: number }>;
    actions: {
        onSelect: (node: FileNode, event?: React.MouseEvent) => void;
        onMerge: (node: FileNode, direction: 'left-to-right' | 'right-to-left') => void;
        onDelete: (node: FileNode, side: 'left' | 'right') => void;
        onFocus?: (node: FileNode) => void;
    };
    side: 'left' | 'right' | 'unified';
    selectedPath?: string | null;
    selectionSet?: Set<string>;
    onToggleSelection?: (path: string) => void;
    virtuosoRef?: React.RefObject<VirtuosoHandle>;
    scrollerRef?: (ref: HTMLElement | Window | null) => void;
    isSelectionMode?: boolean;
}

export const VirtualTreeList: React.FC<VirtualTreeListProps> = ({
    visibleNodes,
    focusedPath,
    selectedPath,
    expandedPaths,
    onToggle,
    config,
    searchQuery,
    folderStats,
    actions,
    side,
    selectionSet,
    onToggleSelection,
    virtuosoRef: externalVirtuosoRef,
    scrollerRef,
    isSelectionMode
}) => {
    const internalVirtuosoRef = useRef<VirtuosoHandle>(null);
    const virtuosoRef = externalVirtuosoRef || internalVirtuosoRef;

    // Scroll to focused path
    useEffect(() => {
        console.log('[VirtualTreeList] Effect Triggered. FocusedPath:', focusedPath, 'VisibleNodes:', visibleNodes.length);
        if (focusedPath !== null && focusedPath !== undefined) {
            const index = visibleNodes.findIndex(n => n.path === focusedPath);
            console.log('[VirtualTreeList] Calculated Index:', index, 'VirtuosoRef:', !!virtuosoRef.current);
            if (index !== -1 && virtuosoRef.current) {
                // Use specific alignment for boundaries to improve wrap-around feel
                let align: 'start' | 'center' | 'end' = 'center';
                if (index === 0) align = 'start';
                else if (index === visibleNodes.length - 1) align = 'end';

                const behavior = config.viewOptions?.smoothScrollFolder === false ? 'auto' : 'smooth';
                console.log('[VirtualTreeList] Scrolling to:', index, 'Align:', align, 'Behavior:', behavior);
                virtuosoRef.current.scrollToIndex({ index, align, behavior });
            }
        }
    }, [focusedPath, visibleNodes]);

    return (
        <div style={{ flex: 1, height: '100%', width: '100%' }}>
            <Virtuoso
                ref={virtuosoRef}
                data={visibleNodes}
                totalCount={visibleNodes.length}
                itemContent={(_, node) => {
                    const isExpanded = expandedPaths.has(node.path);
                    const isFocused = node.path === focusedPath;
                    const isSelected = !!selectedPath && node.path === selectedPath;
                    const stats = folderStats.get(node.path);

                    return (
                        <TreeNode
                            node={node}
                            side={side}
                            isExpanded={isExpanded}
                            isFocused={isFocused}
                            isSelected={isSelected}
                            onToggle={onToggle}
                            config={config}
                            searchQuery={searchQuery}
                            stats={stats}
                            actions={actions}
                            focusedPath={focusedPath}
                            folderStats={folderStats}
                            expandedPaths={expandedPaths}
                            isInSelectionSet={selectionSet?.has(node.path)}
                            onToggleSelection={onToggleSelection}
                            isSelectionMode={isSelectionMode}
                        />
                    );
                }}
                style={{ height: '100%', width: '100%' }}
                scrollerRef={scrollerRef}
            />
        </div>
    );
};
