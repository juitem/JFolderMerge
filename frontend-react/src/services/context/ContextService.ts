export const ContextKeys = {
    TREE_FOCUSED: 'tree.focused',
    EDITOR_FOCUSED: 'editor.focused',
    MODAL_OPEN: 'modal.open',
    DIFF_VIEW_FOCUSED: 'diffView.focused',
} as const;

export type ContextKey = typeof ContextKeys[keyof typeof ContextKeys];

export class ContextService {
    private contexts: Set<string> = new Set();
    private listeners: Set<() => void> = new Set();

    set(key: string, value: boolean) {
        const has = this.contexts.has(key);
        if (value && !has) {
            this.contexts.add(key);
            this.notify();
        } else if (!value && has) {
            this.contexts.delete(key);
            this.notify();
        }
    }

    get(key: string): boolean {
        return this.contexts.has(key);
    }

    // Helper for 'when' clauses
    evaluate(when?: (ctx: ContextService) => boolean): boolean {
        if (!when) return true;
        return when(this);
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(l => l());
    }
}

export const contextService = new ContextService();
