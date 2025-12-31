import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import type { FileNode, DiffMode } from '../types';
import { useConfig } from '../contexts/ConfigContext';
import { useFolderCompare } from './useFolderCompare';
import { useFileSystem } from './useFileSystem';

export const useAppLogic = () => {
    // Global Config
    const { config, loading: configLoading, error: configError, saveConfig } = useConfig();

    // Local State
    const [leftPath, setLeftPath] = useState("");
    const [rightPath, setRightPath] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [excludeFolders, setExcludeFolders] = useState("");
    const [excludeFiles, setExcludeFiles] = useState("");
    const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [diffMode, setDiffMode] = useState<DiffMode>('side-by-side');
    const [aboutOpen, setAboutOpen] = useState(false);
    const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Default 50% for split

    // Modal States
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

    // Compare Hook
    const { treeData, loading: compareLoading, error: compareError, compare } = useFolderCompare();

    // Reload Action
    const handleReload = () => {
        compare(leftPath, rightPath, excludeFiles, excludeFolders);
    };

    // File System Hook
    const { copyItem, deleteItem } = useFileSystem(handleReload);

    // -- Effects --

    const configInitialized = useRef(false);

    // Initialize paths from config (Run once when config loads)
    useEffect(() => {
        if (config && !configInitialized.current) {
            configInitialized.current = true;
            // Always set from config on first load, even if local state was temporarily typed into
            if (config.left) setLeftPath(config.left);
            if (config.right) setRightPath(config.right);

            if (config.savedExcludes?.folders) setExcludeFolders(config.savedExcludes.folders);
            if (config.savedExcludes?.files) setExcludeFiles(config.savedExcludes.files);
            if (config.viewOptions?.diffMode) setDiffMode(config.viewOptions.diffMode as DiffMode);

            // Initial Width Load logic is handled by the mode-watcher effect below, 
            // but we need to ensure it runs at least once. 
            // The effect below has [config?.viewOptions?.folderViewMode] dependency, so it will run when config loads.
        }
    }, [config]);

    // Mode-specific width persistence
    useEffect(() => {
        if (!config) return;
        const mode = (config.viewOptions?.folderViewMode as string) || 'split';
        const key = `leftPanelWidth_${mode}`;

        // Check if there is a saved width for this specific mode
        const savedWidth = config.viewOptions?.[key];

        if (savedWidth) {
            setLeftPanelWidth(Number(savedWidth));
        } else {
            // Defaults
            if (mode === 'unified') setLeftPanelWidth(20);
            else if (mode === 'split') setLeftPanelWidth(50);
            else setLeftPanelWidth(30);
        }
    }, [config?.viewOptions?.folderViewMode]);

    // -- Handlers --

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
            const mode = (config.viewOptions?.folderViewMode as string) || 'split';
            const widthKey = `leftPanelWidth_${mode}`;

            const toSave = {
                ...config,
                left: leftPath,
                right: rightPath,
                savedExcludes: {
                    folders: excludeFolders,
                    files: excludeFiles
                },
                viewOptions: {
                    ...config.viewOptions,
                    diffMode: diffMode,
                    [widthKey]: leftPanelWidth
                }
            };
            await saveConfig(toSave);
            showAlert("Settings Saved", "Configuration has been saved successfully.");
        } catch (e: any) {
            showAlert("Save Failed", "Failed to save: " + e.message);
        }
    };

    const handleResetSettings = async () => {
        if (!confirm("Are you sure you want to reset all settings to default?")) return;
        try {
            // Reset local state
            setExcludeFolders("");
            setExcludeFiles("");
            setLeftPanelWidth(50);
            setDiffMode('side-by-side');

            // Save cleared config
            const defaultConfig = {
                left: config?.left || "",
                right: config?.right || "",
                savedExcludes: { folders: "", files: "" },
                viewOptions: {
                    darkMode: true,
                    folderViewMode: 'split',
                    showLineNumbers: true,
                    diffMode: 'side-by-side',
                    leftPanelWidth_split: 50,
                    leftPanelWidth_unified: 20,
                    leftPanelWidth_flat: 30
                }
            };

            await api.saveConfig(defaultConfig);
            // Optionally reload? useConfig hook should update automatically.
            showAlert("Settings Reset", "All settings have been reset to default.");
        } catch (e: any) {
            showAlert("Reset Failed", "Failed to reset settings: " + e.message);
        }
    };

    const onCompare = () => {
        setSelectedNode(null);
        compare(leftPath, rightPath, excludeFiles, excludeFolders);

        // Auto-save paths as defaults (persisting the EXACT values used for comparison)
        if (config) {
            saveConfig({
                ...config,
                left: leftPath,
                right: rightPath
            });
        }
    };

    const handleMerge = (node: FileNode, direction: 'left-to-right' | 'right-to-left') => {
        const skipConfirm = config?.viewOptions?.confirmMerge === false;

        if (skipConfirm) {
            copyItem(node, direction, leftPath, rightPath).catch(e => showAlert("Merge Failed", e.message));
            return;
        }

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
        const skipConfirm = config?.viewOptions?.confirmDelete === false;

        if (skipConfirm) {
            deleteItem(node, side, leftPath, rightPath).catch(e => showAlert("Delete Failed", e.message));
            return;
        }

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
        else if (historyState.side === 'right') setRightPath(left);
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

    // --- Stats Calculation Logic ---
    const [globalStats, setGlobalStats] = useState<{ added: number, removed: number, modified: number }>({ added: 0, removed: 0, modified: 0 });
    const [currentFolderStats, setCurrentFolderStats] = useState<{ added: number, removed: number, modified: number } | null>(null);
    const [fileLineStats, setFileLineStats] = useState<{ added: number, removed: number, groups: number } | null>(null);

    // Calculate Global Stats when treeData changes
    useEffect(() => {
        if (!treeData) {
            setGlobalStats({ added: 0, removed: 0, modified: 0 });
            return;
        }

        const stats = { added: 0, removed: 0, modified: 0 };
        const traverse = (node: FileNode) => {
            if (node.type === 'file') {
                if (node.status === 'added') stats.added++;
                if (node.status === 'removed') stats.removed++;
                if (node.status === 'modified') stats.modified++;
            }
            if (node.children) node.children.forEach(traverse);
        };
        traverse(treeData);
        setGlobalStats(stats);
    }, [treeData]);

    // Calculate Current Folder Stats when selectedNode or treeData changes
    useEffect(() => {
        if (!treeData || !selectedNode) {
            setCurrentFolderStats(null);
            return;
        }

        // Find parent folder of selectedNode
        let parentStats = { added: 0, removed: 0, modified: 0 };
        let found = false;

        const traverseToFindParent = (node: FileNode): boolean => {
            if (node.children) {
                if (node.children.some(child => child.path === selectedNode.path)) {
                    const stats = { added: 0, removed: 0, modified: 0 };
                    const countStats = (n: FileNode) => {
                        if (n.type === 'file') {
                            if (n.status === 'added') stats.added++;
                            if (n.status === 'removed') stats.removed++;
                            if (n.status === 'modified') stats.modified++;
                        }
                        if (n.children) n.children.forEach(countStats);
                    };
                    countStats(node);
                    parentStats = stats;
                    found = true;
                    return true;
                }
                for (const child of node.children) {
                    if (traverseToFindParent(child)) return true;
                }
            }
            return false;
        };

        if (treeData.children?.some(c => c.path === selectedNode.path)) {
            const stats = { added: 0, removed: 0, modified: 0 };
            const countStats = (n: FileNode) => {
                if (n.type === 'file') {
                    if (n.status === 'added') stats.added++;
                    if (n.status === 'removed') stats.removed++;
                    if (n.status === 'modified') stats.modified++;
                }
                if (n.children) n.children.forEach(countStats);
            };
            countStats(treeData);
            parentStats = stats;
            found = true;
        } else {
            traverseToFindParent(treeData);
        }

        if (found) {
            setCurrentFolderStats(parentStats);
        } else {
            setCurrentFolderStats(null);
        }

    }, [treeData, selectedNode]);

    // Callback to update file line stats from DiffViewer
    const updateFileLineStats = (added: number, removed: number, groups: number) => {
        setFileLineStats({ added, removed, groups });
    };

    const handleAdjustWidth = (delta: number) => {
        setLeftPanelWidth(prev => {
            const next = prev + delta;
            // Clamp between 10% and 50%
            return Math.max(10, Math.min(50, next));
        });
    };

    // Return everything needed by UI
    return {
        // Config & Loading
        config, configLoading, configError,
        compareLoading, compareError,

        // State
        leftPath, setLeftPath,
        rightPath, setRightPath,
        searchQuery, setSearchQuery,
        excludeFolders, setExcludeFolders,
        excludeFiles, setExcludeFiles,
        selectedNode, setSelectedNode,
        isExpanded, setIsExpanded,
        diffMode, setDiffMode,
        aboutOpen, setAboutOpen,
        leftPanelWidth,
        treeData,

        // Modal States
        confirmState, setConfirmState,
        browseState, setBrowseState,
        historyState, setHistoryState,

        // Actions
        handleSaveSettings,
        handleResetSettings,
        onCompare,
        handleMerge,
        handleDelete,
        openBrowse,
        handleBrowseSelect,
        handleHistorySelect,
        handleSwap,
        handleReload,
        handleAdjustWidth,
        toggleViewOption: useConfig().toggleViewOption,

        // Stats
        globalStats,
        currentFolderStats,
        fileLineStats,
        updateFileLineStats
    };
};
