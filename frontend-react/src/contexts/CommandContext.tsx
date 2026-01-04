import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { commandRegistry } from '../services/commands/CommandRegistry';
import { keybindingService } from '../services/keys/KeybindingService';
import { CommandId, type CommandContext as CmdContextType } from '../services/commands/types';

interface CommandContextValue {
    execute: (id: CommandId, context?: CmdContextType) => Promise<void>;
}

const CommandContext = createContext<CommandContextValue | null>(null);

export const CommandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const execute = useCallback(async (id: CommandId, context?: CmdContextType) => {
        await commandRegistry.execute(id, context);
    }, []);

    // Global Key Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const commandId = keybindingService.findCommand(e);
            if (commandId) {
                e.preventDefault();
                e.stopPropagation();
                // We need a way to pass CURRENT context (like selected node).
                // This is the tricky part of global listeners.
                // For now, we launch with empty context, and commands pull state from stores?
                // OR: Components rely on `useKey` hook instead of global listener for context-sensitive stuff.
                // Let's rely on components registering themselves or use focus.

                // For now, let's just log.
                console.debug(`[GlobalKey] Map ${e.key} -> ${commandId}`);
                execute(commandId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [execute]);

    return (
        <CommandContext.Provider value={{ execute }}>
            {children}
        </CommandContext.Provider>
    );
};

export const useCommand = () => {
    const ctx = useContext(CommandContext);
    if (!ctx) throw new Error("useCommand must be used within CommandProvider");
    return ctx;
};
