import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { FolderTree } from './FolderTree';
import type { FileNode, Config } from '../types';

// Mock react-virtuoso
const scrollToIndexMock = vi.fn();
vi.mock('react-virtuoso', () => ({
    Virtuoso: React.forwardRef((_props: any, ref: any) => {
        // Capture ref
        React.useImperativeHandle(ref, () => ({
            scrollToIndex: scrollToIndexMock
        }));
        return <div>Virtuoso Mock</div>;
    })
}));

// Mock Config
const mockConfig: Config = {
    viewOptions: {
        smoothScrollFolder: true,
        smoothScrollFile: true
    },
    folderFilters: { same: true, added: true, modified: true, removed: true }
};

// Mock Tree Data
const mockRoot: FileNode = {
    name: 'root',
    path: 'root',
    type: 'directory',
    status: 'same',
    children: Array.from({ length: 100 }, (_, i) => ({
        name: `file${i}.txt`,
        path: `root/file${i}.txt`,
        type: 'file',
        status: 'modified'
    }))
};

describe('FolderTree Navigation & Scrolling', () => {
    beforeEach(() => {
        scrollToIndexMock.mockClear();
    });

    it('selects first and last item and scrolls correctly', () => {
        const onSelect = vi.fn();
        const ref = React.createRef<any>();

        render(
            <FolderTree
                ref={ref}
                root={mockRoot}
                config={mockConfig}
                onSelect={onSelect}
                onMerge={vi.fn()}
                onDelete={vi.fn()}
                searchQuery=""
                selectedNode={null}
            />
        );

        expect(ref.current).toBeTruthy();

        // 1. Select Last
        act(() => {
            ref.current.selectLast();
        });

        // Verify Scroll (Index should be 100: Root + 100 files = 101. Index 100 is last)
        // Check call arguments
        expect(scrollToIndexMock).toHaveBeenLastCalledWith(expect.objectContaining({ index: 100 }));

        // 2. Select First
        act(() => {
            ref.current.selectFirst();
        });

        // Verify Scroll (Index 1: Root is at 0, file0 is at 1)
        expect(scrollToIndexMock).toHaveBeenLastCalledWith(expect.objectContaining({ index: 1 }));
    });
    it('navigates to first/last changed node correctly', () => {
        const onSelect = vi.fn();
        const ref = React.createRef<any>();

        // Custom root with specific changes
        // Visible Order:
        // 0: root
        // 1: root/same1
        // 2: root/same2
        // 3: root/change1 (First Change)
        // 4: root/same3
        // 5: root/change2 (Last Change)
        // 6: root/same4
        const mixedRoot: FileNode = {
            name: 'root', path: 'root', type: 'directory', status: 'same',
            children: [
                { name: 'same1', path: 'root/same1', type: 'file', status: 'same' },
                { name: 'same2', path: 'root/same2', type: 'file', status: 'same' },
                { name: 'change1', path: 'root/change1', type: 'file', status: 'modified' },
                { name: 'same3', path: 'root/same3', type: 'file', status: 'same' },
                { name: 'change2', path: 'root/change2', type: 'file', status: 'added' },
                { name: 'same4', path: 'root/same4', type: 'file', status: 'same' },
            ]
        };

        render(
            <FolderTree
                ref={ref}
                root={mixedRoot}
                config={mockConfig}
                onSelect={onSelect}
                onMerge={vi.fn()}
                onDelete={vi.fn()}
                searchQuery=""
                selectedNode={null}
            />
        );

        // 1. Select First Changed (Should be 'root/change1')
        act(() => {
            ref.current.selectFirstChangedNode();
        });

        // Expect onSelect to be called with the node
        // Note: checking path is easiest
        expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'root/change1' }));

        // 3. Go To First Non-Root Item
        // Ensure it skips root (index 0) and selects the first file (index 1)
        // 3. Go To First Non-Root Item
        act(() => {
            ref.current.selectFirst();
        });

        // Assert: First NON-ROOT item should be selected (Index 1: same1)
        expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'root/same1' }));
        // Also verify scroll to top happened
        expect(scrollToIndexMock).toHaveBeenCalledWith(expect.objectContaining({ index: 0, align: 'start' }));

        act(() => {
            ref.current.selectLastChangedNode();
        });

        expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'root/change2' }));
    });

    it('navigates by specific status (added, removed, modified) correctly', () => {
        const onSelect = vi.fn();
        const ref = React.createRef<any>();

        const statusRoot: FileNode = {
            name: 'root', path: 'root', type: 'directory', status: 'same',
            children: [
                { name: 'm1', path: 'root/m1', type: 'file', status: 'modified' },
                { name: 'a1', path: 'root/a1', type: 'file', status: 'added' },
                { name: 'r1', path: 'root/r1', type: 'file', status: 'removed' },
                { name: 'm2', path: 'root/m2', type: 'file', status: 'modified' },
            ]
        };

        render(
            <FolderTree
                ref={ref}
                root={statusRoot}
                config={mockConfig}
                onSelect={onSelect}
                onMerge={vi.fn()}
                onDelete={vi.fn()}
                searchQuery=""
                selectedNode={null}
            />
        );

        // 1. Next Added (Should be 'root/a1')
        act(() => { ref.current.selectNextStatus('added'); });
        expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'root/a1' }));

        // 2. Next Modified (Should be 'root/m1' since we wrap around or start from beginning)
        // Wait, current focus is root/a1. Next modified is root/m2.
        act(() => { ref.current.selectNextStatus('modified'); });
        expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'root/m2' }));

        // 3. Prev Modified (Should be 'root/m1')
        act(() => { ref.current.selectPrevStatus('modified'); });
        expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'root/m1' }));

        // 4. Next Removed (Should be 'root/r1')
        act(() => { ref.current.selectNextStatus('removed'); });
        expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'root/r1' }));
    });
});
