import React from 'react';
import { Maximize, Minimize, X, FileDiff } from 'lucide-react';
import { FolderTree } from '../FolderTree';
import { DiffViewer } from '../DiffViewer';
import type { FileNode, Config, DiffMode } from '../../types';

interface WorkspaceProps {
    // Tree Props
    treeData: FileNode | null;
    config: Config | null;
    onSelectNode: (node: FileNode | null) => void;
    onMerge: (node: FileNode, dir: 'left-to-right' | 'right-to-left') => void;
    onDelete: (node: FileNode, side: 'left' | 'right') => void;
    searchQuery: string;

    // Diff Props
    selectedNode: FileNode | null;
    leftPath: string;
    rightPath: string;
    diffMode: DiffMode;
    setDiffMode: (mode: DiffMode) => void;
    isExpanded: boolean;
    setIsExpanded: (b: boolean) => void;
}

export const Workspace: React.FC<WorkspaceProps> = (props) => {
    return (
        <div className="main-content split-view">
            {/* Left Panel: Tree */}
            <div className="left-panel custom-scroll" style={{ flex: props.isExpanded ? '0 0 0' : '1', overflow: 'hidden', padding: props.isExpanded ? 0 : '', border: props.isExpanded ? 'none' : '' }}>
                {props.treeData && props.config && (
                    <FolderTree
                        root={props.treeData}
                        config={props.config}
                        onSelect={props.onSelectNode}
                        onMerge={props.onMerge}
                        onDelete={props.onDelete}
                        searchQuery={props.searchQuery}
                    />
                )}
            </div>

            {/* Right Panel: Diff */}
            <div className={`right-panel custom-scroll ${props.selectedNode ? 'open' : ''}`} style={{ width: props.isExpanded ? '100%' : undefined }}>
                {props.selectedNode && props.config ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="diff-header-bar" style={{
                            padding: '8px 15px', borderBottom: '1px solid #333', background: '#252525',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div className="window-controls" style={{ display: 'flex', gap: '5px' }}>
                                <button className="icon-btn" onClick={() => props.setIsExpanded(!props.isExpanded)} title={props.isExpanded ? "Restore View" : "Toggle Full Screen"}>
                                    {props.isExpanded ? <Minimize size={16} /> : <Maximize size={16} />}
                                </button>
                                <button className="icon-btn" onClick={() => { props.onSelectNode(null); props.setIsExpanded(false); }} title="Close Diff View">
                                    <X size={16} />
                                </button>
                            </div>
                            <span style={{ fontFamily: 'monospace', color: '#aaa', marginLeft: 'auto' }}>{props.selectedNode.path}</span>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <DiffViewer
                                leftPathBase={props.leftPath}
                                rightPathBase={props.rightPath}
                                relPath={props.selectedNode.path}
                                config={props.config}
                                initialMode={props.diffMode}
                                onModeChange={props.setDiffMode}
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
