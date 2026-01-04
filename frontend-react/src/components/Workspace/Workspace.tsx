import React from 'react';
import { X, ChevronUp, ChevronDown, PanelLeftClose, PanelLeftOpen, RefreshCw, ArrowLeft, ArrowRight, FileDiff, Bot, Layout, Columns, Rows, FileCode, FileText, WrapText, ChevronsUp, ChevronsDown, Eye, EyeOff, ArrowUpToLine, ArrowDownToLine, Hash } from 'lucide-react';
import { ContextMenu, type ContextMenuItem } from '../ContextMenu';
import { FolderTree, type FolderTreeHandle } from '../FolderTree';

import { useConfig } from '../../contexts/ConfigContext';
import type { FileNode, Config, DiffMode } from '../../types';
import { viewerRegistry } from '../../viewers/ViewerRegistry';
import { layoutService } from '../../services/layout/LayoutService';

interface WorkspaceProps {
    // ... existing props ...
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
    layoutMode?: 'folder' | 'split' | 'file';
    leftPanelWidth?: number; // percentage (10-50)
    onStatsUpdate?: (added: number, removed: number, groups: number) => void;
    selectionSet?: Set<string>;
    onToggleSelection?: (path: string) => void;
    onToggleBatchSelection?: (paths: string[]) => void;

    // Hiding Props
    hiddenPaths?: Set<string>;
    toggleHiddenPath?: (path: string) => void;
    showHidden?: boolean;
    toggleShowHidden?: () => void;

    // Stats & Selection (For StatusBar)
    globalStats?: { added: number, removed: number, modified: number };
    currentFolderStats?: { added: number, removed: number, modified: number } | null;
    fileLineStats?: { added: number, removed: number, groups: number } | null;
    selectionCount?: number;
    onSelectByStatus?: (status: 'added' | 'removed' | 'modified') => void;
    onClearSelection?: () => void;
    onExecuteBatchMerge?: (dir: 'left-to-right' | 'right-to-left') => void;
    onExecuteBatchDelete?: (side: 'left' | 'right') => void;
    onShowConfirm?: (title: string, message: string, action: () => void) => void;

    // Context Menu Props
    contextMenu?: { x: number, y: number, items: ContextMenuItem[] } | null;
    onContextMenu?: (e: React.MouseEvent, node: FileNode) => void;
    onCloseContextMenu?: () => void;

    // External Tools
    externalEditorPath?: string;
    onSetExternalEditor?: (path: string) => void;
    onOpenExternal?: (node: FileNode) => void;
}

