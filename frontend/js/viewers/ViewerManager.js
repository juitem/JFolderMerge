
/**
 * ViewerManager
 * Selects the appropriate viewer component for a given file.
 */
export class ViewerManager {
    constructor() {
        this.viewers = [];
    }

    register(viewer) {
        this.viewers.push(viewer);
    }

    getViewerForFile(filename) {
        // Find the first viewer that says it can handle this file
        // Reverse order to allow newer/specific viewers to override defaults
        for (let i = this.viewers.length - 1; i >= 0; i--) {
            if (this.viewers[i].canHandle(filename)) {
                return this.viewers[i];
            }
        }
        return null;
    }
}

// Singleton instance if needed, or Main creates one.
export const viewerManager = new ViewerManager();
