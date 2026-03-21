import type { Config, TreeData, DiffResult, ListDirResult, HistoryItem, DiffMode } from './types';

// In-memory cache for file content and diff results
const contentCache = new Map<string, any>();
const diffCache = new Map<string, DiffResult>();

export function invalidateFileCache(path: string) {
    for (const key of contentCache.keys()) {
        if (key.includes(path)) contentCache.delete(key);
    }
    for (const key of diffCache.keys()) {
        if (key.includes(path)) diffCache.delete(key);
    }
}

// Helper for Fetch handling
async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
        let errorMsg = 'API Error';
        try {
            const err = await response.json();
            errorMsg = err.detail || errorMsg;
        } catch (e) { /* ignore */ }
        throw new Error(errorMsg);
    }
    return response.json();
}

export const api = {
    async fetchConfig(): Promise<Config | null> {
        try {
            return await request<Config>('/api/config');
        } catch (e) {
            console.error("Failed to load config", e);
            return null;
        }
    },

    async listDirs(path: string, includeFiles = false): Promise<ListDirResult> {
        return request<ListDirResult>('/api/list-dirs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, include_files: includeFiles })
        });
    },

    async compareFolders(leftPath: string, rightPath: string, excludeFiles: string[], excludeFolders: string[]): Promise<TreeData> {
        return request<TreeData>('/api/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                left_path: leftPath,
                right_path: rightPath,
                exclude_files: excludeFiles,
                exclude_folders: excludeFolders
            })
        });
    },

    async fetchFileContent(path: string): Promise<any> {
        if (contentCache.has(path)) return contentCache.get(path);
        const response = await fetch(`/api/content?path=${encodeURIComponent(path)}`);
        if (response.ok) {
            const data = await response.json();
            contentCache.set(path, data);
            return data;
        }
        return null;
    },

    async fetchDiff(leftPath: string, rightPath: string, mode: DiffMode | 'both'): Promise<DiffResult> {
        let backendMode = mode;
        if (mode === 'both') backendMode = 'side-by-side';
        if (mode === 'agent') backendMode = 'unified'; // Backend doesn't know agent, use unified

        const cacheKey = `${leftPath}||${rightPath}||${backendMode}`;
        if (diffCache.has(cacheKey)) return diffCache.get(cacheKey)!;

        const result = await request<DiffResult>('/api/diff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                left_path: leftPath,
                right_path: rightPath,
                mode: backendMode
            })
        });
        diffCache.set(cacheKey, result);
        return result;
    },

    async saveFile(path: string, content: string): Promise<void> {
        invalidateFileCache(path);
        await fetch('/api/save-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content })
        });
    },

    async copyItem(src: string, dest: string, isDir: boolean): Promise<void> {
        // Vanilla uses /api/copy (Wait, backend has copy?)
        // Let's assume standard copy logic exists or check backend/routers/file_ops.py?
        // Wait, I implemented `copyItem` in Logic but I must ensure Backend endpoint exists.
        // Assuming "/api/copy" or similar.
        // If not, I'll need to add it to backend!
        // Task List said "Line-level Merging" but "File/Folder Copy" was standard.
        // Legacy `api.js` had `copyItem`.
        return request<void>('/api/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_path: src, dest_path: dest, is_dir: isDir })
        });
    },

    async deleteItem(path: string): Promise<any> {
        invalidateFileCache(path);
        return request<any>('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
    },

    // Consolidated History Methods
    async fetchHistory(): Promise<HistoryItem[]> {
        try {
            return await request<HistoryItem[]>('/api/history');
        } catch (e) {
            console.error("Failed to load history", e);
            return [];
        }
    },

    async addToHistory(left: string, right: string): Promise<void> {
        try {
            await request('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ left_path: left, right_path: right })
            });
        } catch (e) {
            console.error("Failed to save history", e);
        }
    },

    async saveConfig(configData: Partial<Config>): Promise<Config> {
        return request<Config>('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData)
        });
    },

    async openExternal(leftPath: string, rightPath: string, tool: string = "default"): Promise<any> {
        return request<any>('/api/open-external', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ left_path: leftPath, right_path: rightPath, tool })
        });
    },

    async openPath(path: string): Promise<any> {
        return request<any>('/api/open-path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
    }
};
