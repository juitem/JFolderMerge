import React from 'react';
import { ArrowLeft, ArrowRight, ShieldAlert, X } from 'lucide-react';

interface SelectionPopupProps {
    selectionCount: number;
    onExecuteBatchMerge: (dir: 'left-to-right' | 'right-to-left') => void;
    onExecuteBatchDelete: (side: 'left' | 'right') => void;
    onClearSelection: () => void;
}

export const SelectionPopup: React.FC<SelectionPopupProps> = ({
    selectionCount,
    onExecuteBatchMerge,
    onExecuteBatchDelete,
    onClearSelection
}) => {
    if (selectionCount === 0) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: '40px', // Floating above status bar
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 16px',
            background: '#1e293b', // Solid dark slate
            border: '1px solid var(--border-color)',
            borderRadius: '50px', // Pill shape
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            color: '#f8fafc',
            whiteSpace: 'nowrap'
        }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#60a5fa' }}>
                {selectionCount} Selected
            </span>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => onExecuteBatchMerge('left-to-right')}
                    title="Merge to Right"
                    className="icon-btn hover-bg"
                    style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}
                >
                    <ArrowRight size={18} />
                </button>
                <button
                    onClick={() => onExecuteBatchMerge('right-to-left')}
                    title="Merge to Left"
                    className="icon-btn hover-bg"
                    style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}
                >
                    <ArrowLeft size={18} />
                </button>
            </div>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => onExecuteBatchDelete('left')}
                    title="Delete from Left"
                    className="icon-btn hover-bg"
                    style={{ color: '#ef4444' }}
                >
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, marginRight: '2px' }}>L</span>
                    <ShieldAlert size={16} />
                </button>
                <button
                    onClick={() => onExecuteBatchDelete('right')}
                    title="Delete from Right"
                    className="icon-btn hover-bg"
                    style={{ color: '#ef4444' }}
                >
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, marginRight: '2px' }}>R</span>
                    <ShieldAlert size={16} />
                </button>
            </div>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

            <button
                onClick={onClearSelection}
                title="Clear Selection (Esc)"
                className="icon-btn hover-bg"
                style={{ color: '#9ca3af' }}
            >
                <X size={18} />
            </button>
        </div>
    );
};
