import type { ViewerAdapter } from './ViewerAdapter';
import type { FileNode } from '../types';
import { DiffViewerAdapterImpl } from './implementations/DiffViewerAdapter';

class ViewerRegistry {
    private adapters: Map<string, ViewerAdapter> = new Map();

    constructor() {
        this.register(new DiffViewerAdapterImpl());
    }

    register(adapter: ViewerAdapter) {
        this.adapters.set(adapter.id, adapter);
    }

    get(id: string): ViewerAdapter | undefined {
        return this.adapters.get(id);
    }

    // Find best adapter for a file
    findAdapter(node: FileNode): ViewerAdapter | undefined {
        // Priority logic could be added here (e.g. manual override > explicit extension > fallback)
        for (const adapter of this.adapters.values()) {
            if (adapter.canHandle(node)) {
                return adapter;
            }
        }
        return undefined;
    }

    getAll(): ViewerAdapter[] {
        return Array.from(this.adapters.values());
    }
}

export const viewerRegistry = new ViewerRegistry();
