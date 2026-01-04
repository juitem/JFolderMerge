import React from 'react';
import { Folder, FileText, Play, BookOpen, ListTree, AlignJustify, PanelRight, PanelLeft, Columns, ChevronLeft, ChevronRight, Lock, LockOpen, Maximize, Minimize, ShieldCheck, ShieldAlert, Focus, Tag, LayoutList, ArrowLeftRight, Trash2, Settings2, Eye, EyeOff, Zap, Hash, WrapText, Layers, Box, RotateCcw, SlidersHorizontal, X, ListChecks, ArrowRightFromLine } from 'lucide-react';
import { ManageFiltersModal } from './Modals/ManageFiltersModal';
import { loggingService } from '../services/infrastructure/LoggingService';

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
    fileLineStats?: { added: number, removed: number, groups: number } | null;
    layoutMode?: 'folder' | 'split' | 'file';
    setLayoutMode?: (mode: 'folder' | 'split' | 'file') => void;

    // Advanced Filter Props
    excludeFolders?: string;
    setExcludeFolders?: (s: string) => void;
    excludeFiles?: string;
    setExcludeFiles?: (s: string) => void;
    onBrowse?: (target: 'import-exclude-folders' | 'import-exclude-files') => void;
    hiddenPaths?: Set<string>;
    toggleHiddenPath?: (path: string) => void;
    showHidden?: boolean;
    toggleShowHidden?: () => void;
}

