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
            if (!leftPath && config.left) setLeftPath(config.left);
            if (!rightPath && config.right) setRightPath(config.right);
            if (!excludeFolders && config.savedExcludes?.folders) setExcludeFolders(config.savedExcludes.folders);
            if (!excludeFiles && config.savedExcludes?.files) setExcludeFiles(config.savedExcludes.files);
            if (config.viewOptions?.diffMode) setDiffMode(config.viewOptions.diffMode as DiffMode);
        }
    }, [config]);

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
        treeData,

        // Modal States
        confirmState, setConfirmState,
        browseState, setBrowseState,
        historyState, setHistoryState,

        // Actions
        handleSaveSettings,
        onCompare,
        handleMerge,
        handleDelete,
        openBrowse,
        handleBrowseSelect,
        handleHistorySelect,
        handleSwap
    };
};
