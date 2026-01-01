import { CommandId } from '../commands/types';

export interface KeyBinding {
    key: string;
    ctrl?: boolean;
    meta?: boolean; // Command key on Mac
    shift?: boolean;
    alt?: boolean;
    commandId: CommandId;
    when?: (context: any) => boolean;
}

class KeybindingService {
    private bindings: KeyBinding[] = [];

    constructor() {
        this.registerDefaults();
    }

    register(binding: KeyBinding) {
        this.bindings.push(binding);
    }

    private registerDefaults() {
        // Navigation
        this.register({ key: 'ArrowUp', commandId: CommandId.NAV_UP });
        this.register({ key: 'ArrowDown', commandId: CommandId.NAV_DOWN });
        this.register({ key: 'ArrowLeft', commandId: CommandId.NAV_LEFT });
        this.register({ key: 'ArrowRight', commandId: CommandId.NAV_RIGHT });
        this.register({ key: 'Enter', commandId: CommandId.NAV_SELECT });

        // Actions
        this.register({ key: 's', meta: true, commandId: CommandId.GLOBAL_SAVE });
        this.register({ key: 'r', meta: true, commandId: CommandId.GLOBAL_RELOAD });
    }

    findCommand(e: KeyboardEvent | React.KeyboardEvent): CommandId | null {
        // Find matching binding
        // Logic needs to handle modifiers rigorously

        const binding = this.bindings.find(b => {
            if (b.key.toLowerCase() !== e.key.toLowerCase()) return false;
            if (!!b.ctrl !== e.ctrlKey) return false;
            if (!!b.meta !== e.metaKey) return false;
            if (!!b.shift !== e.shiftKey) return false;
            if (!!b.alt !== e.altKey) return false;
            return true;
        });

        return binding ? binding.commandId : null;
    }
}

export const keybindingService = new KeybindingService();
