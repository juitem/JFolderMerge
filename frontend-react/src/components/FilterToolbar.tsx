import React from 'react';
import { Folder, FileText, Play, BookOpen, ListTree, AlignJustify, PanelRight, PanelLeft, Columns, ChevronLeft, ChevronRight, Lock, LockOpen, Maximize, Minimize, Settings, Layers, Box, SlidersHorizontal, X, ListChecks, Eye, EyeOff, ShieldCheck, ShieldAlert, Trash2, Hash, WrapText, MousePointer2, Shield, CheckSquare, Type, Tag } from 'lucide-react';
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
    showHidden?: boolean;
    toggleShowHidden?: () => void;
}

const SettingsFolderIcon = ({ size = 16 }: { size?: number }) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Folder size={size} />
        <div style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            background: '#1e293b',
            borderRadius: '50%',
            padding: '1px',
            display: 'flex',
            border: '1px solid #334155'
        }}>
            <Settings size={size * 0.55} />
        </div>
    </div>
);

const SettingsFileIcon = ({ size = 16 }: { size?: number }) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FileText size={size} />
        <div style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            background: '#1e293b',
            borderRadius: '50%',
            padding: '1px',
            display: 'flex',
            border: '1px solid #334155'
        }}>
            <Settings size={size * 0.55} />
        </div>
    </div>
);

const SettingsAdvancedIcon = ({ size = 16 }: { size?: number }) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SlidersHorizontal size={size} />
        <div style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            background: '#1e293b',
            borderRadius: '50%',
            padding: '1px',
            display: 'flex',
            border: '1px solid #334155'
        }}>
            <Settings size={size * 0.55} />
        </div>
    </div>
);

