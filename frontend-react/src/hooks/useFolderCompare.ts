import { useState } from 'react';
import { api } from '../api';
import type { TreeData } from '../types';

export function useFolderCompare() {
    const [treeData, setTreeData] = useState<TreeData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const compare = async (leftPath: string, rightPath: string, excludeFilesStr: string, excludeFoldersStr: string) => {
        setLoading(true);
        setError(null);
        try {
            // Parse Excludes
            const exFiles = excludeFilesStr.split(',').map(s => s.trim()).filter(Boolean);
            const exFolders = excludeFoldersStr.split(',').map(s => s.trim()).filter(Boolean);

            await api.addToHistory(leftPath, rightPath);
            const data = await api.compareFolders(leftPath, rightPath, exFiles, exFolders);
            setTreeData(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        treeData,
        loading,
        error,
        compare,
        setTreeData
    };
}
