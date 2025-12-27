export const state = {
    currentDiffMode: 'side-by-side', // Default to Side-by-Side
    currentDiffPaths: { left: "", right: "", leftRoot: "", rightRoot: "", relPath: "" },
    currentLeftPathGlobal: "",
    currentRightPathGlobal: "",
    currentLeftLines: [],
    currentRightLines: [],
    searchQuery: "",
    focusedIndex: -1,

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
        same: false // Default off for file content
    }
};

export const dom = {
    // We can cache DOM elements here if needed, or just let modules query them.
    // For now, let's keep it simple and let modules query what they need.
};
