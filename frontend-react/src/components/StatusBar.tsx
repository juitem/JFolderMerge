import React from 'react';
import { Globe, ShieldAlert, ShieldCheck, FolderOpen, FileText } from 'lucide-react';

interface StatusBarProps {
    globalStats?: { added: number, removed: number, modified: number };
    currentFolderStats?: { added: number, removed: number, modified: number } | null;
    fileLineStats?: { added: number, removed: number, groups: number } | null;
    selectionCount: number;
    onSelectByStatus: (status: 'added' | 'removed' | 'modified') => void;
    onClearSelection: () => void;
    onExecuteBatchMerge: (dir: 'left-to-right' | 'right-to-left') => void;
    onExecuteBatchDelete: (side: 'left' | 'right') => void;
    isExplicitSelectionMode?: boolean;
    onToggleExplicitSelectionMode?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
    globalStats,
    currentFolderStats,
    fileLineStats,
    onSelectByStatus,
    isExplicitSelectionMode,
    onToggleExplicitSelectionMode
}) => {
    return (
        <div className="status-bar" style={{
            display: 'flex',
            alignItems: 'center',
            height: '24px', // Compact
            minHeight: '24px',
            flexShrink: 0,
            background: 'rgba(15, 23, 42, 0.6)', // Semi-transparent Slate-900 (matches popup dark theme but transp)
            backdropFilter: 'blur(4px)', // Frosted glass effect
            borderTop: '1px solid var(--border-color)',
            padding: '0 8px',
            fontSize: '0.75rem',
            marginTop: 'auto',
            color: 'var(--text-secondary)'
        }}>
            {/* Stats Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
                {/* Global Stats */}
                {globalStats && (
                    <span title="Global Stats (Total Changes)" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, opacity: 0.9 }}>
                        <Globe size={12} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ color: '#f59e0b' }}>!{globalStats.modified}</span>
                        <span style={{ color: '#10b981' }}>+{globalStats.added}</span>
                        <span style={{ color: '#ef4444' }}>-{globalStats.removed}</span>
                    </span>
                )}

                {/* Current Folder Stats */}
                {currentFolderStats && (
                    <span title="Current Folder Stats" style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8, borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
                        <FolderOpen size={12} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ color: '#f59e0b' }}>!{currentFolderStats.modified}</span>
                        <span style={{ color: '#10b981' }}>+{currentFolderStats.added}</span>
                        <span style={{ color: '#ef4444' }}>-{currentFolderStats.removed}</span>
                    </span>
                )}

                {/* File Line Stats */}
                {fileLineStats && (
                    <span title="Current File Stats" style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8, borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
                        <FileText size={12} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ color: '#f59e0b', fontStyle: 'italic', fontWeight: 'bold' }}>{fileLineStats.groups}</span>
                        <span style={{ color: '#10b981' }}>+{fileLineStats.added}</span>
                        <span style={{ color: '#ef4444' }}>-{fileLineStats.removed}</span>
                    </span>
                )}
            </div>

            {/* Select Triggers (Restored) */}
            <div className="filter-group" style={{ display: 'flex', gap: '4px', opacity: 0.8 }}>
                {/* Explicit Selection Mode Toggle */}
                {onToggleExplicitSelectionMode && (
                    <button
                        className={`icon-btn xs ${isExplicitSelectionMode ? 'active' : ''}`}
                        onClick={onToggleExplicitSelectionMode}
                        title={isExplicitSelectionMode ? "Exit Selection Mode" : "Start Selection Mode"}
                        style={{ color: isExplicitSelectionMode ? 'var(--accent-color)' : 'var(--text-secondary)', marginRight: '8px' }}
                    >
                        <ShieldCheck size={14} style={{ opacity: isExplicitSelectionMode ? 1 : 0.5 }} />
                    </button>
                )}

                <button className="icon-btn xs" onClick={() => onSelectByStatus('added')} title="Select All Added" style={{ color: '#10b981' }}>
                    <ShieldCheck size={14} />
                </button>
                <button className="icon-btn xs" onClick={() => onSelectByStatus('removed')} title="Select All Removed" style={{ color: '#ef4444' }}>
                    <ShieldAlert size={14} />
                </button>
                <button className="icon-btn xs" onClick={() => onSelectByStatus('modified')} title="Select All Modified" style={{ color: '#f59e0b' }}>
                    <Globe size={14} />
                </button>
            </div>
        </div>
    );
};
