import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import type { FileNode } from '../types';
import { useConfig } from '../contexts/ConfigContext';
import { useTreeData } from './logic/useTreeData';
import { useFileSystem } from './useFileSystem';
import { useModalLogic } from './logic/useModalLogic';
import { useViewState } from './logic/useViewState';

export const useAppLogic = () => {
    // Global Config
    const { config, loading: configLoading, error: configError, saveConfig } = useConfig();

    // Sub-Hooks
    const viewState = useViewState();
    const modalState = useModalLogic();

    // Path State (Local, managed by AppLogic as the conductor)
    const [lPath, setLPath] = useState("");
    const [rPath, setRPath] = useState("");

    // Tree Data
    const {
        treeData,
        loading: compareLoading,
        error: compareError,
        compare,
        patchNode,
        removeNode
    } = useTreeData();

    // Selection State
    const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);

    // File System Hook
    const handleReload = () => {
        compare(lPath, rPath, viewState.excludeFiles, viewState.excludeFolders);
    };
    const { copyItem, deleteItem } = useFileSystem(handleReload);

    // -- Effects --
    const configInitialized = useRef(false);

    // Initialize paths from config
    useEffect(() => {
        if (config && !configInitialized.current) {
            configInitialized.current = true;
            if (config.left) setLPath(config.left);
            if (config.right) setRPath(config.right);
            // Other view state initialization handled inside useViewState
        }
    }, [config]);

    // Sync selectedNode (Re-implementation of existing logic)
    useEffect(() => {
        if (!treeData || !selectedNode) return;
        const findNodeByPath = (node: FileNode, path: string): FileNode | null => {
            if (node.path === path) return node;
            if (node.children) {
                for (const child of node.children) {
                    const found = findNodeByPath(child, path);
                    if (found) return found;
                }
            }
            return null;
        };
        const updatedNode = findNodeByPath(treeData, selectedNode.path);
        if (updatedNode && updatedNode !== selectedNode) {
            setSelectedNode(updatedNode);
        }
    }, [treeData]);

    // -- Handlers --

    const handleSaveSettings = async () => {
        if (!config) return;
        try {
            const mode = (config.viewOptions?.folderViewMode as string) || 'split';
            const widthKey = `leftPanelWidth_${mode}`;
            const toSave = {
                ...config,
                left: lPath,
                right: rPath,
                savedExcludes: {
                    folders: viewState.excludeFolders,
                    files: viewState.excludeFiles
                },
                viewOptions: {
                    ...config.viewOptions,
                    diffMode: viewState.diffMode,
                    [widthKey]: viewState.leftPanelWidth
                }
            };
            await saveConfig(toSave);
            modalState.showAlert("Settings Saved", "Configuration has been saved successfully.");
        } catch (e: any) {
            modalState.showAlert("Save Failed", "Failed to save: " + e.message);
        }
    };

    const handleResetSettings = async () => {
        if (!confirm("Are you sure you want to reset all settings to default?")) return;

        try {
            // Reset local state via hooks
            viewState.setExcludeFolders("");
            viewState.setExcludeFiles("");
            viewState.setLeftPanelWidth(50);
            viewState.setDiffMode('side-by-side');

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
            modalState.showAlert("Settings Reset", "All settings reset to default.");
        } catch (e: any) {
            modalState.showAlert("Reset Failed", e.message);
        }
    };

    const onCompare = () => {
        setSelectedNode(null);
        compare(lPath, rPath, viewState.excludeFiles, viewState.excludeFolders);
        if (config) {
            saveConfig({ ...config, left: lPath, right: rPath });
        }
    };

    const handleMerge = (node: FileNode, direction: 'left-to-right' | 'right-to-left') => {
        const skipConfirm = config?.viewOptions?.confirmMerge === false;
        if (skipConfirm) {
            copyItem(node, direction, lPath, rPath).catch(e => modalState.showAlert("Merge Failed", e.message));
            return;
        }
        modalState.showConfirm(
            'Confirm Merge',
            `Are you sure you want to merge (copy) ${node.name}?`,
            async () => {
                try { await copyItem(node, direction, lPath, rPath); }
                catch (e: any) { modalState.showAlert("Merge Failed", e.message); }
            }
        );
    };

    const handleDelete = (node: FileNode, side: 'left' | 'right') => {
        const skipConfirm = config?.viewOptions?.confirmDelete === false;
        if (skipConfirm) {
            deleteItem(node, side, lPath, rPath).catch(e => modalState.showAlert("Delete Failed", e.message));
            return;
        }
        modalState.showConfirm(
            'Confirm Delete',
            `Delete ${node.name} from ${side}?`,
            async () => {
                try { await deleteItem(node, side, lPath, rPath); }
                catch (e: any) { modalState.showAlert("Delete Failed", e.message); }
            }
        );
    };

    const handleBrowseSelect = async (path: string) => {
        if (modalState.browseState.target === 'left') setLPath(path);
        else if (modalState.browseState.target === 'right') setRPath(path);
        else if (modalState.browseState.target === 'import-exclude-folders' || modalState.browseState.target === 'import-exclude-files') {
            try {
                const data = await api.fetchFileContent(path);
                if (data && data.content) {
                    const lines = data.content.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l && !l.startsWith('#')).join(', ');
                    if (modalState.browseState.target === 'import-exclude-folders') viewState.setExcludeFolders(lines);
                    else viewState.setExcludeFiles(lines);
                }
            } catch (e: any) {
                modalState.showAlert("Import Failed", e.message);
            }
        }
    };

    const handleHistorySelect = (left: string, right?: string) => {
        if (modalState.historyState.side === 'left') setLPath(left);
        else if (modalState.historyState.side === 'right') setRPath(left);
        else if (right) { setLPath(left); setRPath(right); }
    };

    const handleSwap = () => {
        const temp = lPath;
        setLPath(rPath);
        setRPath(temp);
    };

    // Stats Logic
    const [globalStats, setGlobalStats] = useState({ added: 0, removed: 0, modified: 0 });
    const [currentFolderStats, setCurrentFolderStats] = useState<{ added: number, removed: number, modified: number } | null>(null);
    const [fileLineStats, setFileLineStats] = useState<{ added: number, removed: number, groups: number } | null>(null);

    // Calculate Global Stats
    useEffect(() => {
        if (!treeData) { setGlobalStats({ added: 0, removed: 0, modified: 0 }); return; }
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

    // Calculate Current Folder Stats
    useEffect(() => {
        if (!treeData || !selectedNode) { setCurrentFolderStats(null); return; }

        let parentStats = { added: 0, removed: 0, modified: 0 };
        let found = false;
        const countStats = (n: FileNode) => {
            const s = { a: 0, r: 0, m: 0 };
            const _count = (nx: FileNode) => {
                if (nx.type === 'file') {
                    if (nx.status === 'added') s.a++;
                    if (nx.status === 'removed') s.r++;
                    if (nx.status === 'modified') s.m++;
                }
                nx.children?.forEach(_count);
            }
            _count(n);
            return { added: s.a, removed: s.r, modified: s.m };
        };

        const traverseToFindParent = (node: FileNode): boolean => {
            if (node.children?.some(c => c.path === selectedNode.path)) {
                parentStats = countStats(node);
                found = true;
                return true;
            }
            return node.children?.some(traverseToFindParent) ?? false;
        };

        if (treeData.children?.some(c => c.path === selectedNode.path)) {
            parentStats = countStats(treeData);
            found = true;
        } else {
            traverseToFindParent(treeData);
        }
        setCurrentFolderStats(found ? parentStats : null);

    }, [treeData, selectedNode]);

    const updateFileLineStats = (added: number, removed: number, groups: number) => {
        setFileLineStats({ added, removed, groups });
    };

    return {
        // Config
        config, configLoading, configError,

        // Tree & Comparison
        treeData, compareLoading, compareError,
        leftPath: lPath, setLeftPath: setLPath,
        rightPath: rPath, setRightPath: setRPath,

        // Selection
        selectedNode, setSelectedNode,

        // Stats
        globalStats, currentFolderStats, fileLineStats, updateFileLineStats,
        patchNode, removeNode,

        // Delegated State
        ...viewState, // isExpanded, isLocked, diffMode, leftPanelWidth, searchQuery, excludes...
        ...modalState, // confirmState, browseState, historyState, open/close methods...

        // Actions
        handleSaveSettings, handleResetSettings,
        onCompare, handleMerge, handleDelete,
        handleBrowseSelect, handleHistorySelect,
        handleSwap, handleReload,
        toggleViewOption: useConfig().toggleViewOption,

        // Remap openBrowse which might have different signature if needed
        openBrowse: modalState.openBrowse
    };
};