export function FilterToolbar({
    onCompare,
    loading,
    onAdjustWidth,
    isLocked,
    setIsLocked,
    layoutMode,
    setLayoutMode,
    excludeFolders,
    setExcludeFolders,
    excludeFiles,
    setExcludeFiles,
    onBrowse,
    showHidden,
    toggleShowHidden
}: FilterToolbarProps) {
    const { config, toggleFilter, toggleDiffFilter, setViewOption, saveConfig } = useConfig();
    const folderViewMode = config?.viewOptions?.folderViewMode || 'split';

    const [isFullScreen, setIsFullScreen] = React.useState(!!document.fullscreenElement);

    const [isFileMenuOpen, setIsFileMenuOpen] = React.useState(false);
    const fileMenuRef = React.useRef<HTMLDivElement>(null);

    const [isFolderMenuOpen, setIsFolderMenuOpen] = React.useState(false);
    const folderMenuRef = React.useRef<HTMLDivElement>(null);

    const [isAppMenuOpen, setIsAppMenuOpen] = React.useState(false);
    const appMenuRef = React.useRef<HTMLDivElement>(null);

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
        });
    };

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
                setIsFileMenuOpen(false);
            }
            if (folderMenuRef.current && !folderMenuRef.current.contains(event.target as Node)) {
                setIsFolderMenuOpen(false);
            }
            if (appMenuRef.current && !appMenuRef.current.contains(event.target as Node)) {
                setIsAppMenuOpen(false);
            }
        };

        if (isFileMenuOpen || isFolderMenuOpen || isAppMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFileMenuOpen, isFolderMenuOpen, isAppMenuOpen]);

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
            {/* LEFT SECTION: Global App Settings */}
            <div className="filter-group" style={{ gap: '2px' }}>
                <div className="relative" style={{ position: 'relative' }} ref={appMenuRef}>
                    <button
                        className={`icon-btn ${isAppMenuOpen ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setIsAppMenuOpen(!isAppMenuOpen); }}
                        title="App Settings (Global)"
                    >
                        <Settings size={18} />
                    </button>
                    {isAppMenuOpen && (
                        <div className="dropdown-menu" style={{
                            position: 'absolute', top: '100%', left: '0', marginTop: '8px',
                            background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.8)', zIndex: 2000, minWidth: '220px'
                        }}>
                            <div className="menu-header" style={{ padding: '8px 12px', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>App Settings</span>
                            </div>
                            <div className="menu-body" style={{ padding: '8px' }}>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>TREE LAYOUT</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={folderViewMode === 'split' ? 'active' : ''} onClick={() => setViewOption('folderViewMode', 'split')}><BookOpen size={12} /><span>Split</span></button>
                                        <button className={folderViewMode === 'unified' ? 'active' : ''} onClick={() => setViewOption('folderViewMode', 'unified')}><ListTree size={12} /><span>Unified</span></button>
                                        <button className={folderViewMode === 'flat' ? 'active' : ''} onClick={() => setViewOption('folderViewMode', 'flat')}><AlignJustify size={12} style={{ transform: 'rotate(90deg)' }} /><span>Flat</span></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>PANEL LAYOUT</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={layoutMode === 'folder' ? 'active' : ''} onClick={() => setLayoutMode?.('folder')}><PanelLeft size={12} /><span>Folder</span></button>
                                        <button className={layoutMode === 'split' ? 'active' : ''} onClick={() => setLayoutMode?.('split')}><Columns size={12} /><span>Split</span></button>
                                        <button className={layoutMode === 'file' ? 'active' : ''} onClick={() => setLayoutMode?.('file')}><PanelRight size={12} /><span>Content</span></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>LOCK TREE STATE</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={!isLocked ? 'active' : ''} onClick={() => setIsLocked?.(false)}><LockOpen size={12} /><span>Unlock</span></button>
                                        <button className={isLocked ? 'active' : ''} onClick={() => setIsLocked?.(true)}><Lock size={12} /><span>Lock</span></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>FULL SCREEN</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={!isFullScreen ? 'active' : ''} onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); }}><Maximize size={12} /><span>Window</span></button>
                                        <button className={isFullScreen ? 'active' : ''} onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); }}><Minimize size={12} /><span>Full</span></button>
                                    </div>
                                </div>
                                <div className="menu-divider" style={{ height: '1px', background: '#334155', margin: '4px -8px 8px -8px' }}></div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>AUTO SCROLL</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={config?.viewOptions?.autoScroll === false ? 'active' : ''} onClick={() => setViewOption('autoScroll', false)}><MousePointer2 size={12} style={{ opacity: 0.5 }} /><span>Off</span></button>
                                        <button className={config?.viewOptions?.autoScroll !== false ? 'active' : ''} onClick={() => setViewOption('autoScroll', true)}><MousePointer2 size={12} /><span>On</span></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>CONFIRM MERGE</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={config?.viewOptions?.confirmMerge === false ? 'active' : ''} onClick={() => setViewOption('confirmMerge', false)}><Shield size={12} style={{ opacity: 0.5 }} /><span>Off</span></button>
                                        <button className={config?.viewOptions?.confirmMerge !== false ? 'active' : ''} onClick={() => setViewOption('confirmMerge', true)}><ShieldCheck size={12} /><span>On</span></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>CONFIRM DELETE</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={config?.viewOptions?.confirmDelete === false ? 'active' : ''} onClick={() => setViewOption('confirmDelete', false)}><Shield size={12} style={{ opacity: 0.5 }} /><span>Off</span></button>
                                        <button className={config?.viewOptions?.confirmDelete !== false ? 'active' : ''} onClick={() => setViewOption('confirmDelete', true)}><ShieldAlert size={12} /><span>On</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button className={`icon-btn ${isFullScreen ? 'active' : ''}`} onClick={toggleFullScreen} title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}>
                    {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>

                <div className="separator"></div>

                <button
                    className={`icon-btn ${isLocked ? 'active' : ''}`}
                    onClick={() => setIsLocked?.(!isLocked)}
                    title={isLocked ? "Unlock Folder Tree Width" : "Lock Folder Tree Width"}
                >
                    {isLocked ? <Lock size={16} /> : <LockOpen size={16} />}
                </button>

                <div className="segmented-control">
                    <button className={`icon-btn ${folderViewMode === 'split' ? 'active' : ''}`} onClick={() => setViewOption('folderViewMode', 'split')} title="Split Tree View"><BookOpen size={16} /></button>
                    <button className={`icon-btn ${folderViewMode === 'unified' ? 'active' : ''}`} onClick={() => setViewOption('folderViewMode', 'unified')} title="Unified Tree View"><ListTree size={16} /></button>
                    <button className={`icon-btn ${folderViewMode === 'flat' ? 'active' : ''}`} onClick={() => setViewOption('folderViewMode', 'flat')} title="Flat List View"><AlignJustify size={16} style={{ transform: 'rotate(90deg)' }} /></button>
                </div>

                <div style={{ display: 'flex', gap: '2px' }}>
                    <button className="icon-btn xs" onClick={() => onAdjustWidth?.(-20)} title="Narrower Tree"><ChevronLeft size={14} /></button>
                    <button className="icon-btn xs" onClick={() => onAdjustWidth?.(20)} title="Wider Tree"><ChevronRight size={14} /></button>
                </div>

                <div className="segmented-control">
                    <button className={`icon-btn ${layoutMode === 'folder' ? 'active' : ''}`} onClick={() => setLayoutMode?.('folder')} title="Folder Only Container"><PanelLeft size={16} /></button>
                    <button className={`icon-btn ${layoutMode === 'split' ? 'active' : ''}`} onClick={() => setLayoutMode?.('split')} title="Split Layout (Folder + Content)"><Columns size={16} /></button>
                    <button className={`icon-btn ${layoutMode === 'file' ? 'active' : ''}`} onClick={() => setLayoutMode?.('file')} title="Content Only Container"><PanelRight size={16} /></button>
                </div>
            </div>

            <div className="separator"></div>

            {/* MIDDLE SECTION: Folder Group */}
            <div className="filter-group">
                {/* Standalone Advanced Filter Icon - Left of Folder Options */}
                <button
                    className={`icon-btn xs ${isFilterSettingsOpen ? 'active' : ''}`}
                    onClick={() => setIsFilterSettingsOpen(!isFilterSettingsOpen)}
                    title="Advanced Filters"
                    style={{ padding: '2px', marginRight: '4px' }}
                >
                    <SettingsAdvancedIcon size={16} />
                </button>

                <div className="relative" style={{ position: 'relative' }} ref={folderMenuRef}>
                    <button
                        className={`icon-btn xs ${isFolderMenuOpen ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setIsFolderMenuOpen(!isFolderMenuOpen); }}
                        title="Folder View Options"
                        style={{ padding: '2px', marginRight: '6px' }}
                    >
                        <SettingsFolderIcon size={16} />
                    </button>
                    {isFolderMenuOpen && (
                        <div className="dropdown-menu" style={{
                            position: 'absolute', top: '100%', left: '0', marginTop: '8px',
                            background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.8)', zIndex: 2000, minWidth: '220px'
                        }}>
                            <div className="menu-header" style={{ padding: '8px 12px', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Folder Options</span>
                            </div>
                            <div className="menu-body" style={{ padding: '8px' }}>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>SELECT BOXES</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={config?.viewOptions?.showSelectionCheckboxes === false ? 'active' : ''} onClick={() => setViewOption('showSelectionCheckboxes', false)} title="Hide Boxes"><EyeOff size={14} /></button>
                                        <button className={config?.viewOptions?.showSelectionCheckboxes === undefined || config?.viewOptions?.showSelectionCheckboxes === 'smart' ? 'active' : ''} onClick={() => setViewOption('showSelectionCheckboxes', 'smart')} title="Smart View"><MousePointer2 size={13} /></button>
                                        <button className={config?.viewOptions?.showSelectionCheckboxes === true ? 'active' : ''} onClick={() => setViewOption('showSelectionCheckboxes', true)} title="Always Show"><CheckSquare size={13} /></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>STATUS DISPLAY</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={(config?.viewOptions?.statusDisplayMode ?? 2) === 0 ? 'active' : ''} onClick={() => setViewOption('statusDisplayMode', 0)} title="Tag Only"><Tag size={12} /><span>TAG</span></button>
                                        <button className={(config?.viewOptions?.statusDisplayMode ?? 2) === 1 ? 'active' : ''} onClick={() => setViewOption('statusDisplayMode', 1)} title="Text Only"><Type size={12} /><span>TEXT</span></button>
                                        <button className={(config?.viewOptions?.statusDisplayMode ?? 2) === 2 ? 'active' : ''} onClick={() => setViewOption('statusDisplayMode', 2)} title="Both Tag & Text"><Layers size={12} /><span>BOTH</span></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>MERGE ICONS</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={config?.viewOptions?.showMergeIcons === false ? 'active' : ''} onClick={() => setViewOption('showMergeIcons', false)}><Layers size={12} style={{ opacity: 0.3 }} /><span>Hide</span></button>
                                        <button className={config?.viewOptions?.showMergeIcons !== false ? 'active' : ''} onClick={() => setViewOption('showMergeIcons', true)}><Layers size={12} /><span>Show</span></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>DELETE ICONS</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={config?.viewOptions?.showDeleteIcons === false ? 'active' : ''} onClick={() => setViewOption('showDeleteIcons', false)}><Trash2 size={12} style={{ opacity: 0.3 }} /><span>Hide</span></button>
                                        <button className={config?.viewOptions?.showDeleteIcons !== false ? 'active' : ''} onClick={() => setViewOption('showDeleteIcons', true)}><Trash2 size={12} /><span>Show</span></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>HIDE ICONS</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={config?.viewOptions?.showHideIcons === false ? 'active' : ''} onClick={() => setViewOption('showHideIcons', false)}><EyeOff size={12} style={{ opacity: 0.3 }} /><span>Hide</span></button>
                                        <button className={config?.viewOptions?.showHideIcons !== false ? 'active' : ''} onClick={() => setViewOption('showHideIcons', true)}><EyeOff size={12} /><span>Show</span></button>
                                    </div>
                                </div>
                                <div className="menu-divider" style={{ height: '1px', background: '#334155', margin: '4px -8px 8px -8px' }}></div>
                                <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>VISIBLE STATUS</div>
                                <div className="menu-filter-row">
                                    <div className={`menu-filter-item ${config.folderFilters?.modified ?? true ? 'active' : ''}`} onClick={() => toggleFilter('modified')} title="Modified">
                                        <div className="menu-filter-dot modified">!</div>
                                        <span className="menu-filter-label">Modified</span>
                                    </div>
                                    <div className={`menu-filter-item ${config.folderFilters?.added ?? true ? 'active' : ''}`} onClick={() => toggleFilter('added')} title="Added">
                                        <div className="menu-filter-dot added">+</div>
                                        <span className="menu-filter-label">Added</span>
                                    </div>
                                    <div className={`menu-filter-item ${config.folderFilters?.removed ?? true ? 'active' : ''}`} onClick={() => toggleFilter('removed')} title="Removed">
                                        <div className="menu-filter-dot removed">-</div>
                                        <span className="menu-filter-label">Removed</span>
                                    </div>
                                    <div className={`menu-filter-item ${config.folderFilters?.same ?? true ? 'active' : ''}`} onClick={() => toggleFilter('same')} title="Same">
                                        <div className="menu-filter-dot same">=</div>
                                        <span className="menu-filter-label">Same</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* Main Toolbar Folder Filters (Kept as requested) */}
                <label className="checkbox-container" title="Show Modified"><input type="checkbox" checked={config.folderFilters?.modified ?? true} onChange={() => toggleFilter('modified')} /><span className="checkmark modified"></span></label>
                <label className="checkbox-container" title="Show Added"><input type="checkbox" checked={config.folderFilters?.added ?? true} onChange={() => toggleFilter('added')} /><span className="checkmark added"></span></label>
                <label className="checkbox-container" title="Show Removed"><input type="checkbox" checked={config.folderFilters?.removed ?? true} onChange={() => toggleFilter('removed')} /><span className="checkmark removed"></span></label>
                <label className="checkbox-container" title="Show Same"><input type="checkbox" checked={config.folderFilters?.same ?? true} onChange={() => toggleFilter('same')} /><span className="checkmark same"></span></label>
            </div>

            <div className="separator"></div>

            {/* MIDDLE SECTION: File Group */}
            <div className="filter-group">
                <div className="relative" style={{ position: 'relative' }} ref={fileMenuRef}>
                    <button
                        className={`icon-btn xs ${isFileMenuOpen ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setIsFileMenuOpen(!isFileMenuOpen); }}
                        title="File View Options"
                        style={{ padding: '2px', marginRight: '6px' }}
                    >
                        <SettingsFileIcon size={16} />
                    </button>
                    {isFileMenuOpen && (
                        <div className="dropdown-menu" style={{
                            position: 'absolute', top: '100%', left: '0', marginTop: '8px',
                            background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.8)', zIndex: 2000, minWidth: '220px'
                        }}>
                            <div className="menu-header" style={{ padding: '8px 12px', borderBottom: '1px solid #334155', background: '#0f172a' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>File Options</span>
                            </div>
                            <div className="menu-body" style={{ padding: '8px' }}>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>LINE NUMBERS</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={config?.viewOptions?.showLineNumbers === false ? 'active' : ''} onClick={() => setViewOption('showLineNumbers', false)}><Hash size={12} style={{ opacity: 0.3 }} /><span>Off</span></button>
                                        <button className={config?.viewOptions?.showLineNumbers !== false ? 'active' : ''} onClick={() => setViewOption('showLineNumbers', true)}><Hash size={12} /><span>On</span></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>WORD WRAP</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={config?.viewOptions?.wordWrap === false ? 'active' : ''} onClick={() => setViewOption('wordWrap', false)}><WrapText size={12} style={{ opacity: 0.3 }} /><span>Off</span></button>
                                        <button className={config?.viewOptions?.wordWrap !== false ? 'active' : ''} onClick={() => setViewOption('wordWrap', true)}><WrapText size={12} /><span>On</span></button>
                                    </div>
                                </div>
                                <div className="menu-divider" style={{ height: '1px', background: '#334155', margin: '4px -8px 8px -8px' }}></div>
                                <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>MERGE MODE</div>
                                    <div className="menu-segmented-control" style={{ width: '100%' }}>
                                        <button className={config?.viewOptions?.mergeMode === 'unit' ? 'active' : ''} onClick={() => setViewOption('mergeMode', 'unit')}><Layers size={12} /><span>Unit</span></button>
                                        <button className={config?.viewOptions?.mergeMode === 'group' ? 'active' : ''} onClick={() => setViewOption('mergeMode', 'group')}><Box size={12} /><span>Group</span></button>
                                    </div>
                                </div>
                                <div className="menu-divider" style={{ height: '1px', background: '#334155', margin: '4px -8px 8px -8px' }}></div>
                                <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '4px', letterSpacing: '0.05em' }}>LINE STATUS</div>
                                <div className="menu-filter-row">
                                    <div className={`menu-filter-item ${config.diffFilters?.modified ?? true ? 'active' : ''}`} onClick={() => toggleDiffFilter('modified')} title="Modified Lines">
                                        <div className="menu-filter-dot modified">!</div>
                                        <span className="menu-filter-label">Modified</span>
                                    </div>
                                    <div className={`menu-filter-item ${config.diffFilters?.added ?? true ? 'active' : ''}`} onClick={() => toggleDiffFilter('added')} title="Added Lines">
                                        <div className="menu-filter-dot added">+</div>
                                        <span className="menu-filter-label">Added</span>
                                    </div>
                                    <div className={`menu-filter-item ${config.diffFilters?.removed ?? true ? 'active' : ''}`} onClick={() => toggleDiffFilter('removed')} title="Removed Lines">
                                        <div className="menu-filter-dot removed">-</div>
                                        <span className="menu-filter-label">Removed</span>
                                    </div>
                                    <div className={`menu-filter-item ${config.diffFilters?.same ?? false ? 'active' : ''}`} onClick={() => toggleDiffFilter('same')} title="Same Lines">
                                        <div className="menu-filter-dot same">=</div>
                                        <span className="menu-filter-label">Same</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>


                {/* Main Toolbar File Filters (Kept as requested) */}
                <label className="checkbox-container" title="Show Modified Lines"><input type="checkbox" checked={config.diffFilters?.modified ?? true} onChange={() => toggleDiffFilter('modified')} /><span className="checkmark modified"></span></label>
                <label className="checkbox-container" title="Show Added Lines"><input type="checkbox" checked={config.diffFilters?.added ?? true} onChange={() => toggleDiffFilter('added')} /><span className="checkmark added"></span></label>
                <label className="checkbox-container" title="Show Removed Lines"><input type="checkbox" checked={config.diffFilters?.removed ?? true} onChange={() => toggleDiffFilter('removed')} /><span className="checkmark removed"></span></label>
                <label className="checkbox-container" title="Show Same Lines"><input type="checkbox" checked={config.diffFilters?.same ?? false} onChange={() => toggleDiffFilter('same')} /><span className="checkmark same"></span></label>

                <button
                    className={`icon-btn ${config?.viewOptions?.mergeMode === 'unit' ? '' : 'active'}`}
                    onClick={() => setViewOption('mergeMode', config?.viewOptions?.mergeMode === 'unit' ? 'group' : 'unit')}
                    title={`Global Merge Mode: ${config?.viewOptions?.mergeMode === 'unit' ? 'Unit' : 'Group'}`}
                    style={{ marginLeft: '8px' }}
                >
                    {config?.viewOptions?.mergeMode === 'unit' ? <Layers size={16} /> : <Box size={16} />}
                </button>
            </div>

            {/* RIGHT SECTION: Actions */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid #444', paddingRight: '10px', marginRight: '6px' }}>
                    <button
                        className={`icon-btn ${config?.viewOptions?.confirmMerge !== false ? 'active' : ''}`}
                        onClick={() => setViewOption('confirmMerge', config?.viewOptions?.confirmMerge === false)}
                        title="Confirm Merge"
                    >
                        <ShieldCheck size={18} />
                    </button>
                    <button
                        className={`icon-btn ${config?.viewOptions?.confirmDelete !== false ? 'active' : ''}`}
                        onClick={() => setViewOption('confirmDelete', config?.viewOptions?.confirmDelete === false)}
                        title="Confirm Delete"
                    >
                        <ShieldAlert size={18} />
                    </button>
                </div>
                <button className="primary-btn compare-btn" onClick={onCompare} disabled={loading} style={{ fontSize: '14px' }}>
                    <Play size={16} style={{ marginRight: '6px' }} />
                    {loading ? 'Running...' : 'Compare'}
                </button>
            </div>

            {/* Advanced Filters Modal Overlay */}
            {isFilterSettingsOpen && (
                <>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900, backdropFilter: 'blur(2px)' }} onClick={() => setIsFilterSettingsOpen(false)} />
                    <div className="dropdown-popup" style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: '#0f172a', border: '1px solid #334155', borderRadius: '12px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)', padding: '0', zIndex: 901,
                        width: '600px', maxWidth: '90vw', display: 'flex', flexDirection: 'column', maxHeight: '85vh'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Advanced Filter Settings</h3>
                            <button onClick={() => setIsFilterSettingsOpen(false)} className="icon-btn"><X size={16} /></button>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px' }}>Exclude Folders</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button className="icon-btn tiny" onClick={() => setManageFilterType('folders')}><ListChecks size={14} /></button>
                                        <button className="icon-btn tiny" onClick={() => onBrowse?.('import-exclude-folders')}><Folder size={12} /></button>
                                    </div>
                                </div>
                                <input type="text" className="filter-input" value={excludeFolders || ''} onChange={(e) => setExcludeFolders?.(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px' }}>Exclude Files</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button className="icon-btn tiny" onClick={() => setManageFilterType('files')}><ListChecks size={14} /></button>
                                        <button className="icon-btn tiny" onClick={() => onBrowse?.('import-exclude-files')}><FileText size={12} /></button>
                                    </div>
                                </div>
                                <input type="text" className="filter-input" value={excludeFiles || ''} onChange={(e) => setExcludeFiles?.(e.target.value)} />
                            </div>
                            <div className="menu-divider" style={{ height: '1px', background: '#334155', margin: '8px 0' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px' }}>Show Hidden Items</span>
                                <button className={`toggle-option ${showHidden ? 'selected' : ''}`} onClick={toggleShowHidden}>
                                    {showHidden ? <Eye size={14} style={{ marginRight: '6px' }} /> : <EyeOff size={14} style={{ marginRight: '6px' }} />}
                                    {showHidden ? 'Shown' : 'Hidden'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <ManageFiltersModal
                isOpen={!!manageFilterType}
                onClose={() => setManageFilterType(null)}
                type={manageFilterType || 'folders'}
                activeFiltersStr={manageFilterType === 'folders' ? (excludeFolders || '') : (excludeFiles || '')}
                disabledFilters={manageFilterType === 'folders' ? (config.disabledFilters?.folders || []) : (config.disabledFilters?.files || [])}
                onSave={handleSaveFilters}
            />
        </div>
    );
}
