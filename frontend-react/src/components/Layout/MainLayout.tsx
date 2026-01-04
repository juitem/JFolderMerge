import React from 'react';
import type { ReactNode } from 'react';
import { Save, Moon, Sun, ZoomIn, ZoomOut, RotateCcw, HelpCircle } from 'lucide-react';
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
    onOpenHelp: () => void;
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
    isLocked?: boolean;
    setIsLocked?: (b: boolean) => void;
    layoutMode?: 'folder' | 'split' | 'file';
    setLayoutMode?: (mode: 'folder' | 'split' | 'file') => void;

    // Stats
    fileLineStats?: { added: number, removed: number, groups: number } | null;

    // Advanced Filter Props (for FilterToolbar)
    hiddenPaths?: Set<string>;
    toggleHiddenPath?: (path: string) => void;
    showHidden?: boolean;
    toggleShowHidden?: () => void;
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
                    <button className="icon-btn" title="Keyboard Shortcuts (? / F1)" onClick={props.onOpenHelp} style={{ color: 'var(--accent-color)' }}>
                        <HelpCircle size={18} />
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
                isLocked={props.isLocked}
                setIsLocked={props.setIsLocked}
                layoutMode={props.layoutMode}
                setLayoutMode={props.setLayoutMode}

                // Advanced Filters
                excludeFolders={props.excludeFolders}
                setExcludeFolders={props.setExcludeFolders}
                excludeFiles={props.excludeFiles}
                setExcludeFiles={props.setExcludeFiles}
                onBrowse={props.onBrowse}
                hiddenPaths={props.hiddenPaths}
                toggleHiddenPath={props.toggleHiddenPath}
                showHidden={props.showHidden}
                toggleShowHidden={props.toggleShowHidden}
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
