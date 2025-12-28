// api.js

export async function fetchConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) return await response.json();
    } catch (e) {
        console.error("Failed to load config", e);
    }
    return null;
}

export async function listDirs(path, includeFiles = false) {
    try {
        const response = await fetch('/api/list-dirs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, include_files: includeFiles })
        });
        if (!response.ok) {
            // Retry with empty path if failed (fallback to root)
            if (path !== "") return listDirs("", includeFiles);
            throw new Error("Failed to load path");
        }
        return await response.json();
    } catch (e) {
        throw e;
    }
}

export async function compareFolders(leftPath, rightPath, excludeFiles, excludeFolders) {
    const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            left_path: leftPath,
            right_path: rightPath,
            exclude_files: excludeFiles,
            exclude_folders: excludeFolders
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Comparison failed");
    }
    return await response.json();
}

export async function fetchFileContent(path) {
    try {
        const response = await fetch(`/api/content?path=${encodeURIComponent(path)}`);
        if (response.ok) return await response.json();
    } catch (e) {
        console.error("Failed to load content", e);
    }
    return null;
}

export async function fetchDiff(leftPath, rightPath, mode) {
    // 'both' mode logic might be handled by fetching one or two diffs? 
    // Or just fetching 'side-by-side' contains enough info for both usually?
    // Actually our backend has specific modes. 
    // If we want 'both', we might need to fetch side-by-side (which contains everything split) 
    // AND unified? Or just render unified from side-by-side data?
    // Side-by-side data in our backend: left_rows, right_rows.
    // Unified data: diff lines.

    // For now, if mode is 'both', we might just request 'side-by-side' and process it?
    // Or request 'unified' separately? 
    // Let's stick to what backend implementation supports.
    // If backend only supports 'unified' or 'side-by-side'.
    // If frontend wants 'both', it might need to make 2 calls or we improve backend.
    // Let's check backend... `get_diff` takes `mode`.
    // Returning `left_rows` and `right_rows` only for side-by-side.
    // Returning `diff` list for unified.

    // Efficient way: Request 'side-by-side' and 'unified' or update backend.
    // Current backend returns different structures.
    // I will modify this to request what is needed.

    // If mode is 'both', we probably want to support it in UI.
    // Let's just pass the mode to backend. API handles 'unified' or 'side-by-side'.
    // Logic for 'both' will be in diffView to call API possibly twice or rely on one.
    // Actually, 'Unified' is just a patch format. 'Side-by-side' is parsed.
    // Converting side-by-side back to unified is hard.
    // Converting unified to side-by-side is what we did in backend.

    const response = await fetch('/api/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            left_path: leftPath,
            right_path: rightPath,
            mode: mode === 'both' ? 'side-by-side' : mode // Fallback for 'both'? 
            // We'll handle 'both' by fetching both or one.
        })
    });

    if (!response.ok) throw new Error("API Error");
    return await response.json();
}

export async function saveFile(path, content) {
    const res = await fetch('/api/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
    });
    if (!res.ok) throw new Error("Save Failed");
}

export async function deleteItem(path) {
    const res = await fetch(`/api/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
    });
    if (!res.ok) throw new Error("Delete failed");
    return res.json();
}

export async function getHistory() {
    const res = await fetch(`/api/history`);
    if (!res.ok) return [];
    return res.json();
}

export async function saveHistory(leftPath, rightPath) {
    await fetch(`/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left_path: leftPath, right_path: rightPath })
    });
}

export async function openExternal(leftPath, rightPath, tool = "default") {
    const res = await fetch(`/api/open-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left_path: leftPath, right_path: rightPath, tool })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Launch failed");
    }
    return res.json();
}

// ...existing code...
export async function copyItem(src, dest, isDir) {
    const response = await fetch('/api/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_path: src, dest_path: dest, is_dir: isDir })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Copy failed");
    }
}

export async function saveConfig(configData) {
    const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
    });
    if (!response.ok) throw new Error("Failed to save config");
    return await response.json();
}
