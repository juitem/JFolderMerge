import { useState, useEffect, useRef } from 'react';
import React from 'react';
import type { DiffMode } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';

export const useViewState = () => {
    const { config, saveConfig } = useConfig();

    // View Modes
    const [diffMode, setDiffMode] = useState<DiffMode>('side-by-side');
    const [layoutMode, setLayoutMode] = useState<'folder' | 'split' | 'file'>('split');

    // UI flags
    const [isLocked, setIsLocked] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);



    // Panel Width
    const [leftPanelWidth, setLeftPanelWidth] = useState(50);

    // Filter/Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [excludeFolders, setExcludeFolders] = useState("");
    const [excludeFiles, setExcludeFiles] = useState("");
    const [hiddenPaths, setHiddenPaths] = useState<Set<string>>(new Set());
    const [showHidden, setShowHidden] = useState(false);

    const toggleHiddenPath = (path: string | null) => {
        if (!path) return;
        setHiddenPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const toggleShowHidden = () => setShowHidden(prev => !prev);

    // Sync from Config (Once)
    const initialized = useState(false); // Using state to force re-render if needed, or Ref?
    // Actually Ref is better for suppressing effects without re-render.
    // But we are inside a hook.

    // Sync from Config (Once)
    const configLoadedRef = useRef(false);
    useEffect(() => {
        if (config && !configLoadedRef.current) {
            configLoadedRef.current = true;
            if (config.savedExcludes?.folders) setExcludeFolders(config.savedExcludes.folders);
            if (config.savedExcludes?.files) setExcludeFiles(config.savedExcludes.files);
            if (config.viewOptions?.diffMode) setDiffMode(config.viewOptions.diffMode as DiffMode);
            if (config.viewOptions?.layoutMode) setLayoutMode(config.viewOptions.layoutMode as any);
        }
    }, [config]);

    // Persist Layout Mode changes
    const changeLayoutMode = (mode: 'folder' | 'split' | 'file') => {
        setLayoutMode(mode);
        if (config) {
            saveConfig({
                ...config,
                viewOptions: { ...config.viewOptions, layoutMode: mode }
            }).catch(e => console.error("Failed to save layout mode", e));
        }
    };

    // Derived flags for backward compatibility or ease of use
    const isExpanded = layoutMode === 'file';
    const setIsExpanded = (expand: boolean) => changeLayoutMode(expand ? 'file' : 'split');

    // Handle Width Persistence
    useEffect(() => {
        if (!config) return;
        const mode = (config.viewOptions?.folderViewMode as string) || 'split';
        const key = `leftPanelWidth_${mode}`;
        const savedWidth = config.viewOptions?.[key];

        if (savedWidth) {
            setLeftPanelWidth(Number(savedWidth));
        } else {
            if (mode === 'unified') setLeftPanelWidth(20);
            else if (mode === 'split') setLeftPanelWidth(50);
            else setLeftPanelWidth(30);
        }
    }, [config?.viewOptions?.folderViewMode]);

    const handleAdjustWidth = (delta: number) => {
        setLeftPanelWidth(prev => {
            const next = prev + delta;
            const clamped = Math.max(10, Math.min(50, next));

            // Persist (debounce logic moved to component or just save on change? Original saved on every change)
            if (config) {
                const mode = (config.viewOptions?.folderViewMode as string) || 'split';
                const key = `leftPanelWidth_${mode}`;
                saveConfig({
                    ...config,
                    viewOptions: { ...config.viewOptions, [key]: clamped }
                }).catch(e => console.error("Failed to auto-save width", e));
            }
            return clamped;
        });
    };

    return {
        isExpanded, setIsExpanded,
        layoutMode, setLayoutMode: changeLayoutMode,
        isLocked, setIsLocked,
        aboutOpen, setAboutOpen,
        diffMode, setDiffMode,
        leftPanelWidth, handleAdjustWidth, setLeftPanelWidth,
        searchQuery, setSearchQuery,
        excludeFolders, setExcludeFolders,
        excludeFiles, setExcludeFiles,
        hiddenPaths, toggleHiddenPath,
        showHidden, toggleShowHidden
    };
};
