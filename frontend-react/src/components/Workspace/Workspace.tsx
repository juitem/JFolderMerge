import React from 'react';
import { Maximize, Minimize, X, Hash, FileDiff, ChevronUp, ChevronDown, Play, Columns, Rows } from 'lucide-react';
import { FolderTree, type FolderTreeHandle } from '../FolderTree';
import { DiffViewer, type DiffViewerHandle } from '../DiffViewer';
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

    // Diff Props
    selectedNode: FileNode | null;
    leftPath: string;
    rightPath: string;
    diffMode: DiffMode;
    setDiffMode: (mode: DiffMode) => void;
    isExpanded: boolean;
    setIsExpanded: (b: boolean) => void;
    onToggleViewOption?: (key: string) => void;
}

export const Workspace: React.FC<WorkspaceProps> = (props) => {
    const isUnified = props.config?.viewOptions?.folderViewMode === 'unified';
    const isFileOpen = !!props.selectedNode;

    // Layout Logic
    let leftStyle: React.CSSProperties = {
        overflow: 'hidden',
        padding: props.isExpanded ? 0 : '',
        border: props.isExpanded ? 'none' : '',
        flex: props.isExpanded ? '0 0 0' : '1',
        transition: 'all 0.3s ease'
    };

    let rightStyle: React.CSSProperties = {
        width: props.isExpanded ? '100%' : undefined,
        transition: 'all 0.3s ease'
    };

    if (isUnified && isFileOpen && !props.isExpanded) {
        // Shrink tree for unified view (it needs less space)
        leftStyle.flex = '0 0 25%';
        rightStyle.width = '75%';
    }

    const diffViewerRef = React.useRef<DiffViewerHandle>(null);
    const folderTreeRef = React.useRef<FolderTreeHandle>(null);

    return (
        <div className="main-content split-view">
            {/* Left Panel: Tree */}
            <div className="left-panel custom-scroll" style={leftStyle}>
                {/* Search Input (Moved from Overlay) */}
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={props.searchQuery}
                        onChange={(e) => props.setSearchQuery && props.setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                </div>
                {props.treeData && props.config && (
                    <FolderTree
                        ref={folderTreeRef}
                        root={props.treeData}
                        selectedNode={props.selectedNode}
                        config={props.config}
                        onSelect={props.onSelectNode}
                        onMerge={props.onMerge}
                        onDelete={props.onDelete}
                        searchQuery={props.searchQuery}
                        setSearchQuery={props.setSearchQuery}
                    />
                )}
            </div>

            {/* Right Panel: Diff */}
            <div className={`right-panel custom-scroll ${props.selectedNode ? 'open' : ''}`} style={rightStyle}>
                {props.selectedNode && props.config ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="diff-header-bar">
                            <div className="window-controls" style={{ display: 'flex', gap: '5px' }}>
                                <button className="icon-btn" onClick={() => { props.onSelectNode(null); props.setIsExpanded(false); }} title="Close Diff View">
                                    <X size={16} />
                                </button>
                                <button className="icon-btn" onClick={() => props.setIsExpanded(!props.isExpanded)} title={props.isExpanded ? "Restore View" : "Toggle Full Screen"}>
                                    {props.isExpanded ? <Minimize size={16} /> : <Maximize size={16} />}
                                </button>
                                <button className={`icon-btn ${props.config?.viewOptions?.showLineNumbers ? 'active' : ''}`}
                                    onClick={() => props.onToggleViewOption && props.onToggleViewOption('showLineNumbers')}
                                    title="Toggle Line Numbers">
                                    <Hash size={16} />
                                </button>
                                <div style={{ width: '1px', height: '20px', background: '#444', margin: '0 4px' }}></div>
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

                                <div style={{ display: 'flex', gap: '16px', marginLeft: '12px', borderLeft: '1px solid #444', paddingLeft: '12px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} title="Jump to Removed">
                                        <ChevronUp size={18} className="icon-btn" style={{ padding: 4, color: '#f87171' }} onClick={() => diffViewerRef.current?.scrollToChange('removed', 'prev')} />
                                        <ChevronDown size={18} className="icon-btn" style={{ padding: 4, color: '#f87171' }} onClick={() => diffViewerRef.current?.scrollToChange('removed', 'next')} />
                                    </div>

                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} title="Jump to Added">
                                        <ChevronUp size={18} className="icon-btn" style={{ padding: 4, color: '#4ade80' }} onClick={() => diffViewerRef.current?.scrollToChange('added', 'prev')} />
                                        <ChevronDown size={18} className="icon-btn" style={{ padding: 4, color: '#4ade80' }} onClick={() => diffViewerRef.current?.scrollToChange('added', 'next')} />
                                    </div>
                                    <div title="Merge Selected Block">
                                        <Play size={16} className="icon-btn" style={{ padding: 4, color: '#fb923c' }} onClick={() => diffViewerRef.current?.mergeActiveBlock()} />
                                    </div>
                                </div>
                            </div>
                            <span style={{ fontFamily: 'monospace', color: '#aaa', marginLeft: 'auto' }}>{props.selectedNode.path}</span>
                        </div>
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
        </div >
    );
};
