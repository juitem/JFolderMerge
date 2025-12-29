import React from 'react';
import type { ReactNode } from 'react';
import { Save, ShieldCheck, ShieldAlert, Moon, Sun } from 'lucide-react';
import { FilterToolbar } from '../FilterToolbar';
import { useConfig } from '../../contexts/ConfigContext';
import { PathControls } from '../PathControls';
import type { DiffMode } from '../../types';

interface MainLayoutProps {
    children: ReactNode;
    // Header Props
    onSaveSettings: () => void;
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
}

export const MainLayout: React.FC<MainLayoutProps> = (props) => {
    const { config, setViewOption } = useConfig();
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
                    <h1 style={{ fontStyle: 'normal' }}>
                        <i style={{ marginRight: '4px' }}>J-Folder Merge</i> - Oscar Series
                    </h1>
                </div>
                <div className="header-actions">
                    {/* Confirmation Toggles */}
                    <div style={{ display: 'flex', gap: '4px', marginRight: '10px', paddingRight: '10px', borderRight: '1px solid #444', alignItems: 'center' }}>
                        <button className={`icon-btn ${config?.viewOptions?.confirmMerge !== false ? 'active' : ''}`}
                            onClick={() => setViewOption('confirmMerge', config?.viewOptions?.confirmMerge === false)}
                            title={config?.viewOptions?.confirmMerge !== false ? "Merge Confirmation: ON" : "Merge Confirmation: OFF"}>
                            <ShieldCheck size={18} />
                        </button>
                        <button className={`icon-btn ${config?.viewOptions?.confirmDelete !== false ? 'active' : ''}`}
                            onClick={() => setViewOption('confirmDelete', config?.viewOptions?.confirmDelete === false)}
                            title={config?.viewOptions?.confirmDelete !== false ? "Delete Confirmation: ON" : "Delete Confirmation: OFF"}>
                            <ShieldAlert size={18} />
                        </button>
                    </div>

                    <button className="icon-btn" title="Save Settings" onClick={props.onSaveSettings}>
                        <Save size={18} />
                    </button>
                    <button className="icon-btn" title="Toggle Theme" onClick={() => setViewOption('darkMode', !isDark)}>
                        {isDark ? <Sun size={18} /> : <Moon size={18} style={{ transform: 'scaleX(-1)' }} />}
                    </button>
                </div>
            </header>

            {/* Filter Toolbar */}
            <FilterToolbar
                excludeFolders={props.excludeFolders}
                setExcludeFolders={props.setExcludeFolders}
                excludeFiles={props.excludeFiles}
                setExcludeFiles={props.setExcludeFiles}
                onBrowse={props.onBrowse}
                onCompare={props.onCompare}
                loading={props.compareLoading}
                diffMode={props.diffMode}
                setDiffMode={props.setDiffMode}
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
