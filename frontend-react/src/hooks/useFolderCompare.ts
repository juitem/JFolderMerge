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

            // Structural Fix: Force root names to match requested paths
            // This prevents the "Right Root" from inheriting the "Left Name" if backend returns ambiguous data.
            if (data) {
                const getBasename = (p: string) => p.replace(/\/$/, '').split(/[/\\]/).pop() || p;
                data.left_name = getBasename(leftPath);
                data.right_name = getBasename(rightPath);
            }

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
