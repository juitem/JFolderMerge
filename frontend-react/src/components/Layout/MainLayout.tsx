import React from 'react';
import type { ReactNode } from 'react';
import { Save, Moon, Sun, ZoomIn, ZoomOut, RotateCcw, Globe, FolderOpen, FileText } from 'lucide-react';
import { FilterToolbar } from '../FilterToolbar';
import { useConfig } from '../../contexts/ConfigContext';
import { PathControls } from '../PathControls';
import type { DiffMode } from '../../types';

interface MainLayoutProps {
    children: ReactNode;
    // Header Props
    onSaveSettings: () => void;
    onResetSettings?: () => void;
    onOpenAbout: () => void;
    // Toolbar Props
    searchQuery: string;
    setSearchQuery: (s: string) => void;
    excludeFolders: string;
    setExcludeFolders: (s: string) => void;
    excludeFiles: string;
    setExcludeFiles: (s: string) => void;
    onBrowse: (target: 'left' | 'right' | 'import-exclude-folders' | 'import-exclude-files') => void;
    onCompare: () => void;
    compareLoading: boolean;
    diffMode: DiffMode;
    setDiffMode: (mode: DiffMode) => void;
    // Path Props
    leftPath: string;
    setLeftPath: (p: string) => void;
    rightPath: string;
    setRightPath: (p: string) => void;
    onHistory: (side: 'left' | 'right') => void;
    onSwap: () => void;
    // Error Display
    error?: string | null;
    // Current File
    // Current File
    selectedFilePath?: string | null;
    // Layout Actions
    onToggleFileView?: () => void;
    onAdjustWidth?: (delta: number) => void;

    // Stats
    globalStats?: { added: number, removed: number, modified: number };
    currentFolderStats?: { added: number, removed: number, modified: number } | null;
    fileLineStats?: { added: number, removed: number, groups: number } | null;
}

export const MainLayout: React.FC<MainLayoutProps> = (props) => {
    const { config, setViewOption, zoomLevel, setZoomLevel } = useConfig();
    const isDark = config?.viewOptions?.darkMode !== false; // Default to dark

    React.useEffect(() => {
        if (isDark) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
    }, [isDark]);

    return (
        <div className="app-container">
            {/* Header */}
            <header className="app-header">
                <div className="header-brand" onClick={props.onOpenAbout} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 style={{ fontStyle: 'normal', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <i style={{ fontSize: '24px' }}>J's Visual Folder Merge</i>

                    </h1>
                </div>
                <div className="header-actions">
                    {/* Global Stats */}
                    {props.globalStats && (
                        <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, opacity: 0.9, marginRight: '16px' }}>
                            <Globe size={16} />
                            <span style={{ color: '#ef4444' }}>-{props.globalStats.removed}</span>
                            <span style={{ color: '#f59e0b' }}>!{props.globalStats.modified}</span>
                            <span style={{ color: '#10b981' }}>+{props.globalStats.added}</span>
                        </span>
                    )}

                    {/* Current Folder Stats */}
                    {props.currentFolderStats && (
                        <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8, marginRight: '20px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '16px' }}>
                            <FolderOpen size={16} />
                            <span style={{ color: '#ef4444' }}>-{props.currentFolderStats.removed}</span>
                            <span style={{ color: '#f59e0b' }}>!{props.currentFolderStats.modified}</span>
                            <span style={{ color: '#10b981' }}>+{props.currentFolderStats.added}</span>
                        </span>
                    )}

                    {/* File Line Stats (New Location) */}
                    {props.fileLineStats && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '20px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '16px' }}>
                            <FileText size={16} style={{ color: 'var(--text-secondary)', opacity: 0.8 }} />
                            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                                {/* Group Count (Main) */}
                                <span style={{ fontSize: '14px', fontWeight: 800, fontStyle: 'italic', color: '#f59e0b', textShadow: 'none' }}>
                                    {props.fileLineStats.groups}
                                </span>
                                {/* Line Counts (Inline) */}
                                <span style={{ fontSize: '11px', display: 'flex', gap: '3px', fontWeight: 600, color: 'var(--text-secondary)', opacity: 0.8 }}>
                                    (
                                    <span style={{ color: '#10b981' }}>+{props.fileLineStats.added}</span>
                                    <span style={{ color: '#ef4444' }}>-{props.fileLineStats.removed}</span>
                                    )
                                </span>
                            </div>
                        </span>
                    )}

                    {/* File Name Display */}
                    {props.selectedFilePath && (
                        <div style={{
                            display: 'block',
                            textAlign: 'right',
                            marginRight: '24px',
                            fontFamily: 'monospace',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                            maxWidth: '600px',
                            lineHeight: '1.2',
                            wordBreak: 'break-all'
                        }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-primary)', opacity: 0.7, fontWeight: 500 }}>
                                {props.selectedFilePath.substring(0, props.selectedFilePath.lastIndexOf('/') + 1)}
                            </span>
                            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-color)', fontStyle: 'italic' }}>
                                {props.selectedFilePath.substring(props.selectedFilePath.lastIndexOf('/') + 1)}
                            </span>
                        </div>
                    )}
                    <button className="icon-btn" title={`Zoom In (${Math.round(zoomLevel * 100)}%)`} onClick={() => setZoomLevel((z) => Math.min(z + 0.1, 2.0))}>
                        <ZoomIn size={18} />
                    </button>
                    <button className="icon-btn" title={`Zoom Out (${Math.round(zoomLevel * 100)}%)`} onClick={() => setZoomLevel((z) => Math.max(z - 0.1, 0.5))}>
                        <ZoomOut size={18} />
                    </button>

                    <button className="icon-btn" title="Reset Settings" onClick={props.onResetSettings}>
                        <RotateCcw size={18} />
                    </button>
                    <button className="icon-btn" title="Save Settings" onClick={props.onSaveSettings}>
                        <Save size={18} />
                    </button>
                    <button className="icon-btn" title="Toggle Theme" onClick={() => setViewOption('darkMode', !isDark)}>
                        {isDark ? <Sun size={18} /> : <Moon size={18} style={{ transform: 'scaleX(-1)' }} />}
                    </button>
                </div>
            </header>

            {/* FilterToolbar */}
            <FilterToolbar
                onCompare={props.onCompare}
                loading={props.compareLoading}
                diffMode={props.diffMode}
                setDiffMode={props.setDiffMode}
                onToggleFileView={props.onToggleFileView}
                onAdjustWidth={props.onAdjustWidth}
            />

            {/* Path Controls */}
            <PathControls
                leftPath={props.leftPath}
                setLeftPath={props.setLeftPath}
                rightPath={props.rightPath}
                setRightPath={props.setRightPath}
                onHistory={props.onHistory}
                onBrowse={(side) => props.onBrowse(side)}
                onSwap={props.onSwap}
            />

            {props.error && <div className="error-banner" style={{ margin: '0 20px 10px' }}>{props.error}</div>}

            {props.children}
        </div>
    );
};
