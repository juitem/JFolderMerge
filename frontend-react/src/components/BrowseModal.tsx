import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api';
import { Folder, File, ArrowUp, Loader } from 'lucide-react';

interface BrowseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
    initialPath?: string;
    title?: string;
    mode?: 'file' | 'directory';
    restrictTo?: string;
    submitLabel?: string;
}

interface FileItem {
    name: string;
    path: string;
    is_dir: boolean;
}

export const BrowseModal: React.FC<BrowseModalProps> = ({ isOpen, onClose, onSelect, initialPath, title = "Browse Folder", mode = 'directory', restrictTo, submitLabel }) => {
    const [currentPath, setCurrentPath] = useState("/");
    const [items, setItems] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    // Initialization on Open
    useEffect(() => {
        if (isOpen) {
            setItems([]); // Clear stale items immediately
            setError(null);

            // If new path requested, update state (triggers load via dependency)
            // If path is same, force load manually
            if (initialPath && initialPath !== currentPath) {
                setCurrentPath(initialPath);
            } else {
                loadDir(currentPath);
            }
        }
    }, [isOpen]); // Only run when opening/closing state changes

    // Fetch on path change (Navigation)
    useEffect(() => {
        if (!isOpen) return;
        loadDir(currentPath);
        setSelectedFile(null);
    }, [currentPath]); // Run when user navigates

    const loadDir = async (path: string) => {
        setLoading(true);
        setError(null); // Clear error on new load attempt
        try {
            const res = await api.listDirs(path, true); // Always include files now so we can see them
            setCurrentPath(res.current); // Normalize path

            // Map strings to FileItems
            const dirItems: FileItem[] = res.dirs.map(d => ({
                name: d,
                path: `${res.current}/${d}`.replace('//', '/'),
                is_dir: true
            }));

            const fileItems: FileItem[] = res.files.map(f => ({
                name: f,
                path: `${res.current}/${f}`.replace('//', '/'),
                is_dir: false
            }));

            setItems([...dirItems, ...fileItems]);
            setError(null); // Clear error on successful load
        } catch (e: any) {
            console.error("Failed to list dir", e);
            setItems([]); // Clear items on error to avoid confusion
            setError("Failed to load directory.");
        } finally {
            setLoading(false);
        }
    };

    const handleUp = () => {
        // Restriction Check
        if (restrictTo) {
            // Normalize paths for comparison (remove trailing slashes)
            const cur = currentPath.replace(/\/$/, '');
            const res = restrictTo.replace(/\/$/, '');
            if (cur === res) return; // Already at root of restriction
            if (cur.length <= res.length) return; // Should not happen if logic is correct
        }

        // Use parent from API would be better if available, but string manip works for now
        // const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
        // Better: Use '..' relative path logic with API? No, API takes absolute.
        // Simple string manipulation:
        const parts = currentPath.split('/').filter(p => p);
        if (parts.length === 0) return;
        const parent = '/' + parts.slice(0, -1).join('/');

        // Final sanity check for restriction
        if (restrictTo && parent.length < restrictTo.replace(/\/$/, '').length) return;

        setCurrentPath(parent || '/');
    };

    const handleItemClick = (item: FileItem) => {
        if (item.is_dir) {
            loadDir(item.path);
        } else {
            if (mode === 'file') {
                setSelectedFile(item.path);
                setError(null); // Clear error on selection
            }
        }
    };

    const handleSelectCurrent = () => {
        if (mode === 'directory') {
            onSelect(currentPath);
            onClose();
        } else { // mode === 'file'
            if (selectedFile) {
                onSelect(selectedFile);
                onClose();
            } else {
                setError("Please select a file.");
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} width="600px">
            <div className="browse-container" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
                {/* Path Bar */}
                <div className="browse-header" style={{ padding: '10px', display: 'flex', gap: '10px' }}>
                    <button className="icon-btn" onClick={handleUp} title="Up Level">
                        <ArrowUp size={18} />
                    </button>
                    <input
                        className="path-input"
                        value={currentPath}
                        onChange={e => setCurrentPath(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && loadDir(currentPath)}
                        style={{ flex: 1, padding: '5px' }}
                    />
                    <button className="primary-btn small" onClick={() => loadDir(currentPath)}>Go</button>
                </div>

                {/* List */}
                <div className="browse-list custom-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                    {loading ? (
                        <div className="loading-center"><Loader className="spin" /> Loading...</div>
                    ) : error && !items.length ? ( // Only show error here if no items are loaded
                        <div className="error-msg" style={{ color: 'red', padding: '10px' }}>{error}</div>
                    ) : (
                        items.map((item) => {
                            const isSelected = selectedFile === item.path;
                            return (
                                <div
                                    key={item.path}
                                    className={`browse-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleItemClick(item)}
                                    style={{
                                        display: 'flex', alignItems: 'center', padding: '8px 15px',
                                        cursor: 'pointer', borderBottom: '1px solid #333',
                                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                                    }}
                                >
                                    {item.is_dir ?
                                        <Folder size={16} fill="var(--folder-color, #eab308)" stroke="none" style={{ marginRight: '10px', flexShrink: 0 }} /> :
                                        <File size={16} style={{ marginRight: '10px', opacity: mode === 'file' ? 1 : 0.5, flexShrink: 0 }} />
                                    }
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{item.name}</span>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' }}>
                {error && <span style={{ color: '#ff6b6b', fontSize: '0.9rem', marginRight: 'auto' }}>{error}</span>}
                <button className="secondary-btn" onClick={onClose}>Cancel</button>
                <button className="primary-btn" onClick={handleSelectCurrent}>{submitLabel || 'Select'}</button>
            </div>
        </Modal>
    );
};
