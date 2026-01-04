import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api';
import type { Config } from '../types';

interface ConfigContextType {
    config: Config | null;
    setConfig: React.Dispatch<React.SetStateAction<Config | null>>;
    loading: boolean;
    error: string | null;
    saveConfig: (newConfig: Config) => Promise<void>;
    toggleFilter: (key: string) => void;
    toggleDiffFilter: (key: string) => void;
    toggleViewOption: (key: string) => void;
    setViewOption: (key: string, value: any) => void;
    zoomLevel: number;
    setZoomLevel: (level: number | ((prev: number) => number)) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<Config | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.fetchConfig().then(cfg => {
            if (cfg) {
                setConfig(cfg);
            } else {
                setError("Failed to load config");
            }
        }).catch(e => setError("Failed to load config: " + e.message))
            .finally(() => setLoading(false));
    }, []);

    const saveConfig = async (newConfig: Config) => {
        try {
            await api.saveConfig(newConfig);
            setConfig(newConfig);
        } catch (e: any) {
            throw new Error(e.message);
        }
    };

    const toggleFilter = (key: string) => {
        if (!config) return;
        const currentFilters = config.folderFilters || {};
        // Default to true for folder filters as per UI (?? true)
        const currentVal = currentFilters[key] ?? true;
        const newFilters = { ...currentFilters, [key]: !currentVal };
        setConfig({ ...config, folderFilters: newFilters });
    };

    const toggleDiffFilter = (key: string) => {
        if (!config) return;
        const currentFilters = config.diffFilters || {};
        // Default: 'same' is false, others are true
        const defaultValue = key === 'same' ? false : true;
        const currentVal = currentFilters[key] ?? defaultValue;
        setConfig({ ...config, diffFilters: { ...currentFilters, [key]: !currentVal } });
    };
    const toggleViewOption = (key: string) => {
        if (!config) return;
        const currentOptions = config.viewOptions || {};
        const newOptions = { ...currentOptions, [key]: !currentOptions[key] };
        setConfig({ ...config, viewOptions: newOptions });
    };

    const setViewOption = (key: string, value: any) => {
        if (!config) return;
        const currentOptions = config.viewOptions || {};
        const newOptions = { ...currentOptions, [key]: value };
        setConfig({ ...config, viewOptions: newOptions });
    };

    // Zoom State (Local, not persisted in Config for now or maybe viewOptions later? 
    // User requested buttons so maybe transient is fine, but viewOptions is better if we want persistence.
    // Let's stick to local state for now as 'zoom' isn't in Config type yet without backend change.
    // Wait, Config type is defined in types.ts. I won't change backend types if I can avoid it.
    // I'll keep it local to Context but not saved to backend 'config.json' unless strictly needed.
    const [zoomLevel, setZoomLevel] = useState(1);

    useEffect(() => {
        // Apply zoom to root
        // Using font-size percentage on html is a clean way to scale rem-based layout
        // Default is 100% (16px). 
        // Range: 0.5 (50%) to 2.0 (200%).
        document.documentElement.style.fontSize = `${zoomLevel * 100}%`;
    }, [zoomLevel]);

    return (
        <ConfigContext.Provider value={{ config, setConfig, loading, error, saveConfig, toggleFilter, toggleDiffFilter, toggleViewOption, setViewOption, zoomLevel, setZoomLevel }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
}
