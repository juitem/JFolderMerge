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
        onSelect: (node: FileNode) => void;
        onMerge: (node: FileNode, direction: 'left-to-right' | 'right-to-left') => void;
        onDelete: (node: FileNode, side: 'left' | 'right') => void;
        onFocus?: (node: FileNode) => void;
    };
    side: 'left' | 'right' | 'unified';
    selectedPath?: string | null;
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
    side
}) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // Scroll to focused path
    useEffect(() => {
        if (focusedPath) {
            const index = visibleNodes.findIndex(n => n.path === focusedPath);
            if (index !== -1 && virtuosoRef.current) {
                // Use specific alignment for boundaries to improve wrap-around feel
                let align: 'start' | 'center' | 'end' = 'center';
                if (index === 0) align = 'start';
                else if (index === visibleNodes.length - 1) align = 'end';

                virtuosoRef.current.scrollToIndex({ index, align });
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
                        />
                    );
                }}
                style={{ height: '100%', width: '100%' }}
            />
        </div>
    );
};
