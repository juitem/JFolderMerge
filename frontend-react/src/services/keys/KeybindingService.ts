import { contextService, ContextService, ContextKeys } from '../context/ContextService';
import { CommandId } from '../commands/types';
import { commandRegistry } from '../commands/CommandRegistry';

export interface KeyBinding {
    key: string;
    ctrl?: boolean;
    meta?: boolean; // Command key on Mac
    shift?: boolean;
    alt?: boolean;
    commandId: CommandId;
    when?: (ctx: ContextService) => boolean;
}



class KeybindingService {
    private bindings: KeyBinding[] = [];
    private isInitialized = false;

    constructor() {
        this.registerDefaults();
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        window.addEventListener('keydown', this.handleKeyDown.bind(this), true); // Capture phase to intervene early
    }

    dispose() {
        window.removeEventListener('keydown', this.handleKeyDown.bind(this), true);
    }

    private handleKeyDown(e: KeyboardEvent) {
        const commandId = this.findCommand(e);
        if (commandId) {
            e.preventDefault();
            e.stopPropagation();
            commandRegistry.execute(commandId);
        }
    }

    register(binding: KeyBinding) {
        this.bindings.push(binding);
    }

    private registerDefaults() {
        // Navigation - Scoped to Tree Focus to prevent stealing from inputs
        // Navigation - Scoped to Tree Focus
        // REMOVED: Delegating specific tree navigation to FolderTree component to avoid double-handling
        // and to support complex logic (e.g. Jump to Parent on Left Arrow).
        /*
        this.register({
            key: 'ArrowUp',
            commandId: CommandId.NAV_UP,
            when: (ctx) => ctx.get(ContextKeys.TREE_FOCUSED)
        });
        this.register({
            key: 'ArrowDown',
            commandId: CommandId.NAV_DOWN,
            when: (ctx) => ctx.get(ContextKeys.TREE_FOCUSED)
        });
        this.register({
            key: 'ArrowLeft',
            commandId: CommandId.NAV_LEFT,
            when: (ctx) => ctx.get(ContextKeys.TREE_FOCUSED)
        });
        this.register({
            key: 'ArrowRight',
            commandId: CommandId.NAV_RIGHT,
            when: (ctx) => ctx.get(ContextKeys.TREE_FOCUSED)
        });
        this.register({
            key: 'Enter',
            commandId: CommandId.NAV_SELECT,
            when: (ctx) => ctx.get(ContextKeys.TREE_FOCUSED)
        });
        */

        // Focus Toggling (Tab)
        // If Tree is focused -> Tab -> Focus Editor
        this.register({
            key: 'Tab',
            commandId: CommandId.NAV_FOCUS_EDITOR,
            when: (ctx) => ctx.get(ContextKeys.TREE_FOCUSED)
        });

        // If Tree is NOT focused (default assumption: editor/body is focused) -> Tab -> Focus Tree
        // Note: We need a negative check or a specific EDITOR_FOCUSED check.
        // KeybindingService resolution prefers specific matches.
        // If we add 'when: (ctx) => !ctx.get(ContextKeys.TREE_FOCUSED)', it effectively captures all other Tabs.
        // This might block normal Tab navigation in inputs (e.g. Search Input).
        // Strategy: Only hijack Tab if we are in a "View" context (not input).
        // Or, we rely on the fact that inputs usually stopPropagation of keys if they consume them? 
        // Our global listener is 'capture' phase, so we see it first.
        // If we want to avoid hijacking inputs, we should check activeElement.

        // For now, let's try assuming !TREE_FOCUSED means we want to go back to Tree.
        // But we must permit Tab in inputs.
        // The KeybindingService 'when' check handles context flags.
        // We really need an 'EDITOR_FOCUSED' flag.

        this.register({
            key: 'Tab',
            commandId: CommandId.NAV_FOCUS_TREE,
            when: (ctx) => !ctx.get(ContextKeys.TREE_FOCUSED) // Simplistic toggle
        });

        // Actions (Global)
        this.register({ key: 's', meta: true, commandId: CommandId.GLOBAL_SAVE });
        this.register({ key: 'r', meta: true, commandId: CommandId.GLOBAL_RELOAD });
    }

    findCommand(e: KeyboardEvent | React.KeyboardEvent): CommandId | null {
        // Find all matching bindings first
        const matches = this.bindings.filter(b => {
            if (b.key.toLowerCase() !== e.key.toLowerCase()) return false;
            // Strict modifier check
            if (!!b.ctrl !== e.ctrlKey) return false;
            if (!!b.meta !== e.metaKey) return false;
            if (!!b.shift !== e.shiftKey) return false;
            if (!!b.alt !== e.altKey) return false;
            return true;
        });

        // Resolve based on 'when' clause (Context)
        // We prefer the most specific match (one with a when clause that is true)
        // If multiple matches, we take the last registered one that satisfies 'when' (LIFO usually implies overrides)

        for (let i = matches.length - 1; i >= 0; i--) {
            const binding = matches[i];
            if (contextService.evaluate(binding.when)) {
                return binding.commandId;
            }
        }

        return null;
    }
}

export const keybindingService = new KeybindingService();
