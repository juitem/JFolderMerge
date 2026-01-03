import React from 'react';
import { Folder, FileText, Play, BookOpen, ListTree, AlignJustify, PanelRight, PanelLeft, Columns, ChevronLeft, ChevronRight, Lock, LockOpen, Maximize, Minimize, ShieldCheck, ShieldAlert, Focus, Tag, LayoutList, ArrowLeftRight, Trash2, Settings2, EyeOff, Zap, MousePointer2, BoxSelect } from 'lucide-react';
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
}

export function FilterToolbar({
    onCompare, loading,
    // onToggleFileView, // Unused
    onAdjustWidth,
    isLocked,
    setIsLocked,
    // fileLineStats, // Unused
    layoutMode,
    setLayoutMode
}: FilterToolbarProps) {
    const { config, toggleFilter, toggleDiffFilter, setViewOption } = useConfig();
    const folderViewMode = config?.viewOptions?.folderViewMode || 'split';

    const [isFullScreen, setIsFullScreen] = React.useState(!!document.fullscreenElement);
    const [isViewMenuOpen, setIsViewMenuOpen] = React.useState(false);
    const viewMenuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
                setIsViewMenuOpen(false);
            }
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

                {/* Zap Buttons */}
                <button
                    className={`icon-btn ${config?.viewOptions?.smoothScrollFolder === false ? 'active' : ''}`}
                    onClick={() => setViewOption('smoothScrollFolder', config?.viewOptions?.smoothScrollFolder === false)}
                    title={config?.viewOptions?.smoothScrollFolder === false ? "Folder View: Instant Jump Enabled" : "Folder View: Enable Instant Jump"}
                >
                    <Zap size={16} />
                    <span style={{ fontSize: '10px', marginLeft: '2px', fontWeight: 700 }}>F</span>
                </button>
                <button
                    className={`icon-btn ${config?.viewOptions?.smoothScrollFile === false ? 'active' : ''}`}
                    onClick={() => setViewOption('smoothScrollFile', config?.viewOptions?.smoothScrollFile === false)}
                    title={config?.viewOptions?.smoothScrollFile === false ? "File View: Instant Jump Enabled" : "File View: Enable Instant Jump"}
                >
                    <Zap size={16} />
                    <span style={{ fontSize: '10px', marginLeft: '2px', fontWeight: 700 }}>T</span>
                </button>

                <div style={{ width: '1px', height: '16px', background: '#ccc', margin: '0 4px', flexShrink: 0 }}></div>

                {/* Agent Merge Mode Toggle */}
                <button
                    className={`icon-btn ${config?.viewOptions?.agentMergeMode === 'replace' ? 'active' : ''}`}
                    onClick={() => setViewOption('agentMergeMode', config?.viewOptions?.agentMergeMode === 'replace' ? 'unit' : 'replace')}
                    title={config?.viewOptions?.agentMergeMode === 'replace' ? 'Agent: Smart Replace (Double Action)' : 'Agent: Unit Merge (Single Action)'}
                >
                    {config?.viewOptions?.agentMergeMode === 'replace' ? <BoxSelect size={16} /> : <MousePointer2 size={16} />}
                    <span style={{ fontSize: '9px', marginLeft: '1px', fontWeight: 900, opacity: 0.7 }}>A</span>
                </button>

                {/* SBS Nav Mode Toggle */}
                <button
                    className={`icon-btn ${config?.viewOptions?.sbsNavMode === 'block' ? 'active' : ''}`}
                    onClick={() => setViewOption('sbsNavMode', config?.viewOptions?.sbsNavMode === 'block' ? 'line' : 'block')}
                    title={config?.viewOptions?.sbsNavMode === 'block' ? 'SBS Navigation: Block-to-Block' : 'SBS Navigation: Line-by-Line'}
                >
                    {config?.viewOptions?.sbsNavMode === 'block' ? <LayoutList size={16} /> : <AlignJustify size={16} />}
                    <span style={{ fontSize: '9px', marginLeft: '1px', fontWeight: 900, opacity: 0.7 }}>S</span>
                </button>

                <div style={{ width: '1px', height: '16px', background: '#ccc', margin: '0 4px', flexShrink: 0 }}></div>

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
                                        title="Hide Delete Buttons"
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
                                        title="Show Delete Buttons"
                                    >
                                        <Trash2 size={15} />
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
                        </div>
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
        </div >
    );
}
