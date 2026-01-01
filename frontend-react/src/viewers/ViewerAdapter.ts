import type { ReactNode } from 'react';
import type { FileNode } from '../types';
import { CommandId } from '../services/commands/types';

export interface ViewerProps {
    fileNode: FileNode;
    content: any; // Raw content or Diff Data
    isActive: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
}

export interface ViewerAdapter {
    id: string;
    label: string;

    // Capability Check
    canHandle(node: FileNode): boolean;

    // Render Component
    render(props: ViewerProps): ReactNode;

    // Context-specific commands (e.g. "Next Difference")
    getCommands?(): { id: CommandId, handler: () => void }[];

    // Dirty State / Persistence
    // If implemented, the container will call these
    isDirty?(): boolean;
    save?(): Promise<void>;
}
