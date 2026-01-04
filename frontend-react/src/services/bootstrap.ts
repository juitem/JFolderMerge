import { commandRegistry } from './commands/CommandRegistry';
import { TreeCommands } from './commands/implementations/TreeCommands';
import { ViewCommands } from './commands/implementations/ViewCommands';
import { keybindingService } from './keys/KeybindingService';

export function bootstrapApplication() {
    console.log('[Bootstrap] Initializing Services...');

    // Register All Commands
    TreeCommands.forEach(cmd => commandRegistry.register(cmd));
    ViewCommands.forEach(cmd => commandRegistry.register(cmd));

    // Initialize Key Bindings
    keybindingService.init();

    console.log(`[Bootstrap] Registered ${TreeCommands.length} tree commands.`);
}
