import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Plus, Trash2 } from 'lucide-react';

interface ManageFiltersModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'folders' | 'files'; // 'folders' or 'files'
    activeFiltersStr: string; // "node_modules, .git"
    disabledFilters: string[]; // ["dist", "build"]
    onSave: (newActiveStr: string, newDisabled: string[]) => void;
}

interface FilterItem {
    value: string;
    isActive: boolean;
}

export const ManageFiltersModal: React.FC<ManageFiltersModalProps> = ({
    isOpen,
    onClose,
    type,
    activeFiltersStr,
    disabledFilters,
    onSave
}) => {
    const [filters, setFilters] = useState<FilterItem[]>([]);
    const [newFilter, setNewFilter] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Parse active string
            const actives = activeFiltersStr
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            // Combine with disabled
            const initialItems: FilterItem[] = [
                ...actives.map(val => ({ value: val, isActive: true })),
                ...disabledFilters.map(val => ({ value: val, isActive: false }))
            ];

            // Remove duplicates (prefer active)
            const uniqueMap = new Map<string, FilterItem>();
            initialItems.forEach(item => {
                if (!uniqueMap.has(item.value) || item.isActive) {
                    uniqueMap.set(item.value, item);
                }
            });

            setFilters(Array.from(uniqueMap.values()).sort((a, b) => a.value.localeCompare(b.value)));
            setNewFilter('');
        }
    }, [isOpen, activeFiltersStr, disabledFilters]);

    const handleToggle = (value: string) => {
        setFilters(prev => prev.map(item =>
            item.value === value ? { ...item, isActive: !item.isActive } : item
        ));
    };

    const handleDelete = (value: string) => {
        setFilters(prev => prev.filter(item => item.value !== value));
    };

    const handleAdd = () => {
        if (!newFilter.trim()) return;
        const val = newFilter.trim();
        if (filters.some(f => f.value === val)) {
            // Already exists, just ensure active?
            alert('Filter already exists');
            return;
        }
        setFilters(prev => [...prev, { value: val, isActive: true }].sort((a, b) => a.value.localeCompare(b.value)));
        setNewFilter('');
    };

    const handleSave = () => {
        const newActive = filters
            .filter(f => f.isActive)
            .map(f => f.value)
            .join(', '); // Standard comma-space separator

        const newDisabled = filters
            .filter(f => !f.isActive)
            .map(f => f.value);

        onSave(newActive, newDisabled);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Manage ${type === 'folders' ? 'Folder' : 'File'} Filters`}
            width="500px"
        >
            <div className="manage-filters-content" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={newFilter}
                        onChange={e => setNewFilter(e.target.value)}
                        placeholder="Add new filter..."
                        className="filter-input"
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                    <button className="primary-btn small" onClick={handleAdd}>
                        <Plus size={16} /> Add
                    </button>
                </div>

                <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                    {filters.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '20px', fontStyle: 'italic' }}>
                            No filters defined.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {filters.map(item => (
                                <div key={item.value} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    background: item.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.2)',
                                    border: item.isActive ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid transparent',
                                    opacity: item.isActive ? 1 : 0.7
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={item.isActive}
                                        onChange={() => handleToggle(item.value)}
                                        style={{ marginRight: '12px', cursor: 'pointer', width: '16px', height: '16px' }}
                                    />
                                    <span style={{
                                        flex: 1,
                                        color: item.isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        textDecoration: item.isActive ? 'none' : 'line-through'
                                    }}>
                                        {item.value}
                                    </span>
                                    <button
                                        className="icon-btn tiny delete-hover"
                                        onClick={() => handleDelete(item.value)}
                                        title="Remove Filter"
                                        style={{ color: '#ef4444' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '12px' }}>
                <button className="secondary-btn" onClick={onClose}>Cancel</button>
                <button className="primary-btn" onClick={handleSave}>Save Changes</button>
            </div>
        </Modal>
    );
};