export const Workspace: React.FC<WorkspaceProps> = (props) => {
    const { toggleViewOption, setViewOption } = useConfig();
    const isUnified = props.config?.viewOptions?.folderViewMode === 'unified';
    const isFlat = props.config?.viewOptions?.folderViewMode === 'flat';
    const isFileOpen = !!props.selectedNode;

    const widthPercent = props.leftPanelWidth || 25;

    // Layout Logic

    let effectiveLeftWidth = props.isLocked
        ? (props.isExpanded ? 0 : 100)
        : (isFileOpen ? (props.isExpanded ? 0 : widthPercent) : 100);

    // Override with explicit layoutMode if present
    if (props.layoutMode) {
        if (props.layoutMode === 'folder') effectiveLeftWidth = 100;
        else if (props.layoutMode === 'file') effectiveLeftWidth = 0;
        else effectiveLeftWidth = widthPercent;
    }

    let leftStyle: React.CSSProperties = {
        overflow: 'hidden',
        padding: props.isExpanded ? 0 : '',
        border: props.isExpanded ? 'none' : '',
        flex: `0 0 ${effectiveLeftWidth}%`,
        transition: 'all 0.3s ease',
        display: effectiveLeftWidth === 0 ? 'none' : 'flex',
        flexDirection: 'column'
    };

    let rightStyle: React.CSSProperties = {
        width: `${100 - effectiveLeftWidth}%`,
        transition: 'all 0.3s ease',
        display: effectiveLeftWidth === 100 ? 'none' : 'flex',
        opacity: effectiveLeftWidth === 100 ? 0 : 1
    };


    const [focusedNode, setFocusedNode] = React.useState<FileNode | null>(null);

    const folderTreeRef = React.useRef<FolderTreeHandle>(null);

    const activeNode = props.selectedNode || focusedNode;

    // --- Viewer Adapter Logic ---
    const currentAdapter = React.useMemo(() => {
        if (!props.selectedNode) return null;
        return viewerRegistry.findAdapter(props.selectedNode);
    }, [props.selectedNode]);

    // Register with LayoutService
    React.useEffect(() => {
        layoutService.register({
            focusContent: () => {
                // Focus the Right Panel Container
                // We could also try to focus the specific adapter via ref, but container focus is generic.
                // We need a ref to the right panel.
                const rightPanel = document.querySelector('.right-panel') as HTMLElement;
                if (rightPanel) rightPanel.focus();

                // If we had an adapter handle, we could call that.
                // For now, assume focusing the container or its first focusable child is enough.
                // Or find .agent-view-container?
                setTimeout(() => {
                    const agentView = document.querySelector('.agent-view-container') as HTMLElement;
                    if (agentView) agentView.focus();
                    else rightPanel?.focus();
                }, 0);
            }
        });
        return () => layoutService.unregister();
    }, []);

    // Save Command (Ctrl/Cmd + S)
    React.useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                console.log("Triggering Save via Shortcut");
                if (currentAdapter?.save) {
                    await currentAdapter.save();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentAdapter]);


    return (
        <div className="main-content split-view">
            {/* Left Panel: Tree */}
            <div className="left-panel" style={leftStyle} onClick={(e) => {
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


                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
                        <button className="icon-btn" style={{ padding: 2, color: '#60a5fa' }} onClick={() => {
                            folderTreeRef.current?.selectPrevChangedNode();
                            folderTreeRef.current?.focus();
                        }} title="Prev Changed File">
                            <ChevronUp size={16} />
                        </button>
                        <button className="icon-btn" style={{ padding: 2, color: '#60a5fa' }} onClick={() => {
                            folderTreeRef.current?.selectNextChangedNode();
                            folderTreeRef.current?.focus();
                        }} title="Next Changed File">
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0, marginLeft: '4px' }}>
                        <button className="icon-btn" style={{ padding: 2, color: '#60a5fa' }} onClick={() => {
                            folderTreeRef.current?.selectFirstChangedNode?.();
                            folderTreeRef.current?.focus();
                        }} title="Go to First Changed Item">
                            <ChevronsUp size={16} />
                        </button>
                        <button className="icon-btn" style={{ padding: 2, color: '#60a5fa' }} onClick={() => {
                            folderTreeRef.current?.selectLastChangedNode?.();
                            folderTreeRef.current?.focus();
                        }} title="Go to Last Changed Item">
                            <ChevronsDown size={16} />
                        </button>

                        <div style={{ width: '1px', height: '12px', background: '#ddd', margin: '0 2px' }} />

                        <button className="icon-btn" style={{ padding: 2, color: '#aaa' }} onClick={() => {
                            console.log('[Workspace] Go To Top Clicked');
                            folderTreeRef.current?.selectFirst();
                        }} title="Go to First Non-Root Item">
                            <ArrowUpToLine size={16} />
                        </button>
                        <button className="icon-btn" style={{ padding: 2, color: '#aaa' }} onClick={() => {
                            console.log('[Workspace] Go To End Clicked');
                            folderTreeRef.current?.selectLast();
                        }} title="Go to End">
                            <ArrowDownToLine size={16} />
                        </button>
                    </div>

                    <div style={{ width: '1px', height: '16px', background: '#ccc', margin: '0 4px', flexShrink: 0 }}></div>

                    {/* Toggle Hidden Button */}
                    <button
                        className={`icon-btn ${props.showHidden ? 'active' : ''}`}
                        onClick={() => props.toggleShowHidden?.()}
                        title={props.showHidden ? "Hide Manually Hidden Items" : "Show Manually Hidden Items (H)"}
                        style={{ color: props.showHidden ? '#60a5fa' : '#aaa', flexShrink: 0, padding: 2 }}
                    >
                        {props.showHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    <div style={{ width: '1px', height: '16px', background: '#ccc', margin: '0 4px', flexShrink: 0 }}></div>

                    {/* File-level Merge Buttons */}
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
                            // Removed auto-reload on re-select per user feedback
                            props.onSelectNode(node);
                        }}
                        onMerge={props.onMerge}
                        onDelete={props.onDelete}
                        searchQuery={props.searchQuery}
                        setSearchQuery={props.setSearchQuery}
                        onFocus={setFocusedNode}
                        selectionSet={props.selectionSet}
                        onToggleSelection={props.onToggleSelection}
                        onToggleBatchSelection={props.onToggleBatchSelection}
                        hiddenPaths={props.hiddenPaths}
                        toggleHiddenPath={props.toggleHiddenPath}
                        showHidden={props.showHidden}
                        toggleShowHidden={props.toggleShowHidden}

                        // StatusBar Props
                        globalStats={props.globalStats}
                        currentFolderStats={props.currentFolderStats}
                        fileLineStats={props.fileLineStats}
                        selectionCount={props.selectionCount}
                        onSelectByStatus={props.onSelectByStatus}
                        onClearSelection={props.onClearSelection}
                        onExecuteBatchMerge={props.onExecuteBatchMerge}
                        onExecuteBatchDelete={props.onExecuteBatchDelete}

                        // Context Menu Props
                        onContextMenu={props.onContextMenu}
                    />
                )}
            </div>

            {/* Right Panel: Adapter View */}
            <div className={`right-panel custom-scroll ${(props.selectedNode && !props.isLocked) || props.layoutMode === 'file' ? 'open' : ''}`}
                style={{ ...rightStyle, position: 'relative', outline: 'none' }}
                tabIndex={-1} // Allow programmatic focus
            >
                {currentAdapter && props.selectedNode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Generic Adapter Header */}
                        <div className="diff-header-bar">
                            <div className="window-controls" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                <button className="icon-btn" onClick={() => {
                                    props.onSelectNode(null);
                                    props.setIsExpanded(false);
                                    folderTreeRef.current?.focus();
                                }} title="Close View">
                                    <X size={16} />
                                </button>
                                <button className="icon-btn" onClick={() => props.setIsExpanded(!props.isExpanded)} title={props.isExpanded ? "Restore View" : "Toggle Full Screen"}>
                                    {props.isExpanded ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                                </button>

                                {/* File View Modes (Restored) */}
                                <div style={{ width: '1px', height: '16px', background: '#ccc', margin: '0 4px' }}></div>
                                <button className={`icon-btn ${props.diffMode === 'agent' ? 'active' : ''}`} onClick={() => props.setDiffMode('agent')} title="Agent View">
                                    <Bot size={16} />
                                </button>
                                <button className={`icon-btn ${props.diffMode === 'combined' ? 'active' : ''}`} onClick={() => props.setDiffMode('combined')} title="Combined View">
                                    <Layout size={16} />
                                </button>
                                <button className={`icon-btn ${props.diffMode === 'side-by-side' ? 'active' : ''}`} onClick={() => props.setDiffMode('side-by-side')} title="Side by Side View">
                                    <Columns size={16} />
                                </button>
                                <button className={`icon-btn ${props.diffMode === 'unified' ? 'active' : ''}`} onClick={() => props.setDiffMode('unified')} title="Unified View">
                                    <Rows size={16} />
                                </button>
                                <button className={`icon-btn ${props.diffMode === 'raw' ? 'active' : ''}`} onClick={() => props.setDiffMode('raw')} title="Raw Content (Dual)">
                                    <FileCode size={16} />
                                </button>
                                <button className={`icon-btn ${props.diffMode === 'single' ? 'active' : ''}`} onClick={() => props.setDiffMode('single')} title="Single Raw View">
                                    <FileText size={16} />
                                </button>

                                <div style={{ width: '1px', height: '16px', background: '#ccc', margin: '0 4px' }}></div>

                                <button className={`icon-btn ${props.config?.viewOptions?.wordWrap ? 'active' : ''}`} onClick={() => toggleViewOption('wordWrap')} title="Toggle Word Wrap">
                                    <WrapText size={16} />
                                </button>
                                <button className={`icon-btn ${props.config?.viewOptions?.showLineNumbers ? 'active' : ''}`} onClick={() => toggleViewOption('showLineNumbers')} title="Toggle Line Numbers">
                                    <Hash size={16} />
                                </button>

                            </div>
                        </div>

                        {/* Render specific Adapter Content */}
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {currentAdapter.render({
                                fileNode: props.selectedNode,
                                isActive: true,
                                content: {
                                    // Pass all legacy props
                                    leftPathBase: props.leftPath,
                                    rightPathBase: props.rightPath,
                                    relPath: props.selectedNode.path,
                                    config: props.config,
                                    initialMode: props.diffMode,
                                    onModeChange: props.setDiffMode,
                                    onNextFile: () => folderTreeRef.current?.selectNextNode(),
                                    onPrevFile: () => folderTreeRef.current?.selectPrevNode(),
                                    onStatsUpdate: props.onStatsUpdate,
                                    onReload: props.onReload,
                                    toggleViewOption: toggleViewOption,
                                    setViewOption: setViewOption,
                                    smoothScroll: props.config?.viewOptions?.smoothScrollFile !== false,
                                    onShowConfirm: props.onShowConfirm
                                }
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <FileDiff size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <p>Select a file to view differences</p>
                    </div>
                )}
            </div>

            {/* Context Menu Rendering */}
            {props.contextMenu && props.onCloseContextMenu && (
                <ContextMenu
                    x={props.contextMenu.x}
                    y={props.contextMenu.y}
                    items={props.contextMenu.items}
                    onClose={props.onCloseContextMenu}
                />
            )}
        </div>
    );
};
