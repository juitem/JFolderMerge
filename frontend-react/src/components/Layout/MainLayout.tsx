import React from 'react';
import type { ReactNode } from 'react';
import { Save, Info } from 'lucide-react';
import { FilterToolbar } from '../FilterToolbar';
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
    return (
        <div className="app-container">
            {/* Header */}
            <header className="app-header">
                <div className="header-brand">
                    <h1>J-Folder Merge - Oscar Series</h1>
                </div>
                <div className="header-actions">
                    <button className="icon-btn" title="Save Settings" onClick={props.onSaveSettings}>
                        <Save size={18} />
                    </button>
                    <button className="icon-btn" title="About" onClick={props.onOpenAbout}>
                        <Info size={18} />
                    </button>
                </div>
            </header>

            {/* Filter Toolbar */}
            <FilterToolbar
                searchQuery={props.searchQuery}
                setSearchQuery={props.setSearchQuery}
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
