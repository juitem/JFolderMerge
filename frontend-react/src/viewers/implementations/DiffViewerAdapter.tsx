import React, { useState, useImperativeHandle, forwardRef } from 'react';
import type { ViewerAdapter, ViewerProps } from '../ViewerAdapter';
import { DiffViewer } from '../../components/DiffViewer';
import type { FileNode } from '../../types';
import { api } from '../../api';

// This component acts as the "Controller" for the DiffViewer
// It manages the "Dirty State" and intercepts merges.
const DiffViewerWrapper = forwardRef<any, ViewerProps & { adapter: DiffViewerAdapterImpl }>((props, ref) => {
    // Extract props that are specific to DiffViewer
    // In a real scenario, we'd use a discriminated union or cast, 
    // but here we can assume props.content/props.fileNode context
    // Actually, DiffViewer needs many props that are currently passed from Workspace.
    // We will assume `props.content` contains the legacy props for now? 
    // Or we just passthrough what we can.

    // To properly support this without changing Workspace too much yet, we assume the specific props 
    // are passed in a way we can use. 
    // Let's assume the parent passes all DiffViewerProps inside `props` (mix-in) for now?
    // The ViewerProps interface has `content: any`.

    const legacyProps = props.content as any;

    const [dirtyState, setDirtyState] = useState<{ [path: string]: string }>({});

    const handleSaveFile = async (path: string, content: string) => {
        console.log("[DiffAdapter] Immediate Save (Bypassing Dirty State for Merge):", path);
        try {
            await api.saveFile(path, content);
            // We no longer need to track this in dirtyState if we save immediately.
            // But if we want to support "Undo" or "Revert all", we might still want to track it.
            // For now, immediate persistence is preferred for merge flow.
            if (dirtyState[path] !== undefined) {
                setDirtyState(prev => {
                    const next = { ...prev };
                    delete next[path];
                    return next;
                });
            }
            if (props.onDirtyChange) props.onDirtyChange(Object.keys(dirtyState).length > 0);
        } catch (e: any) {
            console.error("[DiffAdapter] Save failed:", e);
            throw e; // Let the caller (DiffViewer) handle the error UI
        }
    };

    const handleFetchContent = async (path: string) => {
        // Return dirty content if exists (for manual edits if we add them later)
        if (dirtyState[path] !== undefined) {
            console.log("[DiffAdapter] Serving Dirty Content:", path);
            return { content: dirtyState[path] };
        }
        return await api.fetchFileContent(path);
    };

    // Expose methods for Adapter
    useImperativeHandle(ref, () => ({
        save: async () => {
            console.log("[DiffAdapter] Persisting Manual Changes...");
            const entries = Object.entries(dirtyState);
            if (entries.length === 0) return;

            const promises = entries.map(([path, content]) =>
                api.saveFile(path, content)
            );
            await Promise.all(promises);
            setDirtyState({}); // Clear dirty
            if (props.onDirtyChange) props.onDirtyChange(false);
        },
        hasChanges: () => Object.keys(dirtyState).length > 0
    }));

    return (
        <DiffViewer
            {...legacyProps}
            onSaveFile={handleSaveFile}
            onFetchContent={handleFetchContent}
        />
    );
});

// The Class Implementation
export class DiffViewerAdapterImpl implements ViewerAdapter {
    id = "default-diff-viewer";
    label = "Diff Viewer";
    private ref = React.createRef<any>();

    canHandle(node: FileNode): boolean {
        return node.type === 'file'; // Default for all files for now
    }

    render(props: ViewerProps): React.ReactNode {
        return <DiffViewerWrapper ref={this.ref} {...props} adapter={this} />;
    }

    isDirty(): boolean {
        return this.ref.current?.hasChanges() || false;
    }

    async save(): Promise<void> {
        return this.ref.current?.save();
    }
}
