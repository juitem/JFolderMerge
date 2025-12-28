import { useEffect, useState } from 'react'
import './App.css'
import { api } from './api'
import type { Config, FileNode, DiffMode } from './types'
import { FolderTree } from './components/FolderTree'
import { DiffViewer } from './components/DiffViewer'
import { BrowseModal } from './components/BrowseModal'
import { HistoryModal } from './components/HistoryModal'
import ConfirmModal from './components/ConfirmModal';
import {
  Save, Info, History, FolderOpen, Play,
  FileDiff, ArrowRightLeft, X, Upload, Maximize, Minimize,
  AlignJustify, Columns, FileCode, Folder, FileText, Layout
} from 'lucide-react'

function App() {
  const [config, setConfig] = useState<Config | null>(null)
  const [leftPath, setLeftPath] = useState("")
  const [rightPath, setRightPath] = useState("")

  // App State
  const [treeData, setTreeData] = useState<FileNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [diffMode, setDiffMode] = useState<DiffMode>('side-by-side');

  // Modals
  /* Confirm Modal State */
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
    isAlert?: boolean;
  }>({ isOpen: false, title: '', message: '', action: null, isAlert: false });

  const showAlert = (title: string, message: string) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      action: null,
      isAlert: true
    });
  };

  /* Other Modals */
  const [browseState, setBrowseState] = useState<{
    isOpen: boolean,
    target: 'left' | 'right' | 'import-exclude-folders' | 'import-exclude-files' | null,
    mode: 'file' | 'directory'
  }>({ isOpen: false, target: null, mode: 'directory' });
  /* History State replaced simple boolean with object */
  const [historyState, setHistoryState] = useState<{ isOpen: boolean, side: 'left' | 'right' | null }>({ isOpen: false, side: null });
  const [aboutOpen, setAboutOpen] = useState(false);

  // Search & Exclude - Local State before save/search
  const [searchQuery, setSearchQuery] = useState("");
  const [excludeFolders, setExcludeFolders] = useState("");
  const [excludeFiles, setExcludeFiles] = useState("");

  useEffect(() => {
    api.fetchConfig().then(cfg => {
      if (cfg) {
        setConfig(cfg);
        // Config defaults might be overridden if backend was updated with args
        if (cfg.left) setLeftPath(cfg.left);
        if (cfg.right) setRightPath(cfg.right);
        if (cfg.savedExcludes) {
          setExcludeFolders(cfg.savedExcludes.folders || "");
          setExcludeFiles(cfg.savedExcludes.files || "");
        }
      } else {
        setError("Failed to load config (API Unreachable or Error)");
      }
    }).catch(e => setError("Failed to load config: " + e.message));
  }, [])

  const handleSaveSettings = async () => {
    if (!config) return;
    try {
      const toSave = {
        ...config,
        savedExcludes: {
          folders: excludeFolders,
          files: excludeFiles
        }
      };
      await api.saveConfig(toSave);
      showAlert("Settings Saved", "Configuration has been saved successfully.");
    } catch (e: any) {
      showAlert("Save Failed", "Failed to save: " + e.message);
    }
  };

  const handleCompare = async () => {
    setLoading(true);
    setError("");
    setSelectedNode(null);
    try {
      // Save History
      await api.addToHistory(leftPath, rightPath);

      // Parse Excludes
      const exFiles = excludeFiles.split(',').map(s => s.trim()).filter(Boolean);
      const exFolders = excludeFolders.split(',').map(s => s.trim()).filter(Boolean);

      const data = await api.compareFolders(leftPath, rightPath, exFiles, exFolders);
      setTreeData(data); // Root Node
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (node: FileNode) => {
    setSelectedNode(node);
  };

  const handleMerge = (node: FileNode, direction: 'left-to-right' | 'right-to-left') => {
    setConfirmState({
      isOpen: true,
      title: 'Confirm Merge',
      message: `Are you sure you want to merge (copy) ${node.name} from ${direction === 'left-to-right' ? 'Left to Right' : 'Right to Left'}? This will overwrite the destination.`,
      action: async () => {
        try {
          const src = direction === 'left-to-right' ? `${leftPath}/${node.path}` : `${rightPath}/${node.path}`;
          const dest = direction === 'left-to-right' ? `${rightPath}/${node.path}` : `${leftPath}/${node.path}`;
          const isDir = node.type === 'directory';

          await api.copyItem(src, dest, isDir);
          handleCompare(); // Refresh
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
          const path = side === 'left' ? `${leftPath}/${node.path}` : `${rightPath}/${node.path}`;
          await api.deleteItem(path);
          handleCompare();
        } catch (e: any) {
          showAlert("Delete Failed", e.message);
        }
      }
    });
  };

  const toggleFilter = (key: string) => {
    if (!config) return;
    const currentFilters = config.folderFilters || {};
    const newFilters = { ...currentFilters, [key]: !currentFilters[key] };
    setConfig({ ...config, folderFilters: newFilters });
    // api.saveConfig({ folderFilters: newFilters }); // Auto-save behavior or wait for manual save? Legacy auto-saved? Check legacy. Legacy loaded from state.
    // Legacy: checkbox change -> state -> applyFilters. Save btn -> save.
    // So distinct.
    // But here we update config state.
  };

  const toggleDiffFilter = (key: string) => {
    if (!config) return;
    const currentFilters = config.diffFilters || { same: false, modified: true, added: true, removed: true }; // Default diff filters
    const newFilters = { ...currentFilters, [key]: !currentFilters[key] };
    setConfig({ ...config, diffFilters: newFilters });
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
      // Load file content
      try {
        const data = await api.fetchFileContent(path);
        if (data && data.content) {
          const lines = data.content.split(/\r?\n/)
            .map((l: string) => l.trim())
            .filter((l: string) => l && !l.startsWith('#'))
            .join(', ');

          if (browseState.target === 'import-exclude-folders') setExcludeFolders(lines);
          else setExcludeFiles(lines);

          // alert("Imported successfully!"); // Optional feedbaack
        }
      } catch (e: any) {
        showAlert("Import Failed", e.message);
      }
    }
  };

  const handleHistorySelect = (left: string, right?: string) => {
    if (historyState.side === 'left') {
      setLeftPath(left);
    } else if (historyState.side === 'right') {
      setRightPath(left);
    } else if (right) {
      // Global selection
      setLeftPath(left);
      setRightPath(right);
    }
  };

  const openHistory = (side: 'left' | 'right') => {
    setHistoryState({ isOpen: true, side });
  };

  const handleSwap = () => {
    const temp = leftPath;
    setLeftPath(rightPath);
    setRightPath(temp);
  };

  if (error) return <div className="error-banner center-screen">{error}</div>;
  if (!config) return <div className="loading center-screen">Loading Config...</div>;

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





      {/* Toolbar */}
      <div className="toolbar compact-toolbar">
        <div className="filter-group">
          <Folder size={16} className="filter-icon" />

          <label className="checkbox-container" title="Show Added">
            <input type="checkbox" checked={config.folderFilters?.added ?? true} onChange={() => toggleFilter('added')} />
            <span className="checkmark added"></span>
          </label>
          <label className="checkbox-container" title="Show Removed">
            <input type="checkbox" checked={config.folderFilters?.removed ?? true} onChange={() => toggleFilter('removed')} />
            <span className="checkmark removed"></span>
          </label>
          <label className="checkbox-container" title="Show Modified">
            <input type="checkbox" checked={config.folderFilters?.modified ?? true} onChange={() => toggleFilter('modified')} />
            <span className="checkmark modified"></span>
          </label>
          <label className="checkbox-container" title="Show Same">
            <input type="checkbox" checked={config.folderFilters?.same ?? true} onChange={() => toggleFilter('same')} />
            <span className="checkmark same"></span>
          </label>
        </div>

        <div className="separator"></div>

        <div className="filter-group">
          <FileText size={16} className="filter-icon" />

          <label className="checkbox-container" title="Show Added Lines">
            <input type="checkbox" checked={config.diffFilters?.added ?? true} onChange={() => toggleDiffFilter('added')} />
            <span className="checkmark added"></span>
          </label>
          <label className="checkbox-container" title="Show Removed Lines">
            <input type="checkbox" checked={config.diffFilters?.removed ?? true} onChange={() => toggleDiffFilter('removed')} />
            <span className="checkmark removed"></span>
          </label>
          <label className="checkbox-container" title="Show Modified Lines">
            <input type="checkbox" checked={config.diffFilters?.modified ?? true} onChange={() => toggleDiffFilter('modified')} />
            <span className="checkmark modified"></span>
          </label>
          <label className="checkbox-container" title="Show Same Lines">
            <input type="checkbox" checked={config.diffFilters?.same ?? false} onChange={() => toggleDiffFilter('same')} />
            <span className="checkmark same"></span>
          </label>
        </div>



        <div className="separator"></div>

        {/* View Mode Toggles (Moved from DiffViewer) */}
        <div className="filter-group" style={{ gap: '2px' }}>

          <button
            className={`icon-btn ${diffMode === 'unified' ? 'active' : ''}`}
            onClick={() => setDiffMode('unified')}
            title="Unified View"
          >
            <AlignJustify size={16} />
          </button>
          <button
            className={`icon-btn ${diffMode === 'side-by-side' ? 'active' : ''}`}
            onClick={() => setDiffMode('side-by-side')}
            title="Side-by-Side View"
          >
            <Columns size={16} />
          </button>
          <button
            className={`icon-btn ${diffMode === 'combined' ? 'active' : ''}`}
            onClick={() => setDiffMode('combined')}
            title="Combined View (Unified + Side-by-Side)"
          >
            <Layout size={16} />
          </button>
          <button
            className={`icon-btn ${diffMode === 'raw' ? 'active' : ''}`}
            onClick={() => setDiffMode('raw')}
            title="Raw Content View"
          >
            <FileCode size={16} />
          </button>
        </div>

        <div className="separator"></div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#eee' }}
          />
        </div>

        <div className="separator"></div>

        <div className="excludes-box" style={{ display: 'flex', gap: '5px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Excl. Folders"
              value={excludeFolders}
              onChange={e => setExcludeFolders(e.target.value)}
              title="Exclude Folders (comma separated)"
              style={{ width: '100px', padding: '4px 8px', paddingRight: '24px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#eee', fontSize: '0.8rem' }}
            />
            <button
              onClick={() => openBrowse('import-exclude-folders')}
              style={{ position: 'absolute', right: '2px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' }}
              title="Import Ignore Folders List"
            >
              <Upload size={14} />
            </button>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Excl. Files"
              value={excludeFiles}
              onChange={e => setExcludeFiles(e.target.value)}
              title="Exclude Files (comma separated)"
              style={{ width: '100px', padding: '4px 8px', paddingRight: '24px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#222', color: '#eee', fontSize: '0.8rem' }}
            />
            <button
              onClick={() => openBrowse('import-exclude-files')}
              style={{ position: 'absolute', right: '2px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' }}
              title="Import Ignore Files List"
            >
              <Upload size={14} />
            </button>
          </div>
        </div>


        <button className="primary-btn compare-btn" onClick={handleCompare} disabled={loading} style={{ marginLeft: 'auto' }}>
          <Play size={16} style={{ marginRight: '6px' }} />
          {loading ? 'Running...' : 'Compare'}
        </button>
      </div>

      {/* Controls Bar (Moved Here) */}
      <div className="controls-bar glass-panel" style={{ margin: '0 20px', borderRadius: '0 0 6px 6px', borderTop: 'none' }}>
        <div className="path-group">
          <div className="input-wrapper">
            <input value={leftPath} onChange={e => setLeftPath(e.target.value)} placeholder="/path/to/left" />
            <button className="inner-btn" title="Recent Left Paths" onClick={() => openHistory('left')}><History size={14} /></button>
            <button className="inner-btn" title="Browse" onClick={() => openBrowse('left')}><FolderOpen size={14} /></button>
          </div>
        </div>

        <button className="icon-btn" onClick={handleSwap} title="Swap Paths">
          <ArrowRightLeft size={16} />
        </button>

        <div className="path-group">
          <div className="input-wrapper">
            <input value={rightPath} onChange={e => setRightPath(e.target.value)} placeholder="/path/to/right" />
            <button className="inner-btn" title="Recent Right Paths" onClick={() => openHistory('right')}><History size={14} /></button>
            <button className="inner-btn" title="Browse" onClick={() => openBrowse('right')}><FolderOpen size={14} /></button>
          </div>
        </div>
      </div>

      <div className="main-content split-view">
        {/* Left Panel: Tree */}
        <div className="left-panel custom-scroll" style={{ flex: isExpanded ? '0 0 0' : '1', overflow: 'hidden', padding: isExpanded ? 0 : '', border: isExpanded ? 'none' : '' }}>
          {treeData && (
            <FolderTree
              root={treeData}
              leftPath={leftPath}
              rightPath={rightPath}
              config={config}
              onSelect={handleSelect}
              onMerge={handleMerge}
              onDelete={handleDelete}
              searchQuery={searchQuery}
            />
          )}
        </div>

        {/* Right Panel: Diff */}
        <div className={`right-panel custom-scroll ${selectedNode ? 'open' : ''}`} style={{ width: isExpanded ? '100%' : undefined }}>
          {selectedNode ? (
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
          // Smart defaults for browsing based on config
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
    </div >
  )
}

export default App
