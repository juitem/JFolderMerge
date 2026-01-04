import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { FolderTree } from './FolderTree';
import type { FileNode, Config } from '../types';

// Mock react-virtuoso
vi.mock('react-virtuoso', () => ({
    Virtuoso: ({ data, itemContent }: any) => (
        <div className="virtuoso-mock">
            {data.map((node: any, index: number) => (
                <div key={node.path}>{itemContent(index, node)}</div>
            ))}
        </div>
    )
}));

const mockConfig: Config = {
    viewOptions: {
        showHideIcons: true,
        showHidden: true
    }
};

const mockRoot: FileNode = {
    name: 'root',
    path: 'root',
    type: 'directory',
    status: 'same',
    children: [
        { name: 'file1.txt', path: 'root/file1.txt', type: 'file', status: 'modified' }
    ]
};

describe('FolderTree Hidden Logic & Shortcuts', () => {
    it('calls toggleShowHidden when "h" is pressed', () => {
        const toggleShowHidden = vi.fn();
        const { container } = render(
            <FolderTree
                root={mockRoot}
                config={mockConfig}
                onSelect={vi.fn()}
                onMerge={vi.fn()}
                onDelete={vi.fn()}
                toggleShowHidden={toggleShowHidden}
            />
        );

        const treeContainer = container.querySelector('.tree-container');
        expect(treeContainer).toBeTruthy();

        fireEvent.keyDown(treeContainer!, { key: 'h', code: 'KeyH' });
        expect(toggleShowHidden).toHaveBeenCalled();
    });

    it('calls toggleHiddenPath when "Ctrl+h" is pressed', () => {
        const toggleHiddenPath = vi.fn();
        const ref = React.createRef<any>();
        const { container } = render(
            <FolderTree
                ref={ref}
                root={mockRoot}
                config={mockConfig}
                onSelect={vi.fn()}
                onMerge={vi.fn()}
                onDelete={vi.fn()}
                toggleHiddenPath={toggleHiddenPath}
            />
        );

        const treeContainer = container.querySelector('.tree-container');

        // 1. Expand root so file1 is visible
        act(() => {
            ref.current.toggleExpand('root');
        });

        // 2. Select first (which should now be file1.txt because root is skipped)
        act(() => {
            ref.current.selectFirst();
        });

        fireEvent.keyDown(treeContainer!, { key: 'h', code: 'KeyH', ctrlKey: true });
        expect(toggleHiddenPath).toHaveBeenCalledWith('root/file1.txt');
    });

    it('calls toggleHiddenPath when "Alt+h" is pressed', () => {
        const toggleHiddenPath = vi.fn();
        const ref = React.createRef<any>();
        const { container } = render(
            <FolderTree
                ref={ref}
                root={mockRoot}
                config={mockConfig}
                onSelect={vi.fn()}
                onMerge={vi.fn()}
                onDelete={vi.fn()}
                toggleHiddenPath={toggleHiddenPath}
            />
        );

        const treeContainer = container.querySelector('.tree-container');

        act(() => {
            ref.current.toggleExpand('root');
        });
        act(() => {
            ref.current.selectFirst();
        });

        fireEvent.keyDown(treeContainer!, { key: 'h', code: 'KeyH', altKey: true });
        expect(toggleHiddenPath).toHaveBeenCalledWith('root/file1.txt');
    });

    it('hides the hide icon when config.viewOptions.showHideIcons is false', () => {
        const configWithNoIcons: Config = {
            viewOptions: {
                showHideIcons: false
            }
        };

        const { queryByTitle } = render(
            <FolderTree
                root={mockRoot}
                config={configWithNoIcons}
                onSelect={vi.fn()}
                onMerge={vi.fn()}
                onDelete={vi.fn()}
                toggleHiddenPath={vi.fn()}
            />
        );

        expect(queryByTitle(/Hide File/)).toBeNull();
    });
});
