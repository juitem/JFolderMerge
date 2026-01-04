// FileNode unused but interface required
// import type { FileNode } from '../../types';

// Interface matching the imperative handle exposed by FolderTree
export interface FolderTreeHandle {
    moveFocus: (direction: number) => void;
    toggleExpand: (path: string) => void;
    selectCurrent: () => void;
    focus: () => void;
    // Add other methods as needed by commands
    expandPath: (path: string) => void;
    collapsePath: (path: string) => void;
    refresh: () => void;
}

class TreeService {
    private activeHandle: FolderTreeHandle | null = null;
    private handles: Map<string, FolderTreeHandle> = new Map();

    register(id: string, handle: FolderTreeHandle) {
        this.handles.set(id, handle);
    }

    unregister(id: string) {
        this.handles.delete(id);
        if (this.activeHandle === this.handles.get(id)) {
            this.activeHandle = null;
        }
    }

    setActive(id: string) {
        const handle = this.handles.get(id);
        if (handle) {
            this.activeHandle = handle;
            console.debug('[TreeService] Active tree set to:', id);
        }
    }

    getActive(): FolderTreeHandle | null {
        return this.activeHandle;
    }

    // Command Helpers
    moveFocus(direction: number) {
        this.activeHandle?.moveFocus(direction);
    }

    selectCurrent() {
        this.activeHandle?.selectCurrent();
    }

    focus() {
        this.activeHandle?.focus();
    }
}

export const treeService = new TreeService();
