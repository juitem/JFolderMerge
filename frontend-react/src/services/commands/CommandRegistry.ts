import { CommandId, type ICommand, type CommandContext } from './types';

class CommandRegistry {
    private commands: Map<CommandId, ICommand> = new Map();

    register(command: ICommand) {
        if (this.commands.has(command.id)) {
            console.warn(`Command ${command.id} is already registered. Overwriting.`);
        }
        this.commands.set(command.id, command);
    }

    unregister(id: CommandId) {
        this.commands.delete(id);
    }

    get(id: CommandId): ICommand | undefined {
        return this.commands.get(id);
    }

    async execute(id: CommandId, context?: CommandContext) {
        const command = this.commands.get(id);
        if (!command) {
            console.warn(`Command ${id} not found.`);
            return;
        }

        if (command.isEnabled && !command.isEnabled(context)) {
            console.log(`Command ${id} is disabled in current context.`);
            return;
        }

        try {
            console.debug(`[Command] Executing ${id}`, context);
            await command.execute(context);
        } catch (error) {
            console.error(`[Command] Error executing ${id}:`, error);
        }
    }
}

export const commandRegistry = new CommandRegistry();
