import React from 'react';
import type { FileNode, Config } from '../../types';
import { TreeNode } from './TreeNode';

export interface TreeColumnProps {
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
    folderStats?: Map<string, any>;
}

export const TreeColumn: React.FC<TreeColumnProps> = (props) => {
    if (!props.nodes) return null;
    return (
        <>{props.nodes.map((node, idx) => (
            <TreeNode key={node.path + idx} node={node} {...props} depth={props.depth || 0} />
        ))}</>
    );
};
