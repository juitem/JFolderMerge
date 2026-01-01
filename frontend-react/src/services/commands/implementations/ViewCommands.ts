import { CommandId } from '../types';
import type { ICommand } from '../types';
import { treeService } from '../../tree/TreeService';
import { layoutService } from '../../layout/LayoutService';


export const ViewCommands: ICommand[] = [
    {
        id: CommandId.NAV_FOCUS_TREE,
        label: 'Focus Folder Tree',
        execute: () => {
            treeService.focus();
        },
        // Always enabled, but we might check if tree is visible
        isEnabled: () => true
    },
    {
        id: CommandId.NAV_FOCUS_EDITOR,
        label: 'Focus Editor / Diff View',
        execute: () => {
            const success = layoutService.focusContent();
            if (!success) console.warn('[ViewCommands] Failed to focus content (no layout handle)');
        },
        isEnabled: () => true
    }
];
