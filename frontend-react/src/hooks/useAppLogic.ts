import { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import type { FileNode } from '../types';
import { useConfig } from '../contexts/ConfigContext';
import { useTreeData } from './logic/useTreeData';
import { useModalLogic } from './logic/useModalLogic';
import { useViewState } from './logic/useViewState';
import { statsService } from '../services/logic/StatsService';
import { fileMutationService } from '../services/logic/FileMutationService';
import { loggingService } from '../services/infrastructure/LoggingService';

export const useAppLogic = () => {
    // Global Config
    const { config, saveConfig, loading: configLoading, error: configError } = useConfig();

    // Sub-Hooks
    const viewState = useViewState();
    const modalState = useModalLogic();

    // Path State
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
    const [selectionSet, setSelectionSet] = useState<Set<string>>(new Set());

    const toggleSelectionBatch = (paths: string[]) => {
        setSelectionSet(prev => {
            const next = new Set(prev);
            paths.forEach(path => {
                if (next.has(path)) next.delete(path);
                else next.add(path);
            });
            return next;
        });
    };

    const toggleSelection = (path: string) => {
        setSelectionSet(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const selectByStatus = (status: 'added' | 'removed' | 'modified') => {
        if (!treeData) return;
        const paths = new Set<string>();
        const traverse = (node: FileNode) => {
            if (node.type === 'file' && node.status === status) {
                paths.add(node.path);
            }
            node.children?.forEach(traverse);
        };
        traverse(treeData);
        setSelectionSet(paths);
        loggingService.info('AppLogic', `Selected ${paths.size} items with status: ${status}`);
    };

    const clearSelection = () => {
        setSelectionSet(new Set());
        setExplicitSelectionMode(false);
    };

    const [isExplicitSelectionMode, setExplicitSelectionMode] = useState(false);


    // Reload Handler
    const handleReload = () => {
        loggingService.info('AppLogic', 'Manual Refresh Triggered');
        compare(lPath, rPath, viewState.excludeFiles, viewState.excludeFolders);
    };

    // -- Effects --
    const configInitialized = useRef(false);

    // Initialize paths from config
    useEffect(() => {
        if (config && !configInitialized.current) {
            configInitialized.current = true;
            if (config.left) setLPath(config.left);
            if (config.right) setRPath(config.right);
            // Force folder view initially (regardless of saved pref) as no file is selected
            viewState.setLayoutMode('folder');
        }
    }, [config, viewState.setLayoutMode]);

    const prevSelectedNodePath = useRef<string | null>(null);

    // Sync selectedNode
    useEffect(() => {
        if (!treeData || !selectedNode) {
            prevSelectedNodePath.current = null;
            return;
        }
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
    }, [treeData, selectedNode]);

    // Auto-switch to split view when file selected (Dynamic Behavior)
    useEffect(() => {
        if (!viewState.isLocked) {
            const currentPath = selectedNode?.path || null;
            // Only auto-switch if the selected node actually changed (null -> path or path -> null)
            if (currentPath !== prevSelectedNodePath.current) {
                if (currentPath && viewState.layoutMode === 'folder') {
                    viewState.setLayoutMode('split');
                } else if (!currentPath && viewState.layoutMode !== 'folder') {
                    viewState.setLayoutMode('folder');
                }
                prevSelectedNodePath.current = currentPath;
            }
        }
    }, [selectedNode, viewState.isLocked, viewState.layoutMode, viewState.setLayoutMode]);

    // View Cycle Shortcut (v)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase()) || (e.target as HTMLElement).isContentEditable) {
                return;
            }

            if (e.key.toLowerCase() === 'v' || e.code === 'KeyV') {
                e.preventDefault();
                e.stopPropagation();

                const modes: ('folder' | 'split' | 'file')[] = ['folder', 'split', 'file'];
                const current = viewState.layoutMode || 'split';
                const currentIndex = modes.indexOf(current);

                let nextIndex;
                if (e.shiftKey) {
                    nextIndex = (currentIndex - 1 + modes.length) % modes.length;
                } else {
                    nextIndex = (currentIndex + 1) % modes.length;
                }
                viewState.setLayoutMode(modes[nextIndex]);
                loggingService.info('AppLogic', `Layout mode cycled to: ${modes[nextIndex]}`);
            }
        };
        window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to ensure it works even if children have listeners
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [viewState.layoutMode, viewState.setLayoutMode]);

    // Help Shortcut (? / F1)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase()) || (e.target as HTMLElement).isContentEditable) {
                return;
            }
            if (e.key === '?' || e.key === 'F1') {
                e.preventDefault();
                e.stopPropagation();
                modalState.setHelpOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [modalState.setHelpOpen]);

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
        viewState.setLayoutMode('folder'); // Reset layout to folder view
        compare(lPath, rPath, viewState.excludeFiles, viewState.excludeFolders);
        if (config) {
            saveConfig({ ...config, left: lPath, right: rPath });
        }
    };

    const handleMerge = (node: FileNode, direction: 'left-to-right' | 'right-to-left') => {
        const performMerge = async () => {
            const originalStatus = node.status;
            try {
                patchNode(node.path, { status: 'same' });
                const src = direction === 'left-to-right' ? lPath + '/' + node.path : rPath + '/' + node.path;
                const dest = direction === 'left-to-right' ? rPath + '/' + node.path : lPath + '/' + node.path;
                await fileMutationService.mergeFile(src, dest, node.type === 'directory');
                loggingService.info('AppLogic', `Merge successful: ${node.path}`);
            } catch (e: any) {
                patchNode(node.path, { status: originalStatus });
                modalState.showAlert("Merge Failed", e.message);
                loggingService.error('AppLogic', `Merge failed: ${node.path}`, e);
            }
        };

        if (config?.viewOptions?.confirmMerge === false) {
            performMerge();
        } else {
            modalState.showConfirm('Confirm Merge', `Merge ${node.name}?`, performMerge);
        }
    };

    const handleDelete = (node: FileNode, side: 'left' | 'right') => {
        const performDelete = async () => {
            try {
                removeNode(node.path);
                const fullPath = (side === 'left' ? lPath : rPath) + '/' + node.path;
                await fileMutationService.deleteItem(fullPath);
                loggingService.info('AppLogic', `Delete successful: ${fullPath}`);
            } catch (e: any) {
                handleReload();
                modalState.showAlert("Delete Failed", e.message);
                loggingService.error('AppLogic', `Delete failed: ${node.path}`, e);
            }
        };

        if (config?.viewOptions?.confirmDelete === false) {
            performDelete();
        } else {
            modalState.showConfirm('Confirm Delete', `Delete ${node.name} from ${side}?`, performDelete);
        }
    };

    const executeBatchMerge = async (direction: 'left-to-right' | 'right-to-left') => {
        if (selectionSet.size === 0) return;
        const itemsToMerge: any[] = [];
        const traverse = (node: FileNode) => {
            if (selectionSet.has(node.path)) {
                const src = direction === 'left-to-right' ? lPath + '/' + node.path : rPath + '/' + node.path;
                const dest = direction === 'left-to-right' ? rPath + '/' + node.path : lPath + '/' + node.path;
                itemsToMerge.push({ src, dest, isDir: node.type === 'directory', path: node.path });
            }
            node.children?.forEach(traverse);
        };
        if (treeData) traverse(treeData);

        if (itemsToMerge.length === 0) return;

        const performBatch = async () => {
            loggingService.info('AppLogic', `Executing batch merge for ${itemsToMerge.length} items`);
            const results = await fileMutationService.mergeBatch(itemsToMerge);
            const failed = results.filter(r => !r.success);

            // Update UI for successful ones
            results.filter(r => r.success).forEach(r => patchNode(r.path, { status: 'same' }));

            if (failed.length > 0) {
                modalState.showAlert("Batch Merge Partially Failed", `${failed.length} items failed to merge. Check logs for details.`);
            } else {
                modalState.showAlert("Batch Merge Complete", `Successfully merged ${itemsToMerge.length} items.`);
                setSelectionSet(new Set());
            }
        };

        if (config?.viewOptions?.confirmMerge === false) {
            performBatch();
        } else {
            modalState.showConfirm('Confirm Batch Merge', `Merge all ${itemsToMerge.length} selected items?`, performBatch);
        }
    };

    const executeBatchDelete = async (side: 'left' | 'right') => {
        if (selectionSet.size === 0) return;
        const pathsToDelete: string[] = [];
        const nodePathsInRange: string[] = [];

        const traverse = (node: FileNode) => {
            if (selectionSet.has(node.path)) {
                pathsToDelete.push((side === 'left' ? lPath : rPath) + '/' + node.path);
                nodePathsInRange.push(node.path);
            }
            node.children?.forEach(traverse);
        };
        if (treeData) traverse(treeData);

        if (pathsToDelete.length === 0) return;

        const performBatch = async () => {
            loggingService.info('AppLogic', `Executing batch delete for ${pathsToDelete.length} items`);
            const results = await fileMutationService.deleteBatch(pathsToDelete);
            const failed = results.filter(r => !r.success);

            // Reload tree to be safe after bulk delete if many successes
            if (results.some(r => r.success)) {
                handleReload();
            }

            if (failed.length > 0) {
                modalState.showAlert("Batch Delete Partially Failed", `${failed.length} items failed to delete.`);
            } else {
                modalState.showAlert("Batch Delete Complete", `Successfully deleted ${pathsToDelete.length} items.`);
                setSelectionSet(new Set());
            }
        };

        if (config?.viewOptions?.confirmDelete === false) {
            performBatch();
        } else {
            modalState.showConfirm('Confirm Batch Delete', `Delete all ${pathsToDelete.length} selected items from ${side}?`, performBatch);
        }
    };

    const handleBrowseSelect = async (path: string) => {
        if (modalState.browseState.target === 'left') setLPath(path);
        else if (modalState.browseState.target === 'right') setRPath(path);
        else if (modalState.browseState.target?.includes('exclude')) {
            try {
                const data = await api.fetchFileContent(path);
                if (data?.content) {
                    const lines = data.content.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l && !l.startsWith('#')).join(', ');
                    if (modalState.browseState.target.includes('folders')) viewState.setExcludeFolders(lines);
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

    useEffect(() => {
        setGlobalStats(statsService.calculateGlobal(treeData));
    }, [treeData]);

    useEffect(() => {
        if (!treeData || !selectedNode) { setCurrentFolderStats(null); return; }
        let parentStats = { added: 0, removed: 0, modified: 0 };
        let found = false;
        const traverse = (node: FileNode): boolean => {
            if (node.children?.some((c: FileNode) => c.path === selectedNode.path)) {
                parentStats = statsService.calculateFolder(node);
                found = true;
                return true;
            }
            return node.children?.some(traverse) ?? false;
        };
        if (treeData.children?.some((c: FileNode) => c.path === selectedNode.path)) {
            parentStats = statsService.calculateFolder(treeData);
            found = true;
        } else {
            traverse(treeData);
        }
        setCurrentFolderStats(found ? parentStats : null);
    }, [treeData, selectedNode]);

    // -- Context Menu Logic --
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: any[] } | null>(null);

    const closeContextMenu = () => setContextMenu(null);

    const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
        e.preventDefault();
        e.stopPropagation();

        const items = [
            {
                label: 'Merge to Right',
                onClick: () => handleMerge(node, 'left-to-right'),
                disabled: node.status === 'same' || (node.status === 'added' && config?.viewOptions?.folderViewMode !== 'unified')
            },
            {
                label: 'Merge to Left',
                onClick: () => handleMerge(node, 'right-to-left'),
                disabled: node.status === 'same' || (node.status === 'removed' && config?.viewOptions?.folderViewMode !== 'unified')
            },
            { separator: true },
            {
                label: 'Delete from Left',
                onClick: () => handleDelete(node, 'left'),
                disabled: node.status === 'added'
            },
            {
                label: 'Delete from Right',
                onClick: () => handleDelete(node, 'right'),
                disabled: node.status === 'removed'
            },
            { separator: true },
            {
                label: 'Open Containing Folder (Left)',
                onClick: () => api.openPath(lPath + "/" + node.path), // Basic implementation, might need path adjustment if node is root
            },
            {
                label: 'Open Containing Folder (Right)',
                onClick: () => api.openPath(rPath + "/" + node.path),
            }
        ];

        // Filter actions based on existence?
        // Open Folder should probably open the PARENT folder, selecting the file if possible.
        // api.openPath implementation uses 'open/explorer' which usually opens the file if it's a file, or folder if folder.
        // User asked for "Open Folder". If I pass file path to 'open -R' (mac) it reveals.
        // My backend open_path implementation does generic 'open'.
        // On Mac 'open /path/to/file' opens the file. 'open -R' reveals.
        // But for now, let's keep it simple or adjust backend later. 
        // Better: Open the PARENT directory.

        const parentPathLeft = (lPath + "/" + node.path).substring(0, (lPath + "/" + node.path).lastIndexOf('/'));
        const parentPathRight = (rPath + "/" + node.path).substring(0, (rPath + "/" + node.path).lastIndexOf('/'));

        const smartItems = [
            {
                label: 'Reveal in Finder/Explorer (Left)',
                onClick: () => api.openPath(node.type === 'directory' ? lPath + "/" + node.path : parentPathLeft),
                disabled: node.status === 'added' // Not on left
            },
            {
                label: 'Reveal in Finder/Explorer (Right)',
                onClick: () => api.openPath(node.type === 'directory' ? rPath + "/" + node.path : parentPathRight),
                disabled: node.status === 'removed' // Not on right
            }
        ];


        setContextMenu({ x: e.clientX, y: e.clientY, items: [...items.slice(0, 5), { separator: true }, ...smartItems] });
    };

    const handleSetExternalEditor = (path: string) => {
        // Placeholder for external editor setting if needed
        console.log("Set External Editor", path);
    };

    const handleOpenExternal = (node: FileNode) => {
        api.openExternal(lPath + '/' + node.path, rPath + '/' + node.path);
    };

    return {
        config, configLoading, configError,
        treeData, compareLoading, compareError,
        leftPath: lPath, setLeftPath: setLPath,
        rightPath: rPath, setRightPath: setRPath,
        selectedNode, setSelectedNode,
        selectionSet, toggleSelection, toggleSelectionBatch, selectByStatus, clearSelection,
        isExplicitSelectionMode, setExplicitSelectionMode,
        executeBatchMerge, executeBatchDelete,
        globalStats, currentFolderStats, fileLineStats,
        updateFileLineStats: (a: number, r: number, g: number) => setFileLineStats({ added: a, removed: r, groups: g }),
        patchNode, removeNode,
        ...viewState,
        ...modalState,
        handleSaveSettings, handleResetSettings,
        onCompare, handleMerge, handleDelete,
        handleBrowseSelect, handleHistorySelect,
        handleSwap, handleReload,
        toggleViewOption: useConfig().toggleViewOption,
        openBrowse: modalState.openBrowse,
        hiddenPaths: viewState.hiddenPaths,
        toggleHiddenPath: viewState.toggleHiddenPath,
        showHidden: viewState.showHidden,
        toggleShowHidden: viewState.toggleShowHidden,

        // Context Menu
        contextMenu,
        handleContextMenu,
        closeContextMenu,
        handleSetExternalEditor,
        handleOpenExternal,
        externalEditorPath: 'default'
    };
};

