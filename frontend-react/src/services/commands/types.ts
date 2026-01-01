export const CommandId = {
    // Navigation
    NAV_UP: 'nav.up',
    NAV_DOWN: 'nav.down',
    NAV_LEFT: 'nav.left',
    NAV_RIGHT: 'nav.right',
    NAV_SELECT: 'nav.select',
    NAV_NEXT_CHANGE: 'nav.nextChange',
    NAV_PREV_CHANGE: 'nav.prevChange',
    NAV_FOCUS_TREE: 'nav.focusTree',
    NAV_FOCUS_EDITOR: 'nav.focusEditor',

    // File Actions
    FILE_MERGE_TO_RIGHT: 'file.mergeToRight',
    FILE_MERGE_TO_LEFT: 'file.mergeToLeft',
    FILE_DELETE: 'file.delete',
    FILE_OPEN: 'file.open',

    // Global
    GLOBAL_SEARCH: 'global.search',
    GLOBAL_SAVE: 'global.save',
    GLOBAL_RELOAD: 'global.reload',
    GLOBAL_TOGGLE_SIDEBAR: 'global.toggleSidebar',

    // View
    VIEW_NEXT_DIFF: 'view.nextDiff',
    VIEW_PREV_DIFF: 'view.prevDiff',
    VIEW_TOGGLE_MODE: 'view.toggleMode',
} as const;

export type CommandId = typeof CommandId[keyof typeof CommandId];

export interface CommandContext {
    [key: string]: any;
}

export interface ICommand {
    id: CommandId;
    label: string;
    execute: (context?: CommandContext) => Promise<void> | void;
    isEnabled?: (context?: CommandContext) => boolean;
}
