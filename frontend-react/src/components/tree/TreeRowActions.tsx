import React from 'react';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import type { FileNode } from '../../types';

interface TreeRowActionsProps {
    node: FileNode;
    side: 'left' | 'right' | 'unified';
    actions: {
        onMerge: (node: FileNode, dir: 'left-to-right' | 'right-to-left') => void;
        onDelete: (node: FileNode, side: 'left' | 'right') => void;
    };
}

export const TreeRowActions: React.FC<TreeRowActionsProps> = ({ node, side, actions }) => {
    // Logic: Always render 4 buttons for alignment, hide irrelevant ones
    const isLeftVisible = (side === 'left' || side === 'unified') && (node.status === 'modified' || node.status === 'removed');
    const isRightVisible = (side === 'right' || side === 'unified') && (node.status === 'modified' || node.status === 'added');

    return (
        <div className="merge-actions">
            {/* 1. Delete Left (30px) */}
            <button
                className="merge-btn delete"
                tabIndex={-1}
                style={{ visibility: isLeftVisible ? 'visible' : 'hidden' }}
                onClick={(e) => {
                    e.stopPropagation();
                    actions.onDelete(node, 'left');
                }}
                title="Delete from Left"
            >
                <Trash2 size={14} />
            </button>

            {/* 2. Merge Left to Right (16px) */}
            <button
                className="merge-btn"
                tabIndex={-1}
                style={{ visibility: isLeftVisible ? 'visible' : 'hidden' }}
                onClick={(e) => {
                    e.stopPropagation();
                    actions.onMerge(node, 'left-to-right');
                }}
                title="Copy to Right (Revert)"
            >
                <ArrowRight size={14} />
            </button>

            {/* 3. Merge Right to Left (16px) */}
            <button
                className="merge-btn"
                tabIndex={-1}
                style={{ visibility: isRightVisible ? 'visible' : 'hidden' }}
                onClick={(e) => {
                    e.stopPropagation();
                    actions.onMerge(node, 'right-to-left');
                }}
                title="Copy to Left (Accept)"
            >
                <ArrowLeft size={14} />
            </button>

            {/* 4. Delete Right (30px) */}
            <button
                className="merge-btn delete"
                tabIndex={-1}
                style={{ visibility: isRightVisible ? 'visible' : 'hidden' }}
                onClick={(e) => {
                    e.stopPropagation();
                    actions.onDelete(node, 'right');
                }}
                title="Delete from Right"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
};
