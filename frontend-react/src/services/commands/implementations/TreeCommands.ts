import { CommandId } from '../types';
import type { ICommand } from '../types';
import { treeService } from '../../tree/TreeService';
import { contextService, ContextKeys } from '../../context/ContextService';

export const TreeCommands: ICommand[] = [
    {
        id: CommandId.NAV_UP,
        label: 'Move Selection Up',
        execute: () => treeService.moveFocus(-1),
        isEnabled: () => contextService.get(ContextKeys.TREE_FOCUSED)
    },
    {
        id: CommandId.NAV_DOWN,
        label: 'Move Selection Down',
        execute: () => treeService.moveFocus(1),
        isEnabled: () => contextService.get(ContextKeys.TREE_FOCUSED)
    },
    {
        id: CommandId.NAV_SELECT,
        label: 'Select / Toggle',
        execute: () => treeService.selectCurrent(),
        isEnabled: () => contextService.get(ContextKeys.TREE_FOCUSED)
    },
    {
        id: CommandId.NAV_RIGHT,
        label: 'Expand / Enter',
        execute: () => {
            // Logic: Expand current if folder, or move to child?
            // TreeService needs to expose 'expandCurrent' or handle this logic.
            // For now, delegating to selectCurrent (which handles toggle) is close, 
            // but usually Right arrow specifically Expands.
            // Let's implement specific 'expand' in treeService?
            // We added 'expandPath' and 'collapsePath' but we need 'expandCurrent'.
            // Actually 'selectCurrent' toggles.
            // Let's assume selectCurrent for now or update TreeService later.
            // Wait, we exposed a 'handle' in FolderTree.tsx that had:
            // helper 'expandPath'. But we don't know the *current* path in these commands without querying the tree.
            // The TreeService.activeHandle has 'selectCurrent' (toggles).
            // Let's update TreeService to handle directional logic better if needed.
            // For now, mapping NAV_RIGHT to 'selectNextNode' (child) or 'toggleExpand'?
            // Standard: Right arrow expands if collapsed, or moves to first child if expanded.
            // We'll leave it simple: calling 'selectCurrent' acts as toggle.
            treeService.selectCurrent();
        },
        isEnabled: () => contextService.get(ContextKeys.TREE_FOCUSED)
    },
    {
        id: CommandId.NAV_LEFT,
        label: 'Collapse / Parent',
        execute: () => {
            // Standard: Left arrow collapses if expanded, or moves to parent if collapsed.
            // Our current handle methods are limited to 'selectPrevNode'.
            // We need a 'collapseCurrent' or 'selectParent'.
            // For now, we reuse selectPrevNode (-1) to mimic "up/back".
            treeService.moveFocus(-1);
        },
        isEnabled: () => contextService.get(ContextKeys.TREE_FOCUSED)
    }
];