export function FilterToolbar({
    onCompare,
    loading,
    onAdjustWidth,
    isLocked,
    setIsLocked,
    // fileLineStats, // Unused
    layoutMode,
    setLayoutMode,

    excludeFolders,
    setExcludeFolders,
    excludeFiles,
    setExcludeFiles,
    onBrowse,
    hiddenPaths,
    toggleHiddenPath,
    showHidden,
    toggleShowHidden
}: FilterToolbarProps) {
    const { config, toggleFilter, toggleDiffFilter, setViewOption, saveConfig, toggleViewOption } = useConfig();
    const folderViewMode = config?.viewOptions?.folderViewMode || 'split';

    const [isFullScreen, setIsFullScreen] = React.useState(!!document.fullscreenElement);
    const [isViewMenuOpen, setIsViewMenuOpen] = React.useState(false);
    const viewMenuRef = React.useRef<HTMLDivElement>(null);

    // Advanced Filter State
    const [isFilterSettingsOpen, setIsFilterSettingsOpen] = React.useState(false);

    // Manage Filters Modal State
    const [manageFilterType, setManageFilterType] = React.useState<'folders' | 'files' | null>(null);

    const handleSaveFilters = (newActive: string, newDisabled: string[]) => {
        if (!config || !manageFilterType) return;

        // Update local inputs
        if (manageFilterType === 'folders') {
            setExcludeFolders?.(newActive);
        } else {
            setExcludeFiles?.(newActive);
        }

        // Update Config
        const newConfig = { ...config };

        // Update Saved Excludes (Active)
        newConfig.savedExcludes = {
            ...newConfig.savedExcludes,
            [manageFilterType === 'folders' ? 'folders' : 'files']: newActive
        };

        // Update Disabled Filters
        newConfig.disabledFilters = {
            ...newConfig.disabledFilters,
            [manageFilterType === 'folders' ? 'folders' : 'files']: newDisabled
        };

        loggingService.info('FilterToolbar', `Saving filters for ${manageFilterType}. Active: ${newActive.length}, Disabled: ${newDisabled.length}`);

        saveConfig(newConfig).catch(err => {
            console.error("Failed to save filters", err);
            // Revert? For now just log.
        });
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
                setIsViewMenuOpen(false);
            }
            // Logic for filterSettingsRef handles backdrop click now, so this might be redundant given the Modal overlay structure,
            // but we kept it for the button or if we revert. 
            // Actually, with the new overlay, the backdrop handles the close.
            // But let's leave it to avoid breaking changes if specific interactions rely on it.
        };
        if (isViewMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isViewMenuOpen]);

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
                {/* View Options Dropdown - Moved to Start */}
                <div className="relative" ref={viewMenuRef} style={{ position: 'relative' }}>
                    <button
                        className={`icon-btn ${isViewMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
                        title="View Settings (Status & Actions)"
                    >
                        <Settings2 size={16} />
                    </button>
                    {isViewMenuOpen && (
                        <div className="dropdown-menu" style={{
                            position: 'absolute',
                            top: '100%',
                            left: '0',
                            marginTop: '8px',
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            zIndex: 1000,
                            minWidth: '220px',
                            overflow: 'hidden'
                        }}>
                            <div className="menu-header" style={{ padding: '8px 12px', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>View Options</span>
                            </div>
                            <div className="menu-body" style={{ padding: '4px' }}>
                                {/* Toggles */}
                                <div className="menu-item toggle">
                                    <span className="label">Show Line Numbers</span>
                                    <button
                                        className={`toggle-switch ${config?.viewOptions?.lineNumbers ? 'on' : 'off'}`}
                                        onClick={() => toggleViewOption('lineNumbers')}
                                    >
                                        <div className="thumb"></div>
                                    </button>
                                </div>
                                <div className="menu-item toggle">
                                    <span className="label">Highlight Changes</span>
                                    <button
                                        className={`toggle-switch ${config?.viewOptions?.highlightChanges ? 'on' : 'off'}`}
                                        onClick={() => toggleViewOption('highlightChanges')}
                                    >
                                        <div className="thumb"></div>
                                    </button>
                                </div>
                                <div className="menu-item toggle">
                                    <span className="label">
                                        Word Wrap
                                        <span className="sub-label">Wrap long lines</span>
                                    </span>
                                    <div className="segmented-control tiny">
                                        <button
                                            className={!config?.viewOptions?.wordWrap ? 'active' : ''}
                                            onClick={() => setViewOption('wordWrap', false)}
                                            title="Disable Word Wrap"
                                        >
                                            <ArrowRightFromLine size={15} />
                                        </button>
                                        <button
                                            className={config?.viewOptions?.wordWrap ? 'active' : ''}
                                            onClick={() => setViewOption('wordWrap', true)}
                                            title="Enable Word Wrap"
                                        >
                                            <WrapText size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button className={`icon-btn ${isFullScreen ? 'active' : ''}`} onClick={toggleFullScreen} title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}>
                    {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>

                <button className={`icon-btn ${folderViewMode === 'split' ? 'active' : ''}`} onClick={() => setViewOption('folderViewMode', 'split')} title="Split Tree View">
                    <BookOpen size={16} />
                </button>
                <button className={`icon-btn ${folderViewMode === 'unified' ? 'active' : ''}`} onClick={() => setViewOption('folderViewMode', 'unified')} title="Unified Tree View">
                    <ListTree size={16} />
                </button>
                <button className={`icon-btn ${folderViewMode === 'flat' ? 'active' : ''}`} onClick={() => setViewOption('folderViewMode', 'flat')} title="Flat Tree View (No Indent)">
                    <AlignJustify size={16} style={{ transform: 'rotate(90deg)' }} />
                </button>



                {/* View Options Dropdown */}
                <div className="relative" ref={viewMenuRef} style={{ position: 'relative' }}>
                    <button
                        className={`icon-btn ${isViewMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
                        title="View Settings (Status & Actions)"
                    >
                        <Settings2 size={16} />
                    </button>

                    {isViewMenuOpen && (
                        <div className="view-menu dropdown-popup" style={{
                            position: 'absolute',
                            top: '100%',
                            right: 'auto',
                            left: '0',
                            marginTop: '6px',
                            background: '#0f172a', /* Solid background */
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                            padding: '12px',
                            zIndex: 100,
                            minWidth: '240px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, paddingLeft: '2px', color: '#64748b' }}>STATUS DISPLAY</div>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px' }}>
                                    {[0, 1, 2].map(mode => (
                                        <button
                                            key={mode}
                                            className={`toggle-option ${((config?.viewOptions?.statusDisplayMode as number) ?? 2) === mode ? 'selected' : ''}`}
                                            style={{
                                                flex: 1,
                                                border: 'none',
                                                background: ((config?.viewOptions?.statusDisplayMode as number) ?? 2) === mode ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                                color: ((config?.viewOptions?.statusDisplayMode as number) ?? 2) === mode ? '#60a5fa' : 'var(--text-secondary)',
                                                borderRadius: '4px',
                                                padding: '6px',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                            onClick={() => {
                                                setViewOption('statusDisplayMode', mode);
                                            }}
                                            title={mode === 0 ? "Icon Only" : mode === 1 ? "Text Only" : "Both"}
                                        >
                                            {mode === 0 ? <Tag size={15} /> : mode === 1 ? <AlignJustify size={15} /> : <LayoutList size={15} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0' }}></div>

                            <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, paddingLeft: '2px', color: '#64748b' }}>BEHAVIOR</div>

                            {/* Auto Scroll Selection */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Auto Scroll</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.autoScroll === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.autoScroll === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.autoScroll === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('autoScroll', false)}
                                        title="Disable Auto-Scroll"
                                    >
                                        <EyeOff size={15} />
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.autoScroll !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.autoScroll !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.autoScroll !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('autoScroll', true)}
                                        title="Enable Auto-Scroll"
                                    >
                                        <Focus size={15} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

                            <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, paddingLeft: '2px', color: '#64748b' }}>SCROLLING</div>

                            {/* Folder Fast Scroll (Zap F) */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Folder Fast Scroll</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.smoothScrollFolder !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.smoothScrollFolder !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.smoothScrollFolder !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('smoothScrollFolder', true)}
                                        title="Smooth Scrolling"
                                    >
                                        <RotateCcw size={15} style={{ opacity: 0.8 }} />
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.smoothScrollFolder === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.smoothScrollFolder === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.smoothScrollFolder === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('smoothScrollFolder', false)}
                                        title="Fast Instant Scroll"
                                    >
                                        <Zap size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* File Fast Scroll (Zap T) */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>File Fast Scroll</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.smoothScrollFile !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.smoothScrollFile !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.smoothScrollFile !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('smoothScrollFile', true)}
                                        title="Smooth Scrolling"
                                    >
                                        <RotateCcw size={15} style={{ opacity: 0.8 }} />
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.smoothScrollFile === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.smoothScrollFile === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.smoothScrollFile === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('smoothScrollFile', false)}
                                        title="Fast Instant Scroll"
                                    >
                                        <Zap size={15} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

                            <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, paddingLeft: '2px', color: '#64748b' }}>VISIBILITY</div>

                            {/* Merge Visibility Control */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Merge Actions</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.showMergeIcons === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.showMergeIcons === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.showMergeIcons === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('showMergeIcons', false)}
                                        title="Hide Merge Buttons"
                                    >
                                        <EyeOff size={15} />
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.showMergeIcons !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.showMergeIcons !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.showMergeIcons !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('showMergeIcons', true)}
                                        title="Show Merge Buttons"
                                    >
                                        <ArrowLeftRight size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Delete Visibility Control */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Delete Actions</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.showDeleteIcons === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.showDeleteIcons === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.showDeleteIcons === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('showDeleteIcons', false)}
                                        title="Hide Delete Icons"
                                    >
                                        <EyeOff size={15} />
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.showDeleteIcons !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.showDeleteIcons !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.showDeleteIcons !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('showDeleteIcons', true)}
                                        title="Show Delete Icons"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Hide Actions Visibility Control */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Hide Icons</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.showHideIcons === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.showHideIcons === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.showHideIcons === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('showHideIcons', false)}
                                        title="Hide individual 'Hide' Icons"
                                    >
                                        <EyeOff size={15} />
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.showHideIcons !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.showHideIcons !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.showHideIcons !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('showHideIcons', true)}
                                        title="Show individual 'Hide' Icons"
                                    >
                                        <EyeOff size={15} style={{ opacity: 0.8 }} />
                                    </button>
                                </div>
                            </div>

                            {/* Hidden Files Control */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Show Hidden</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.showHidden === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.showHidden === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.showHidden === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('showHidden', false)}
                                        title="Hide Hidden Files"
                                    >
                                        <EyeOff size={15} />
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.showHidden !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.showHidden !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.showHidden !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('showHidden', true)}
                                        title="Show Hidden Files"
                                    >
                                        <Eye size={15} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

                            <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, paddingLeft: '2px', color: '#64748b' }}>SAFETY</div>

                            {/* Confirm Merge Control */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Confirm Merge</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.confirmMerge === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.confirmMerge === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.confirmMerge === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('confirmMerge', false)}
                                        title="Disable Confirmation"
                                    >
                                        <span style={{ fontSize: '11px', fontWeight: 600 }}>OFF</span>
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.confirmMerge !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.confirmMerge !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.confirmMerge !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('confirmMerge', true)}
                                        title="Enable Confirmation"
                                    >
                                        <span style={{ fontSize: '11px', fontWeight: 600 }}>ON</span>
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Delete Control */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Confirm Delete</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.confirmDelete === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.confirmDelete === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.confirmDelete === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('confirmDelete', false)}
                                        title="Disable Confirmation"
                                    >
                                        <span style={{ fontSize: '11px', fontWeight: 600 }}>OFF</span>
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.confirmDelete !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.confirmDelete !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.confirmDelete !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('confirmDelete', true)}
                                        title="Enable Confirmation"
                                    >
                                        <span style={{ fontSize: '11px', fontWeight: 600 }}>ON</span>
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

                            <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, paddingLeft: '2px', color: '#64748b' }}>FILE VIEW</div>

                            {/* Line Numbers Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Line Numbers</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.showLineNumbers === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.showLineNumbers === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.showLineNumbers === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('showLineNumbers', false)}
                                        title="Hide Line Numbers"
                                    >
                                        <EyeOff size={15} />
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.showLineNumbers !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.showLineNumbers !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.showLineNumbers !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('showLineNumbers', true)}
                                        title="Show Line Numbers"
                                    >
                                        <Hash size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Word Wrap Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Word Wrap</span>
                                <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.wordWrap === false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.wordWrap === false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.wordWrap === false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('wordWrap', false)}
                                        title="Disable Word Wrap"
                                    >
                                        <EyeOff size={15} />
                                    </button>
                                    <button
                                        className={`toggle-option ${config?.viewOptions?.wordWrap !== false ? 'selected' : ''}`}
                                        style={{
                                            border: 'none',
                                            background: config?.viewOptions?.wordWrap !== false ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                            color: config?.viewOptions?.wordWrap !== false ? '#60a5fa' : 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            minWidth: '32px'
                                        }}
                                        onClick={() => setViewOption('wordWrap', true)}
                                        title="Enable Word Wrap"
                                    >
                                        <WrapText size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Advanced Filter Settings (Modal Overlay) */}
                <div className="relative">
                    <button
                        className={`icon-btn ${isFilterSettingsOpen ? 'active' : ''}`}
                        onClick={() => setIsFilterSettingsOpen(!isFilterSettingsOpen)}
                        title="Advanced Filter Settings"
                    >
                        <SlidersHorizontal size={16} />
                    </button>
                    {isFilterSettingsOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.6)',
                                    zIndex: 900,
                                    backdropFilter: 'blur(2px)'
                                }}
                                onClick={() => setIsFilterSettingsOpen(false)}
                            />

                            {/* Modal */}
                            <div className="dropdown-popup" style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '12px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
                                padding: '0',
                                zIndex: 901,
                                width: '600px',
                                maxWidth: '90vw',
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: '85vh'
                            }}>
                                {/* Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        Advanced Filter Settings
                                    </h3>
                                    <button
                                        onClick={() => setIsFilterSettingsOpen(false)}
                                        className="icon-btn"
                                        style={{ width: '24px', height: '24px' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

                                    <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>EXCLUDE FILTERS</div>

                                    {/* Exclude Folders */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Exclude Folders</span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    className="icon-btn tiny"
                                                    onClick={() => setManageFilterType('folders')}
                                                    title="Manage Folder Filters List"
                                                >
                                                    <ListChecks size={14} />
                                                </button>
                                                <button
                                                    className="icon-btn tiny"
                                                    onClick={() => onBrowse?.('import-exclude-folders')}
                                                    title="Browse for folders to exclude"
                                                >
                                                    <Folder size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            className="filter-input"
                                            placeholder="e.g. node_modules, .git"
                                            value={excludeFolders || ''}
                                            onChange={(e) => setExcludeFolders?.(e.target.value)}
                                            style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                color: 'var(--text-primary)',
                                                fontSize: '13px',
                                                width: '100%'
                                            }}
                                        />
                                    </div>

                                    {/* Exclude Files */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Exclude Files</span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    className="icon-btn tiny"
                                                    onClick={() => setManageFilterType('files')}
                                                    title="Manage File Filters List"
                                                >
                                                    <ListChecks size={14} />
                                                </button>
                                                <button
                                                    className="icon-btn tiny"
                                                    onClick={() => onBrowse?.('import-exclude-files')}
                                                    title="Browse for files to exclude"
                                                >
                                                    <FileText size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            className="filter-input"
                                            placeholder="e.g. *.log, .DS_Store"
                                            value={excludeFiles || ''}
                                            onChange={(e) => setExcludeFiles?.(e.target.value)}
                                            style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                color: 'var(--text-primary)',
                                                fontSize: '13px',
                                                width: '100%'
                                            }}
                                        />
                                    </div>

                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

                                    <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>HIDDEN ITEMS</div>

                                    {/* Show Hidden Toggle */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Show Hidden Items</span>
                                        <button
                                            className={`toggle-option ${showHidden ? 'selected' : ''}`}
                                            onClick={toggleShowHidden}
                                            style={{
                                                border: 'none',
                                                background: showHidden ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                                color: showHidden ? '#60a5fa' : 'var(--text-secondary)',
                                                borderRadius: '4px',
                                                padding: '4px 12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                transition: 'all 0.2s',
                                                fontWeight: 500
                                            }}
                                        >
                                            {showHidden ? <Eye size={14} style={{ marginRight: '6px' }} /> : <EyeOff size={14} style={{ marginRight: '6px' }} />}
                                            {showHidden ? 'Shown' : 'Hidden'}
                                        </button>
                                    </div>

                                    {/* Hidden Paths List */}
                                    {hiddenPaths && hiddenPaths.size > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                Manually Hidden ({hiddenPaths.size})
                                            </span>
                                            <div style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                color: 'var(--text-secondary)',
                                                fontSize: '12px',
                                                maxHeight: '150px',
                                                overflowY: 'auto',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px'
                                            }}>
                                                {Array.from(hiddenPaths).map(path => (
                                                    <div
                                                        key={path}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            cursor: 'pointer'
                                                        }}
                                                        className="hidden-path-item"
                                                        onClick={() => toggleHiddenPath?.(path)}
                                                        title={`Unhide ${path}`}
                                                    >
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                                                        <Eye size={12} style={{ opacity: 0.5 }} />
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                                                Click item to unhide, or use eye icon in tree.
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Tip */}
                                <div style={{
                                    padding: '12px 16px',
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '0 0 12px 12px',
                                    fontSize: '12px',
                                    color: '#64748b'
                                }}>
                                    Changes are applied automatically.
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <button
                    className={`icon-btn ${isLocked ? 'active' : ''}`}
                    onClick={() => setIsLocked?.(!isLocked)}
                    title={isLocked ? "Unlock View State" : "Lock View State (Fix Folders Closed/Open)"}
                >
                    {isLocked ? <Lock size={18} /> : <LockOpen size={18} />}
                </button>




                {/* Layout Mode Buttons */}
                <button
                    className={`icon-btn ${layoutMode === 'folder' ? 'active' : ''}`}
                    onClick={() => setLayoutMode?.('folder')}
                    title="Folder View Only"
                >
                    <PanelLeft size={16} />
                </button>
                <button
                    className={`icon-btn ${layoutMode === 'split' ? 'active' : ''}`}
                    onClick={() => setLayoutMode?.('split')}
                    title="Split View (Folder + File)"
                >
                    <Columns size={16} />
                </button>
                <button
                    className={`icon-btn ${layoutMode === 'file' ? 'active' : ''}`}
                    onClick={() => setLayoutMode?.('file')}
                    title="File View Only"
                >
                    <PanelRight size={16} />
                </button>



                <button
                    className="icon-btn"
                    onClick={isLocked ? undefined : (() => onAdjustWidth?.(5))}
                    title="Shrink File View (Widen Tree)"
                    style={{ opacity: isLocked ? 0.4 : 1, pointerEvents: isLocked ? 'none' : 'auto', display: layoutMode === 'split' ? 'flex' : 'none' }}
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    className="icon-btn"
                    onClick={isLocked ? undefined : (() => onAdjustWidth?.(-5))}
                    title="Expand File View (Shrink Tree)"
                    style={{ opacity: isLocked ? 0.4 : 1, pointerEvents: isLocked ? 'none' : 'auto', display: layoutMode === 'split' ? 'flex' : 'none' }}
                >
                    <ChevronLeft size={16} />
                </button>
            </div>
            <div className="separator"></div>
            <div className="filter-group">
                {/* Advanced Filter Settings (Modal Overlay) */}
                <div className="relative">
                    <button
                        className={`icon-btn ${isFilterSettingsOpen ? 'active' : ''}`}
                        onClick={() => setIsFilterSettingsOpen(!isFilterSettingsOpen)}
                        title="Advanced Filter Settings"
                    >
                        <SlidersHorizontal size={16} />
                    </button>
                    {isFilterSettingsOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.6)',
                                    zIndex: 900,
                                    backdropFilter: 'blur(2px)'
                                }}
                                onClick={() => setIsFilterSettingsOpen(false)}
                            />

                            {/* Modal */}
                            <div className="dropdown-popup" style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '12px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
                                padding: '0',
                                zIndex: 901,
                                width: '600px',
                                maxWidth: '90vw',
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: '85vh'
                            }}>
                                {/* Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        Advanced Filter Settings
                                    </h3>
                                    <button
                                        onClick={() => setIsFilterSettingsOpen(false)}
                                        className="icon-btn"
                                        style={{ width: '24px', height: '24px' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

                                    <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>EXCLUDE FILTERS</div>

                                    {/* Exclude Folders */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Exclude Folders</span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    className="icon-btn tiny"
                                                    onClick={() => setManageFilterType('folders')}
                                                    title="Manage Folder Filters List"
                                                >
                                                    <ListChecks size={14} />
                                                </button>
                                                <button
                                                    className="icon-btn tiny"
                                                    onClick={() => onBrowse?.('import-exclude-folders')}
                                                    title="Browse for folders to exclude"
                                                >
                                                    <Folder size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            className="filter-input"
                                            placeholder="e.g. node_modules, .git"
                                            value={excludeFolders || ''}
                                            onChange={(e) => setExcludeFolders?.(e.target.value)}
                                            style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                color: 'var(--text-primary)',
                                                fontSize: '13px',
                                                width: '100%'
                                            }}
                                        />
                                    </div>

                                    {/* Exclude Files */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Exclude Files</span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    className="icon-btn tiny"
                                                    onClick={() => setManageFilterType('files')}
                                                    title="Manage File Filters List"
                                                >
                                                    <ListChecks size={14} />
                                                </button>
                                                <button
                                                    className="icon-btn tiny"
                                                    onClick={() => onBrowse?.('import-exclude-files')}
                                                    title="Browse for files to exclude"
                                                >
                                                    <FileText size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            className="filter-input"
                                            placeholder="e.g. *.log, .DS_Store"
                                            value={excludeFiles || ''}
                                            onChange={(e) => setExcludeFiles?.(e.target.value)}
                                            style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                color: 'var(--text-primary)',
                                                fontSize: '13px',
                                                width: '100%'
                                            }}
                                        />
                                    </div>

                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>

                                    <div className="text-muted" style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>HIDDEN ITEMS</div>

                                    {/* Show Hidden Toggle */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Show Hidden Items</span>
                                        <button
                                            className={`toggle-option ${showHidden ? 'selected' : ''}`}
                                            onClick={toggleShowHidden}
                                            style={{
                                                border: 'none',
                                                background: showHidden ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                                color: showHidden ? '#60a5fa' : 'var(--text-secondary)',
                                                borderRadius: '4px',
                                                padding: '4px 12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                transition: 'all 0.2s',
                                                fontWeight: 500
                                            }}
                                        >
                                            {showHidden ? <Eye size={14} style={{ marginRight: '6px' }} /> : <EyeOff size={14} style={{ marginRight: '6px' }} />}
                                            {showHidden ? 'Shown' : 'Hidden'}
                                        </button>
                                    </div>

                                    {/* Hidden Paths List */}
                                    {hiddenPaths && hiddenPaths.size > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                Manually Hidden ({hiddenPaths.size})
                                            </span>
                                            <div style={{
                                                background: 'rgba(0,0,0,0.2)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                color: 'var(--text-secondary)',
                                                fontSize: '12px',
                                                maxHeight: '150px',
                                                overflowY: 'auto',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px'
                                            }}>
                                                {Array.from(hiddenPaths).map(path => (
                                                    <div
                                                        key={path}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            cursor: 'pointer'
                                                        }}
                                                        className="hidden-path-item"
                                                        onClick={() => toggleHiddenPath?.(path)}
                                                        title={`Unhide ${path}`}
                                                    >
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                                                        <Eye size={12} style={{ opacity: 0.5 }} />
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                                                Click item to unhide, or use eye icon in tree.
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Tip */}
                                <div style={{
                                    padding: '12px 16px',
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '0 0 12px 12px',
                                    fontSize: '12px',
                                    color: '#64748b'
                                }}>
                                    Changes are applied automatically.
                                </div>
                            </div>
                        </>
                    )}
                </div>

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

                {/* Unified Merge Mode Toggle */}
                <button
                    className={`icon-btn ${config?.viewOptions?.mergeMode === 'unit' ? '' : 'active'}`}
                    onClick={() => setViewOption('mergeMode', config?.viewOptions?.mergeMode === 'unit' ? 'group' : 'unit')}
                    title={`Global Merge Mode: ${config?.viewOptions?.mergeMode === 'unit' ? 'Unit (Line-by-Line)' : 'Group (Smart Blocks)'}. Press 'U' to toggle.`}
                    style={{ color: config?.viewOptions?.mergeMode === 'unit' ? 'white' : 'white', marginLeft: '8px' }}
                >
                    {config?.viewOptions?.mergeMode === 'unit' ? <Layers size={16} /> : <Box size={16} />}
                    <span style={{ fontSize: '9px', marginLeft: '1px', fontWeight: 900, opacity: 0.7 }}>M</span>
                </button>
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


            <ManageFiltersModal
                isOpen={!!manageFilterType}
                onClose={() => setManageFilterType(null)}
                type={manageFilterType || 'folders'}
                activeFiltersStr={manageFilterType === 'folders' ? (excludeFolders || '') : (excludeFiles || '')}
                disabledFilters={
                    manageFilterType === 'folders'
                        ? (config.disabledFilters?.folders || [])
                        : (config.disabledFilters?.files || [])
                }
                onSave={handleSaveFilters}
            />
        </div >
    );
}
