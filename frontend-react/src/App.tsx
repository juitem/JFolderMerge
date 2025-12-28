import { useEffect, useState } from 'react'
import './App.css'
import { api } from './api'
import type { FileNode, DiffMode } from './types' // Config is in context now
import { FolderTree } from './components/FolderTree'
import { DiffViewer } from './components/DiffViewer'
import { BrowseModal } from './components/BrowseModal'
import { HistoryModal } from './components/HistoryModal'
import ConfirmModal from './components/ConfirmModal';
import {
  Save, Info, X, Maximize, Minimize, FileDiff
} from 'lucide-react'

import { useConfig } from './contexts/ConfigContext';
import { useFolderCompare } from './hooks/useFolderCompare';
import { useFileSystem } from './hooks/useFileSystem';
import { PathControls } from './components/PathControls';
import { FilterToolbar } from './components/FilterToolbar';

function App() {
  // Global Config
  const { config, loading: configLoading, error: configError, saveConfig } = useConfig();

  // Local State
  const [leftPath, setLeftPath] = useState("")
  const [rightPath, setRightPath] = useState("")

  // Search & Exclude (Moved to FilterToolbar but we need state here to pass to compare/tree)
  // Actually, FilterToolbar manages the UI inputs for excludes, but compare needs the values.
  // Wait, if FilterToolbar inputs are controlled, state must be here.
  const [searchQuery, setSearchQuery] = useState("");
  const [excludeFolders, setExcludeFolders] = useState("");
  const [excludeFiles, setExcludeFiles] = useState("");

  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [diffMode, setDiffMode] = useState<DiffMode>('side-by-side');

  // Hooks
  const { treeData, loading: compareLoading, error: compareError, compare } = useFolderCompare();

  // File System Actions
  const handleReload = () => {
    compare(leftPath, rightPath, excludeFiles, excludeFolders);
  };
  const { copyItem, deleteItem } = useFileSystem(handleReload);

  // Modals
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
    isAlert?: boolean;
  }>({ isOpen: false, title: '', message: '', action: null, isAlert: false });

  const [browseState, setBrowseState] = useState<{
    isOpen: boolean,
    target: 'left' | 'right' | 'import-exclude-folders' | 'import-exclude-files' | null,
    mode: 'file' | 'directory'
  }>({ isOpen: false, target: null, mode: 'directory' });

  const [historyState, setHistoryState] = useState<{ isOpen: boolean, side: 'left' | 'right' | null }>({ isOpen: false, side: null });
  const [aboutOpen, setAboutOpen] = useState(false);

  // Initialize paths from config
  useEffect(() => {
    if (config) {
      if (!leftPath && config.left) setLeftPath(config.left);
      if (!rightPath && config.right) setRightPath(config.right);
      // Initialize excludes if not already set (or always?)
      // Original logic was: if (cfg.savedExcludes) set...
      if (!excludeFolders && config.savedExcludes?.folders) setExcludeFolders(config.savedExcludes.folders);
      if (!excludeFiles && config.savedExcludes?.files) setExcludeFiles(config.savedExcludes.files);
      if (config.viewOptions?.diffMode) setDiffMode(config.viewOptions.diffMode as DiffMode);
    }
  }, [config]); // Run when config loads

  const showAlert = (title: string, message: string) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      action: null,
      isAlert: true
    });
  };

  const handleSaveSettings = async () => {
    if (!config) return;
    try {
      const toSave = {
        ...config,
        left: leftPath, // Should we save current paths? Original didn't explicitly but config object has them.
        right: rightPath,
        savedExcludes: {
          folders: excludeFolders,
          files: excludeFiles
        },
        viewOptions: {
          ...config.viewOptions,
          diffMode: diffMode
        }
      };
      await saveConfig(toSave);
      showAlert("Settings Saved", "Configuration has been saved successfully.");
    } catch (e: any) {
      showAlert("Save Failed", "Failed to save: " + e.message);
    }
  };

  const onCompare = () => {
    setSelectedNode(null);
    compare(leftPath, rightPath, excludeFiles, excludeFolders);
  };

  const handleMerge = (node: FileNode, direction: 'left-to-right' | 'right-to-left') => {
    setConfirmState({
      isOpen: true,
      title: 'Confirm Merge',
      message: `Are you sure you want to merge (copy) ${node.name} from ${direction === 'left-to-right' ? 'Left to Right' : 'Right to Left'}? This will overwrite the destination.`,
      action: async () => {
        try {
          await copyItem(node, direction, leftPath, rightPath);
        } catch (e: any) {
          showAlert("Merge Failed", e.message);
        }
      }
    });
  };

  const handleDelete = (node: FileNode, side: 'left' | 'right') => {
    setConfirmState({
      isOpen: true,
      title: 'Confirm Delete',
      message: `Are you sure you want to delete ${node.name} from the ${side} side? This cannot be undone.`,
      action: async () => {
        try {
          await deleteItem(node, side, leftPath, rightPath);
        } catch (e: any) {
          showAlert("Delete Failed", e.message);
        }
      }
    });
  };

  // Browse Handlers
  const openBrowse = (target: 'left' | 'right' | 'import-exclude-folders' | 'import-exclude-files') => {
    const mode = (target === 'import-exclude-folders' || target === 'import-exclude-files') ? 'file' : 'directory';
    setBrowseState({ isOpen: true, target, mode });
  };

  const handleBrowseSelect = async (path: string) => {
    if (browseState.target === 'left') setLeftPath(path);
    else if (browseState.target === 'right') setRightPath(path);
    else if (browseState.target === 'import-exclude-folders' || browseState.target === 'import-exclude-files') {
      try {
        const data = await api.fetchFileContent(path);
        if (data && data.content) {
          const lines = data.content.split(/\r?\n/)
            .map((l: string) => l.trim())
            .filter((l: string) => l && !l.startsWith('#'))
            .join(', ');

          if (browseState.target === 'import-exclude-folders') setExcludeFolders(lines);
          else setExcludeFiles(lines);
        }
      } catch (e: any) {
        showAlert("Import Failed", e.message);
      }
    }
  };

  const handleHistorySelect = (left: string, right?: string) => {
    if (historyState.side === 'left') setLeftPath(left);
    else if (historyState.side === 'right') setRightPath(left); // HistoryModal passes single selected path as 'left' arg if single select?
    // Wait, original logic:
    // if (historyState.side === 'left') setLeftPath(left); 
    // else if (historyState.side === 'right') setRightPath(left); <--- Yes, history passes path as 1st arg
    else if (right) {
      setLeftPath(left);
      setRightPath(right);
    }
  };

  const handleSwap = () => {
    const temp = leftPath;
    setLeftPath(rightPath);
    setRightPath(temp);
  };

  if (configError) return <div className="error-banner center-screen">{configError}</div>;
  if (!config && configLoading) return <div className="loading center-screen">Loading Config...</div>;

  const combinedError = compareError || configError; // Show inline error

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <h1>J-Folder Merge - Oscar Series</h1>
        </div>
        <div className="header-actions">
          <button className="icon-btn" title="Save Settings" onClick={handleSaveSettings}>
            <Save size={18} />
          </button>
          <button className="icon-btn" title="About" onClick={() => setAboutOpen(true)}>
            <Info size={18} />
          </button>
        </div>
      </header>

      {/* Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        excludeFolders={excludeFolders}
        setExcludeFolders={setExcludeFolders}
        excludeFiles={excludeFiles}
        setExcludeFiles={setExcludeFiles}
        onBrowse={openBrowse}
        onCompare={onCompare}
        loading={compareLoading}
        diffMode={diffMode}
        setDiffMode={setDiffMode}
      />

      {/* Path Controls */}
      <PathControls
        leftPath={leftPath}
        setLeftPath={setLeftPath}
        rightPath={rightPath}
        setRightPath={setRightPath}
        onHistory={(side) => setHistoryState({ isOpen: true, side })}
        onBrowse={(side) => openBrowse(side)}
        onSwap={handleSwap}
      />

      {combinedError && <div className="error-banner" style={{ margin: '0 20px 10px' }}>{combinedError}</div>}

      <div className="main-content split-view">
        {/* Left Panel: Tree */}
        <div className="left-panel custom-scroll" style={{ flex: isExpanded ? '0 0 0' : '1', overflow: 'hidden', padding: isExpanded ? 0 : '', border: isExpanded ? 'none' : '' }}>
          {treeData && config && (
            <FolderTree
              root={treeData}
              config={config}
              onSelect={setSelectedNode}
              onMerge={handleMerge}
              onDelete={handleDelete}
              searchQuery={searchQuery}
            />
          )}
        </div>

        {/* Right Panel: Diff */}
        <div className={`right-panel custom-scroll ${selectedNode ? 'open' : ''}`} style={{ width: isExpanded ? '100%' : undefined }}>
          {selectedNode && config ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="diff-header-bar" style={{
                padding: '8px 15px', borderBottom: '1px solid #333', background: '#252525',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div className="window-controls" style={{ display: 'flex', gap: '5px' }}>
                  <button className="icon-btn" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Restore View" : "Toggle Full Screen"}>
                    {isExpanded ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                  <button className="icon-btn" onClick={() => { setSelectedNode(null); setIsExpanded(false); }} title="Close Diff View">
                    <X size={16} />
                  </button>
                </div>
                <span style={{ fontFamily: 'monospace', color: '#aaa', marginLeft: 'auto' }}>{selectedNode.path}</span>
              </div>
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <DiffViewer
                  leftPathBase={leftPath}
                  rightPathBase={rightPath}
                  relPath={selectedNode.path}
                  config={config}
                  initialMode={diffMode}
                  onModeChange={setDiffMode}
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

      {/* Modals */}
      <BrowseModal
        isOpen={browseState.isOpen}
        onClose={() => setBrowseState({ ...browseState, isOpen: false })}
        onSelect={handleBrowseSelect}
        initialPath={
          (browseState.target === 'import-exclude-folders' && config?.ignoreFoldersPath) ? config.ignoreFoldersPath :
            (browseState.target === 'import-exclude-files' && config?.ignoreFilesPath) ? config.ignoreFilesPath :
              (browseState.target === 'right') ? rightPath : leftPath
        }
        title={
          browseState.target === 'import-exclude-folders' ? 'Select Exclude Folder List' :
            browseState.target === 'import-exclude-files' ? 'Select Exclude File List' :
              `Browse ${browseState.target === 'left' ? 'Left' : 'Right'} Folder`
        }
        mode={browseState.mode}
        restrictTo={
          (browseState.target === 'import-exclude-folders' && config?.ignoreFoldersPath) ? config.ignoreFoldersPath :
            (browseState.target === 'import-exclude-files' && config?.ignoreFilesPath) ? config.ignoreFilesPath :
              undefined
        }
        submitLabel={browseState.target?.includes('import') ? 'Import' : undefined}
      />
      <HistoryModal
        isOpen={historyState.isOpen}
        onClose={() => setHistoryState({ isOpen: false, side: null })}
        onSelect={handleHistorySelect}
        side={historyState.side}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => {
          if (confirmState.action) confirmState.action();
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        isAlert={confirmState.isAlert}
      />
      {
        aboutOpen && (
          <div className="modal-overlay" onClick={() => setAboutOpen(false)}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3>About</h3>
                <button className="icon-btn" onClick={() => setAboutOpen(false)}><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ textAlign: 'center', padding: '20px' }}>
                <h2 style={{ marginBottom: '10px' }}>J-Folder Merge</h2>
                <p style={{ color: '#888', marginBottom: '20px' }}>React Beta Port</p>
                <p>By: Juitem JoonWoo Kim</p>
                <p><a href="mailto:juitem@gmail.com" style={{ color: '#646cff' }}>juitem@gmail.com</a></p>
                <p style={{ marginTop: '10px' }}><a href="https://github.com/juitem/JFolderMerge" target="_blank" style={{ color: '#646cff' }}>GitHub Repository</a></p>
              </div>
              <div className="modal-footer">
                <button className="primary-btn" onClick={() => setAboutOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  )
}

export default App
