import { Folder, FileText, Upload, Play, AlignJustify, Columns, Layout, FileCode } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import type { DiffMode } from '../types';

interface FilterToolbarProps {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    excludeFolders: string;
    setExcludeFolders: (s: string) => void;
    excludeFiles: string;
    setExcludeFiles: (s: string) => void;
    onBrowse: (target: 'import-exclude-folders' | 'import-exclude-files') => void;
    onCompare: () => void;
    loading: boolean;
    diffMode: DiffMode;
    setDiffMode: (mode: DiffMode) => void;
}

export function FilterToolbar({
    searchQuery, setSearchQuery,
    excludeFolders, setExcludeFolders,
    excludeFiles, setExcludeFiles,
    onBrowse, onCompare, loading,
    diffMode, setDiffMode
}: FilterToolbarProps) {
    const { config, toggleFilter, toggleDiffFilter } = useConfig();

    if (!config) return null;

    return (
        <div className="toolbar compact-toolbar">
            <div className="filter-group">
                <Folder size={16} className="filter-icon" />
                <label className="checkbox-container" title="Show Added">
                    <input type="checkbox" checked={config.folderFilters?.added ?? true} onChange={() => toggleFilter('added')} />
                    <span className="checkmark added"></span>
                </label>
                <label className="checkbox-container" title="Show Removed">
                    <input type="checkbox" checked={config.folderFilters?.removed ?? true} onChange={() => toggleFilter('removed')} />
                    <span className="checkmark removed"></span>
                </label>
                <label className="checkbox-container" title="Show Modified">
                    <input type="checkbox" checked={config.folderFilters?.modified ?? true} onChange={() => toggleFilter('modified')} />
                    <span className="checkmark modified"></span>
                </label>
                <label className="checkbox-container" title="Show Same">
                    <input type="checkbox" checked={config.folderFilters?.same ?? true} onChange={() => toggleFilter('same')} />
                    <span className="checkmark same"></span>
                </label>
            </div>

            <div className="separator"></div>

            <div className="filter-group">
                <FileText size={16} className="filter-icon" />
                <label className="checkbox-container" title="Show Added Lines">
                    <input type="checkbox" checked={config.diffFilters?.added ?? true} onChange={() => toggleDiffFilter('added')} />
                    <span className="checkmark added"></span>
                </label>
                <label className="checkbox-container" title="Show Removed Lines">
                    <input type="checkbox" checked={config.diffFilters?.removed ?? true} onChange={() => toggleDiffFilter('removed')} />
                    <span className="checkmark removed"></span>
                </label>
                <label className="checkbox-container" title="Show Modified Lines">
                    <input type="checkbox" checked={config.diffFilters?.modified ?? true} onChange={() => toggleDiffFilter('modified')} />
                    <span className="checkmark modified"></span>
                </label>
                <label className="checkbox-container" title="Show Same Lines">
                    <input type="checkbox" checked={config.diffFilters?.same ?? false} onChange={() => toggleDiffFilter('same')} />
                    <span className="checkmark same"></span>
                </label>
            </div>

            <div className="separator"></div>

            <div className="filter-group" style={{ gap: '2px' }}>
                <button className={`icon-btn ${diffMode === 'unified' ? 'active' : ''}`} onClick={() => setDiffMode('unified')} title="Unified View">
                    <AlignJustify size={16} />
                </button>
                <button className={`icon-btn ${diffMode === 'side-by-side' ? 'active' : ''}`} onClick={() => setDiffMode('side-by-side')} title="Side-by-Side View">
                    <Columns size={16} />
                </button>
                <button className={`icon-btn ${diffMode === 'combined' ? 'active' : ''}`} onClick={() => setDiffMode('combined')} title="Combined View">
                    <Layout size={16} />
                </button>
                <button className={`icon-btn ${diffMode === 'raw' ? 'active' : ''}`} onClick={() => setDiffMode('raw')} title="Raw Content View">
                    <FileCode size={16} />
                </button>
            </div>

            <div className="separator"></div>

            <div className="search-box">
                <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#eee' }}
                />
            </div>

            <div className="separator"></div>

            <div className="excludes-box" style={{ display: 'flex', gap: '5px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Excl. Folders"
                        value={excludeFolders}
                        onChange={e => setExcludeFolders(e.target.value)}
                        title="Exclude Folders (comma separated)"
                        style={{ width: '100px', padding: '4px 8px', paddingRight: '24px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#eee', fontSize: '0.8rem' }}
                    />
                    <button
                        onClick={() => onBrowse('import-exclude-folders')}
                        style={{ position: 'absolute', right: '2px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' }}
                        title="Import Ignore Folders List"
                    >
                        <Upload size={14} />
                    </button>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Excl. Files"
                        value={excludeFiles}
                        onChange={e => setExcludeFiles(e.target.value)}
                        title="Exclude Files (comma separated)"
                        style={{ width: '100px', padding: '4px 8px', paddingRight: '24px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#eee', fontSize: '0.8rem' }}
                    />
                    <button
                        onClick={() => onBrowse('import-exclude-files')}
                        style={{ position: 'absolute', right: '2px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' }}
                        title="Import Ignore Files List"
                    >
                        <Upload size={14} />
                    </button>
                </div>
            </div>

            <button className="primary-btn compare-btn" onClick={onCompare} disabled={loading} style={{ marginLeft: 'auto' }}>
                <Play size={16} style={{ marginRight: '6px' }} />
                {loading ? 'Running...' : 'Compare'}
            </button>
        </div>
    );
}
