export const state = {
    currentDiffMode: 'unified', // 'unified', 'side-by-side', 'both'
    currentDiffPaths: { left: "", right: "", leftRoot: "", rightRoot: "", relPath: "" },
    currentLeftPathGlobal: "",
    currentRightPathGlobal: "",
    currentLeftLines: [],
    currentRightLines: [],

    // Filter State
    // Filters
    folderFilters: {
        added: true,
        removed: true,
        modified: true,
        same: true
    },
    diffFilters: {
        added: true,
        removed: true,
        modified: true,
        same: true
    }
};

export const dom = {
    // We can cache DOM elements here if needed, or just let modules query them.
    // For now, let's keep it simple and let modules query what they need.
};
