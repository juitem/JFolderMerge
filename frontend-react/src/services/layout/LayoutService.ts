export interface LayoutHandle {
    focusContent: () => void;
}

class LayoutService {
    private layoutHandle: LayoutHandle | null = null;

    register(handle: LayoutHandle) {
        this.layoutHandle = handle;
    }

    unregister() {
        this.layoutHandle = null;
    }

    focusContent() {
        if (this.layoutHandle) {
            this.layoutHandle.focusContent();
            return true;
        }
        return false;
    }
}

export const layoutService = new LayoutService();
