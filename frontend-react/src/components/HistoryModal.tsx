import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { Clock, ArrowRight } from 'lucide-react';
import type { HistoryItem } from '../types';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    side: 'left' | 'right' | null;
    onSelect: (left: string, right?: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onSelect, side }) => {
    const [items, setItems] = useState<HistoryItem[]>([]); // Need to store full items for Global View
    const [uniquePaths, setUniquePaths] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            api.fetchHistory().then(history => {
                // Filter unique paths for the requested side
                if (side) {
                    const paths = new Set<string>();
                    history.forEach(h => {
                        if (side === 'left' && h.left_path) paths.add(h.left_path);
                        if (side === 'right' && h.right_path) paths.add(h.right_path);
                    });
                    setUniquePaths(Array.from(paths));
                } else {
                    setItems(history);
                }
            }).finally(() => setLoading(false));
        }
    }, [isOpen, side]);

    const handleSelect = (pathOrItem: string | HistoryItem) => {
        if (typeof pathOrItem === 'string') {
            onSelect(pathOrItem);
        } else {
            // Global selection (both) - assume onSelect can handle this?
            // Wait, App.tsx handleHistorySelect currently takes (path: string).
            // We need to update App.tsx to handle both, OR update onSelect signature here.
            // But HistoryModalProps defines onSelect: (path: string) => void;
            // We should change the prop to support both cases or have two callbacks?
            // Or better: onSelect(left, right).
            // But existing refactor changed it to onSelect(path).
            // Let's revert the prop change to onSelect(left, right?) and handle 'side' logic in parent?
            // OR keep it simple: if side is null, we pass combined string? No.

            // Strategy: Update props to allow optional second arg?
            // onSelect: (left: string, right?: string) => void;
            onSelect(pathOrItem.left_path, pathOrItem.right_path);
        }
        onClose();
    };

    const title = side ? `Recent ${side === 'left' ? 'Left' : 'Right'} Folders` : 'Recent Comparisons';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} width="600px">
            <div className="history-list custom-scroll" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {loading ? (
                    <div className="loading-center">Loading...</div>
                ) : (side ? uniquePaths.length === 0 : items.length === 0) ? (
                    <div className="empty-state" style={{ padding: '20px' }}>No history found.</div>
                ) : side ? (
                    uniquePaths.map((path, idx) => (
                        <div
                            key={idx}
                            className="history-item"
                            onClick={() => handleSelect(path)}
                            style={{
                                padding: '12px 15px',
                                borderBottom: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px'
                            }}
                        >
                            <Clock size={16} color="var(--text-secondary)" />
                            <span className="path-text" title={path} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                        </div>
                    ))
                ) : (
                    items.map((item, idx) => (
                        <div
                            key={idx}
                            className="history-item"
                            onClick={() => handleSelect(item)}
                            style={{
                                padding: '12px 15px',
                                borderBottom: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px'
                            }}
                        >
                            <Clock size={16} color="var(--text-secondary)" />
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center' }}>
                                <span className="path-text" title={item.left_path} style={{ textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.left_path}</span>
                                <ArrowRight size={14} color="var(--text-secondary)" />
                                <span className="path-text" title={item.right_path} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.right_path}</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
};
