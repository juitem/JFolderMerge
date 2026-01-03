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
    showMerge?: boolean;
    showDelete?: boolean;
}

export const TreeRowActions: React.FC<TreeRowActionsProps> = ({ node, side, actions, showMerge = true, showDelete = true }) => {
    // Logic: Always render 4 buttons for alignment, hide irrelevant ones
    const isLeftVisible = (side === 'left' || side === 'unified') && (node.status === 'modified' || node.status === 'removed');
    const isRightVisible = (side === 'right' || side === 'unified') && (node.status === 'modified' || node.status === 'added');

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
            {/* Left Actions Group */}
            {(side === 'left' || side === 'unified') && (
                <>
                    {/* 1. Delete Left (24px) */}
                    {showDelete && (
                        <button
                            className="merge-btn delete-btn"
                            tabIndex={-1}
                            style={{ visibility: isLeftVisible ? 'visible' : 'hidden', width: '24px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.onDelete(node, 'left');
                            }}
                            title="Delete from Left"
                        >
                            <Trash2 size={14} strokeWidth={2.5} />
                        </button>
                    )}

                    {/* 2. Merge Left to Right (48px) */}
                    {showMerge && (
                        <button
                            className="merge-btn to-right"
                            tabIndex={-1}
                            style={{ visibility: isLeftVisible ? 'visible' : 'hidden', width: '48px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.onMerge(node, 'left-to-right');
                            }}
                            title="Copy to Right (Revert)"
                        >
                            <ArrowRight size={14} strokeWidth={2.5} />
                        </button>
                    )}
                </>
            )}

            {/* Right Actions Group */}
            {(side === 'right' || side === 'unified') && (
                <>
                    {/* 3. Merge Right to Left (48px) */}
                    {showMerge && (
                        <button
                            className="merge-btn to-left"
                            tabIndex={-1}
                            style={{ visibility: isRightVisible ? 'visible' : 'hidden', width: '48px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.onMerge(node, 'right-to-left');
                            }}
                            title="Copy to Left (Accept)"
                        >
                            <ArrowLeft size={14} strokeWidth={2.5} />
                        </button>
                    )}

                    {/* 4. Delete Right (24px) */}
                    {showDelete && (
                        <button
                            className="merge-btn delete-btn"
                            tabIndex={-1}
                            style={{ visibility: isRightVisible ? 'visible' : 'hidden', width: '24px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.onDelete(node, 'right');
                            }}
                            title="Delete from Right"
                        >
                            <Trash2 size={14} strokeWidth={2.5} />
                        </button>
                    )}
                </>
            )}
        </div>
    );
};
