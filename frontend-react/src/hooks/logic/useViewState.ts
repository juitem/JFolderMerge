import { useState, useEffect } from 'react';
import type { DiffMode } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';

export const useViewState = () => {
    const { config, saveConfig } = useConfig();

    // UI flags
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);

    // View Modes
    const [diffMode, setDiffMode] = useState<DiffMode>('side-by-side');

    // Panel Width
    const [leftPanelWidth, setLeftPanelWidth] = useState(50);

    // Filter/Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [excludeFolders, setExcludeFolders] = useState("");
    const [excludeFiles, setExcludeFiles] = useState("");

    // Sync from Config
    useEffect(() => {
        if (config) {
            if (config.savedExcludes?.folders) setExcludeFolders(config.savedExcludes.folders);
            if (config.savedExcludes?.files) setExcludeFiles(config.savedExcludes.files);
            if (config.viewOptions?.diffMode) setDiffMode(config.viewOptions.diffMode as DiffMode);
        }
    }, [config]);

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
        isLocked, setIsLocked,
        aboutOpen, setAboutOpen,
        diffMode, setDiffMode,
        leftPanelWidth, handleAdjustWidth, setLeftPanelWidth,
        searchQuery, setSearchQuery,
        excludeFolders, setExcludeFolders,
        excludeFiles, setExcludeFiles
    };
};
