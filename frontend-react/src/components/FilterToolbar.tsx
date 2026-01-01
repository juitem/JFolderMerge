import React from 'react';
import { Folder, FileText, Play, BookOpen, ListTree, AlignJustify, PanelRight, ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert, Maximize, Minimize, Lock, LockOpen, Globe } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import type { DiffMode } from '../types';

interface FilterToolbarProps {
    onCompare: () => void;
    loading: boolean;
    diffMode: DiffMode;
    setDiffMode: (mode: DiffMode) => void;
    onToggleFileView?: () => void;
    onAdjustWidth?: (delta: number) => void;
    isLocked?: boolean;
    setIsLocked?: (b: boolean) => void;
    globalStats?: { added: number, removed: number, modified: number };
    currentFolderStats?: { added: number, removed: number, modified: number } | null;
    fileLineStats?: { added: number, removed: number, groups: number } | null;
}

export function FilterToolbar({
    onCompare, loading,
    // diffMode, setDiffMode
    onToggleFileView,
    onAdjustWidth,
    isLocked,
    setIsLocked,
    globalStats,
    currentFolderStats,
    fileLineStats
}: FilterToolbarProps) {
    const { config, toggleFilter, toggleDiffFilter, setViewOption } = useConfig();
    const folderViewMode = config?.viewOptions?.folderViewMode || 'split';

    const [isFullScreen, setIsFullScreen] = React.useState(!!document.fullscreenElement);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    React.useEffect(() => {
        const handleChange = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    if (!config) return null;

    return (
        <div className="toolbar compact-toolbar">
            <div className="filter-group" style={{ gap: '2px' }}>
                <button className={`icon-btn ${isFullScreen ? 'active' : ''}`} onClick={toggleFullScreen} title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}>
                    {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
                <div style={{ width: '1px', height: '16px', background: '#ccc', margin: '0 4px', flexShrink: 0 }}></div>
                <button className={`icon-btn ${folderViewMode === 'split' ? 'active' : ''}`} onClick={() => setViewOption('folderViewMode', 'split')} title="Split Tree View">
                    <BookOpen size={16} />
                </button>
                <button className={`icon-btn ${folderViewMode === 'unified' ? 'active' : ''}`} onClick={() => setViewOption('folderViewMode', 'unified')} title="Unified Tree View">
                    <ListTree size={16} />
                </button>
                <button className={`icon-btn ${folderViewMode === 'flat' ? 'active' : ''}`} onClick={() => setViewOption('folderViewMode', 'flat')} title="Flat Tree View (No Indent)">
                    <AlignJustify size={16} style={{ transform: 'rotate(90deg)' }} />
                </button>
                <div style={{ width: '1px', height: '16px', background: '#ccc', margin: '0 4px', flexShrink: 0 }}></div>
                <button
                    className={`icon-btn ${isLocked ? 'active' : ''}`}
                    onClick={() => setIsLocked?.(!isLocked)}
                    title={isLocked ? "Unlock View State" : "Lock View State (Fix Folders Closed/Open)"}
                >
                    {isLocked ? <Lock size={18} /> : <LockOpen size={18} />}
                </button>
                <button
                    className="icon-btn"
                    onClick={isLocked ? undefined : onToggleFileView}
                    title="Toggle File View"
                    style={{ opacity: isLocked ? 0.4 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}
                >
                    <PanelRight size={16} />
                </button>
                <button
                    className="icon-btn"
                    onClick={isLocked ? undefined : (() => onAdjustWidth?.(5))}
                    title="Shrink File View (Widen Tree)"
                    style={{ opacity: isLocked ? 0.4 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    className="icon-btn"
                    onClick={isLocked ? undefined : (() => onAdjustWidth?.(-5))}
                    title="Expand File View (Shrink Tree)"
                    style={{ opacity: isLocked ? 0.4 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}
                >
                    <ChevronLeft size={16} />
                </button>
            </div>
            <div className="separator"></div>
            <div className="filter-group">
                <Folder size={16} className="filter-icon" />
                <label className="checkbox-container" title="Show Modified">
                    <input type="checkbox" checked={config.folderFilters?.modified ?? true} onChange={() => toggleFilter('modified')} />
                    <span className="checkmark modified"></span>
                </label>
                <label className="checkbox-container" title="Show Added">
                    <input type="checkbox" checked={config.folderFilters?.added ?? true} onChange={() => toggleFilter('added')} />
                    <span className="checkmark added"></span>
                </label>
                <label className="checkbox-container" title="Show Removed">
                    <input type="checkbox" checked={config.folderFilters?.removed ?? true} onChange={() => toggleFilter('removed')} />
                    <span className="checkmark removed"></span>
                </label>
                <label className="checkbox-container" title="Show Same">
                    <input type="checkbox" checked={config.folderFilters?.same ?? true} onChange={() => toggleFilter('same')} />
                    <span className="checkmark same"></span>
                </label>
            </div>

            <div className="separator"></div>

            <div className="filter-group">
                <FileText size={16} className="filter-icon" />
                <label className="checkbox-container" title="Show Modified Lines">
                    <input type="checkbox" checked={config.diffFilters?.modified ?? true} onChange={() => toggleDiffFilter('modified')} />
                    <span className="checkmark modified"></span>
                </label>
                <label className="checkbox-container" title="Show Added Lines">
                    <input type="checkbox" checked={config.diffFilters?.added ?? true} onChange={() => toggleDiffFilter('added')} />
                    <span className="checkmark added"></span>
                </label>
                <label className="checkbox-container" title="Show Removed Lines">
                    <input type="checkbox" checked={config.diffFilters?.removed ?? true} onChange={() => toggleDiffFilter('removed')} />
                    <span className="checkmark removed"></span>
                </label>
                <label className="checkbox-container" title="Show Same Lines">
                    <input type="checkbox" checked={config.diffFilters?.same ?? false} onChange={() => toggleDiffFilter('same')} />
                    <span className="checkmark same"></span>
                </label>
            </div>

            <div className="separator"></div>

            {/* Stats Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Global Stats */}
                {globalStats && (
                    <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, opacity: 0.9 }}>
                        <Globe size={16} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ color: '#f59e0b' }}>!{globalStats.modified}</span>
                        <span style={{ color: '#10b981' }}>+{globalStats.added}</span>
                        <span style={{ color: '#ef4444' }}>-{globalStats.removed}</span>
                    </span>
                )}

                {/* Current Folder Stats */}
                {currentFolderStats && (
                    <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8 }}>
                        <Folder size={16} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ color: '#f59e0b' }}>!{currentFolderStats.modified}</span>
                        <span style={{ color: '#10b981' }}>+{currentFolderStats.added}</span>
                        <span style={{ color: '#ef4444' }}>-{currentFolderStats.removed}</span>
                    </span>
                )}

                {/* File Line Stats */}
                {fileLineStats && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} style={{ color: 'var(--text-secondary)', opacity: 0.8 }} />
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, fontStyle: 'italic', color: '#f59e0b', textShadow: 'none' }}>
                                {fileLineStats.groups}
                            </span>
                            <span style={{ fontSize: '11px', display: 'flex', gap: '3px', fontWeight: 600, color: 'var(--text-secondary)', opacity: 0.8 }}>
                                <span style={{ color: '#10b981' }}>+{fileLineStats.added}</span>
                                <span style={{ color: '#ef4444' }}>-{fileLineStats.removed}</span>
                            </span>
                        </div>
                    </span>
                )}
            </div>

            <div className="separator"></div>






            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid #444', paddingRight: '8px', marginRight: '4px' }}>
                    <button className={`icon-btn ${config?.viewOptions?.confirmMerge !== false ? 'active' : ''}`}
                        onClick={() => setViewOption('confirmMerge', config?.viewOptions?.confirmMerge === false)}
                        title={config?.viewOptions?.confirmMerge !== false ? "Merge Confirmation: ON" : "Merge Confirmation: OFF"}>
                        <ShieldCheck size={16} />
                    </button>
                    <button className={`icon-btn ${config?.viewOptions?.confirmDelete !== false ? 'active' : ''}`}
                        onClick={() => setViewOption('confirmDelete', config?.viewOptions?.confirmDelete === false)}
                        title={config?.viewOptions?.confirmDelete !== false ? "Delete Confirmation: ON" : "Delete Confirmation: OFF"}>
                        <ShieldAlert size={16} />
                    </button>
                </div>

                <button className="primary-btn compare-btn" onClick={onCompare} disabled={loading} style={{ fontSize: '14px' }}>
                    <Play size={16} style={{ marginRight: '6px' }} />
                    {loading ? 'Running...' : 'Compare'}
                </button>
            </div>
        </div>
    );
}
