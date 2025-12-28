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
        const newFilters = { ...currentFilters, [key]: !currentFilters[key] };
        const newConfig = { ...config, folderFilters: newFilters };
        setConfig(newConfig);
        // Optional: Auto-save or wait for explicit save?
        // App.tsx logic was just setConfig.
    };

    const toggleDiffFilter = (key: string) => {
        if (!config) return;
        const currentFilters = config.diffFilters || { same: false, modified: true, added: true, removed: true };
        const newFilters = { ...currentFilters, [key]: !currentFilters[key] };
        setConfig({ ...config, diffFilters: newFilters });
    };

    return (
        <ConfigContext.Provider value={{ config, setConfig, loading, error, saveConfig, toggleFilter, toggleDiffFilter }}>
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
