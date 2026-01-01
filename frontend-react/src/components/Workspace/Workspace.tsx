import React from 'react';
import { X, Hash, FileDiff, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Columns, Rows, Layout, FileCode, WrapText, Bot, FolderX, FileX, PanelLeftClose, PanelLeftOpen, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';
import { FolderTree, type FolderTreeHandle } from '../FolderTree';
import { DiffViewer, type DiffViewerHandle } from '../DiffViewer';
import { useConfig } from '../../contexts/ConfigContext';
import type { FileNode, Config, DiffMode } from '../../types';

interface WorkspaceProps {
    // Tree Props
    treeData: FileNode | null;
    config: Config | null;
    onSelectNode: (node: FileNode | null) => void;
    onMerge: (node: FileNode, dir: 'left-to-right' | 'right-to-left') => void;
    onDelete: (node: FileNode, side: 'left' | 'right') => void;
    searchQuery: string;
    setSearchQuery?: (q: string) => void;

    // Filter Props (Moved from Toolbar)
    excludeFolders?: string;
    setExcludeFolders?: (s: string) => void;
    excludeFiles?: string;
    setExcludeFiles?: (s: string) => void;
    onBrowse?: (target: 'import-exclude-folders' | 'import-exclude-files') => void;
    onReload?: () => void;

    // Diff/View Props
    selectedNode: FileNode | null;
    leftPath: string;
    rightPath: string;
    diffMode: DiffMode;
    setDiffMode: (mode: DiffMode) => void;
    isExpanded: boolean;
    setIsExpanded: (b: boolean) => void;
    isLocked?: boolean;
    setIsLocked?: (b: boolean) => void;
    leftPanelWidth?: number; // percentage (10-50)
    onStatsUpdate?: (added: number, removed: number, groups: number) => void;
}

export const Workspace: React.FC<WorkspaceProps> = (props) => {
    const { toggleViewOption } = useConfig();
    const isUnified = props.config?.viewOptions?.folderViewMode === 'unified';
    const isFlat = props.config?.viewOptions?.folderViewMode === 'flat';
    const isFileOpen = !!props.selectedNode;

    const widthPercent = props.leftPanelWidth || 25;

    // Layout Logic
    // If no file is open, the Tree should normally take full width.
    // However, if locked, we respect the expansion state even if no file is open (shows empty diff area if locked to diff).
    const effectiveLeftWidth = props.isLocked
        ? (props.isExpanded ? 0 : 100)
        : (isFileOpen ? (props.isExpanded ? 0 : widthPercent) : 100);

    let leftStyle: React.CSSProperties = {
        overflow: 'hidden',
        padding: props.isExpanded ? 0 : '',
        border: props.isExpanded ? 'none' : '',
        flex: `0 0 ${effectiveLeftWidth}%`,
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
    };

    let rightStyle: React.CSSProperties = {
        width: `${100 - effectiveLeftWidth}%`,
        transition: 'all 0.3s ease'
    };

    const isNarrow = (isUnified || isFlat) && isFileOpen && !props.isExpanded;

    if (isNarrow) {
        // Shrink tree for unified view (it needs less space)
        // Use default narrow width if not explicitly adjusting, maybe?
        // Let's respect the user setting even in narrow mode if possible, 
        // OR just stick to the calculation above which already does it.
        // Actually, previous logic hardcoded 25%. We now use `widthPercent`.
        // So we can remove this block if we trust `widthPercent` is correct.
        // But unified might default to smaller.
        // Let's just use the `leftPanelWidth` logic universally for consistency.
        // If user wants it smaller, they click the button.
    }

    const diffViewerRef = React.useRef<DiffViewerHandle>(null);
    const folderTreeRef = React.useRef<FolderTreeHandle>(null);

    // Track currently focused node in tree (even if not selected/open)
    const [focusedNode, setFocusedNode] = React.useState<FileNode | null>(null);

    // Filter Logic: Hide text inputs when file is open to save space
    const showFilterInputs = !isFileOpen;

    // Effective node for merge actions (Selected or Focused)
    const activeNode = props.selectedNode || focusedNode;

    return (
        <div className="main-content split-view">
            {/* Left Panel: Tree */}
            <div className="left-panel custom-scroll" style={leftStyle} onClick={(e) => {
                // Return focus to tree if clicking empty area
                if (e.target === e.currentTarget) {
                    folderTreeRef.current?.focus();
                }
            }}>


                {/* Search Input & Filters */}
                <div style={{
                    padding: '4px 8px',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.1)',
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center',
                    overflow: 'hidden'
                }}>
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={props.searchQuery}
                        onChange={(e) => props.setSearchQuery && props.setSearchQuery(e.target.value)}
                        style={{
                            flex: 1,
                            minWidth: '50px',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            outline: 'none',
                            height: '24px'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                folderTreeRef.current?.focus();
                                folderTreeRef.current?.selectNextNode();
                            }
                        }}
                    />

                    {/* Exclude Filters - Moved here between Search and Prev Change */}
                    {props.excludeFolders !== undefined && (
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                            {/* Exclude Folders */}
                            {showFilterInputs ? (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="Excl. Folders"
                                        value={props.excludeFolders}
                                        onChange={e => props.setExcludeFolders?.(e.target.value)}
                                        title="Exclude Folders (comma separated)"
                                        style={{ width: '500px', padding: '4px 8px', paddingRight: '20px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#eee', fontSize: '0.75rem', height: '24px' }}
                                    />
                                    <button
                                        onClick={() => props.onBrowse?.('import-exclude-folders')}
                                        style={{ position: 'absolute', right: '2px', background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex' }}
                                        title="Import Ignore Folders List"
                                    >
                                        <FolderX size={15} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => props.onBrowse?.('import-exclude-folders')}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', padding: 2 }}
                                    title={`Import Ignore Folders List (Current: ${props.excludeFolders || 'None'})`}
                                >
                                    <FolderX size={16} />
                                </button>
                            )}

                            {/* Exclude Files */}
                            {showFilterInputs ? (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="Excl. Files"
                                        value={props.excludeFiles}
                                        onChange={e => props.setExcludeFiles?.(e.target.value)}
                                        title="Exclude Files (comma separated)"
                                        style={{ width: '500px', padding: '4px 8px', paddingRight: '20px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#eee', fontSize: '0.75rem', height: '24px' }}
                                    />
                                    <button
                                        onClick={() => props.onBrowse?.('import-exclude-files')}
                                        style={{ position: 'absolute', right: '2px', background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex' }}
                                        title="Import Ignore Files List"
                                    >
                                        <FileX size={15} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => props.onBrowse?.('import-exclude-files')}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', padding: 2 }}
                                    title={`Import Ignore Files List (Current: ${props.excludeFiles || 'None'})`}
                                >
                                    <FileX size={16} />
                                </button>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
                        <button className="icon-btn" style={{ padding: 2, color: '#60a5fa' }} onClick={() => folderTreeRef.current?.selectPrevChangedNode()} title="Prev Changed File">
                            <ChevronUp size={16} />
                        </button>
                        <button className="icon-btn" style={{ padding: 2, color: '#60a5fa' }} onClick={() => folderTreeRef.current?.selectNextChangedNode()} title="Next Changed File">
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    <div style={{ width: '1px', height: '16px', background: '#ccc', margin: '0 4px', flexShrink: 0 }}></div>

                    {/* File-level Merge Buttons (Revert/Accept) */}
                    {activeNode && (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                            <button
                                className="agent-apply-btn"
                                style={{ height: '22px', border: 'none' }}
                                title={`Revert ${activeNode.name} (Overwrite Agent with User version)`}
                                onClick={() => props.onMerge(activeNode, 'left-to-right')}
                            >
                                <div className="agent-apply-icon-box" style={{ position: 'relative' }}>
                                    <ArrowRight size={11} strokeWidth={3} />
                                    <span className="file-level-f">F</span>
                                </div>
                                {!isUnified && !isFlat && <span className="agent-apply-text">Merge</span>}
                            </button>
                            <button
                                className="agent-apply-btn"
                                style={{ height: '22px', border: 'none' }}
                                title={`Accept ${activeNode.name} (Merge Agent changes to User file)`}
                                onClick={() => props.onMerge(activeNode, 'right-to-left')}
                            >
                                <div className="agent-apply-icon-box" style={{ position: 'relative' }}>
                                    <ArrowLeft size={11} strokeWidth={3} />
                                    <span className="file-level-f">F</span>
                                </div>
                                {!isUnified && !isFlat && <span className="agent-apply-text">Merge</span>}
                            </button>
                        </div>
                    )}

                    <button
                        className="icon-btn"
                        onClick={() => props.onReload && props.onReload()}
                        title="Refresh Folder List"
                        style={{ color: '#555', flexShrink: 0 }}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
                {props.treeData && props.config && (
                    <FolderTree
                        ref={folderTreeRef}
                        root={props.treeData}
                        selectedNode={props.selectedNode}
                        config={props.config}
                        onSelect={(node) => {
                            if (props.selectedNode?.path === node.path) {
                                // Re-selection: Force a refresh
                                props.onReload?.();
                                // Also tell DiffViewer to refresh if it has a ref (we'd need to add one or just rely on state changes)
                                // Actually, onReload triggers compare() which updates treeData, which triggers DiffViewer's internal refresh.
                            }
                            props.onSelectNode(node);
                        }}
                        onMerge={props.onMerge}
                        onDelete={props.onDelete}
                        searchQuery={props.searchQuery}
                        setSearchQuery={props.setSearchQuery}
                        onFocus={setFocusedNode}
                    />
                )}
            </div>

            {/* Right Panel: Diff */}
            <div className={`right-panel custom-scroll ${(props.selectedNode && !props.isLocked) ? 'open' : ''}`} style={{ ...rightStyle, position: 'relative' }}>
                {props.selectedNode && !props.isLocked && props.config ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="diff-header-bar">
                            <div className="window-controls" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                <button className="icon-btn" onClick={() => { props.onSelectNode(null); props.setIsExpanded(false); }} title="Close Diff View">
                                    <X size={16} />
                                </button>
                                <button className="icon-btn" onClick={() => props.setIsExpanded(!props.isExpanded)} title={props.isExpanded ? "Restore View" : "Toggle Full Screen"}>
                                    {props.isExpanded ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                                </button>

                                <button className="icon-btn" onClick={() => diffViewerRef.current?.reload().catch(console.error)} title="Refresh Diff">
                                    <RefreshCw size={16} />
                                </button>

                                <div style={{ width: '1px', height: '20px', background: '#444', margin: '0 4px' }}></div>

                                <button className={`icon-btn ${props.config?.viewOptions?.showLineNumbers ? 'active' : ''}`}
                                    onClick={() => toggleViewOption('showLineNumbers')}
                                    title="Toggle Line Numbers">
                                    <Hash size={16} />
                                </button>
                                <button className={`icon-btn ${props.config?.viewOptions?.diffViewWrap ? 'active' : ''}`}
                                    onClick={() => toggleViewOption('diffViewWrap')}
                                    title="Toggle Word Wrap">
                                    <WrapText size={16} />
                                </button>

                                <div style={{ width: '1px', height: '20px', background: '#444', margin: '0 4px' }}></div>

                                <button className={`icon-btn ${props.diffMode === 'agent' ? 'active' : ''}`}
                                    onClick={() => props.setDiffMode('agent')}
                                    title="Agent View">
                                    <Bot size={16} />
                                </button>
                                <button className={`icon-btn ${props.diffMode === 'combined' ? 'active' : ''}`}
                                    onClick={() => props.setDiffMode('combined')}
                                    title="Combined View">
                                    <Layout size={16} />
                                </button>
                                <button className={`icon-btn ${props.diffMode === 'side-by-side' ? 'active' : ''}`}
                                    onClick={() => props.setDiffMode('side-by-side')}
                                    title="Side by Side View">
                                    <Columns size={16} />
                                </button>
                                <button className={`icon-btn ${props.diffMode === 'unified' ? 'active' : ''}`}
                                    onClick={() => props.setDiffMode('unified')}
                                    title="Unified View">
                                    <Rows size={16} />
                                </button>
                                <button className={`icon-btn ${props.diffMode === 'raw' ? 'active' : ''}`}
                                    onClick={() => props.setDiffMode('raw')}
                                    title="Raw Content View">
                                    <FileCode size={16} />
                                </button>
                            </div>
                        </div>



                        {/* Agent View Specific Toolbar */}
                        {(props.diffMode === 'agent' || props.diffMode === 'combined') && (
                            <div className="agent-toolbar" style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px 16px',
                                borderBottom: '1px solid var(--border-color)',
                                background: 'rgba(0,0,0,0.2)', // Slightly different bg to distinguish
                                gap: '16px'
                            }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agent Controls</span>
                                <div style={{ width: '1px', height: '16px', background: '#444' }}></div>

                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} title="Jump to Change (Any)">
                                    <button className="icon-btn" style={{ padding: 3, color: '#60a5fa' }} onClick={() => diffViewerRef.current?.scrollToChange('any', 'first')} title="First Change">
                                        <ChevronsUp size={16} />
                                    </button>
                                    <button className="icon-btn" style={{ padding: 3, color: '#60a5fa' }} onClick={() => diffViewerRef.current?.scrollToChange('any', 'prev')} title="Prev Change">
                                        <ChevronUp size={16} />
                                    </button>
                                    <button className="icon-btn" style={{ padding: 3, color: '#60a5fa' }} onClick={() => diffViewerRef.current?.scrollToChange('any', 'next')} title="Next Change">
                                        <ChevronDown size={16} />
                                    </button>
                                    <button className="icon-btn" style={{ padding: 3, color: '#60a5fa' }} onClick={() => diffViewerRef.current?.scrollToChange('any', 'last')} title="Last Change">
                                        <ChevronsDown size={16} />
                                    </button>
                                </div>

                                <div style={{ width: '1px', height: '16px', background: '#444' }}></div>
                                <div
                                    className="agent-apply-btn"
                                    title="Merge Left Change to Right (Revert)"
                                    onClick={() => diffViewerRef.current?.deleteActiveBlock()}
                                >
                                    <div className="agent-apply-icon-box">
                                        <ArrowRight size={12} strokeWidth={3} />
                                    </div>
                                    <span className="agent-apply-text" style={{ fontSize: '13px' }}>Merge</span>
                                </div>

                                <div style={{ width: '1px', height: '16px', background: '#444' }}></div>
                                <div
                                    className="agent-apply-btn"
                                    title="Merge Right Change to Left (Accept)"
                                    onClick={() => diffViewerRef.current?.mergeActiveBlock()}
                                >
                                    <div className="agent-apply-icon-box" style={{ order: 2 }}>
                                        <ArrowLeft size={12} strokeWidth={3} />
                                    </div>
                                    <span className="agent-apply-text" style={{ fontSize: '13px' }}>Merge</span>
                                </div>
                            </div>
                        )}
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <DiffViewer
                                ref={diffViewerRef}
                                leftPathBase={props.leftPath}
                                rightPathBase={props.rightPath}
                                relPath={props.selectedNode.path}
                                config={props.config}
                                initialMode={props.diffMode}
                                onModeChange={props.setDiffMode}
                                onNextFile={() => folderTreeRef.current?.selectNextNode()}
                                onPrevFile={() => folderTreeRef.current?.selectPrevNode()}
                                onStatsUpdate={props.onStatsUpdate}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <FileDiff size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <p>Select a file to view differences</p>
                    </div>
                )}
            </div>
        </div>
    );
};
