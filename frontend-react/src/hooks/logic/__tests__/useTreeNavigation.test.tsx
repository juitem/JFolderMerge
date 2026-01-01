import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTreeNavigation } from '../useTreeNavigation';
import type { FileNode } from '../../../types';

// Mock Data
const mockRoot: FileNode = {
    path: '/root',
    name: 'root',
    type: 'directory',
    status: 'same',
    children: [
        { path: '/root/file1', name: 'file1', type: 'file', status: 'same' },
        { path: '/root/file2', name: 'file2', type: 'file', status: 'added' },
        { path: '/root/file3', name: 'file3', type: 'file', status: 'removed' },
    ]
};

const mockConfig = {
    folderFilters: { same: true, modified: true, added: true, removed: true }
} as any;

describe('useTreeNavigation Boundary Tests', () => {

    it('initializes with correct visible nodes', () => {
        const { result } = renderHook(() => useTreeNavigation(mockRoot, mockConfig, ""));
        // Root + 3 children. Initial effect expands all.
        expect(result.current.visibleNodes.length).toBe(4);
        expect(result.current.visibleNodes[0].path).toBe('/root');
    });

    it('handles moveFocus wrap-around correctly (Bottom -> Top)', () => {
        const { result } = renderHook(() => useTreeNavigation(mockRoot, mockConfig, ""));

        // 1. Focus Last Item (file3, index 3)
        const lastNode = result.current.visibleNodes[result.current.visibleNodes.length - 1];
        act(() => {
            result.current.setFocusedPath(lastNode.path);
        });

        expect(result.current.focusedPath).toBe(lastNode.path);

        // 2. Move Down (Should Wrap to Top -> Root, index 0)
        act(() => {
            result.current.moveFocus(1);
        });

        const firstNode = result.current.visibleNodes[0];
        expect(result.current.focusedPath).toBe(firstNode.path);
    });

    it('handles moveFocus wrap-around correctly (Top -> Bottom)', () => {
        const { result } = renderHook(() => useTreeNavigation(mockRoot, mockConfig, ""));

        // 1. Focus First Item (Root, index 0)
        const firstNode = result.current.visibleNodes[0];
        act(() => {
            result.current.setFocusedPath(firstNode.path);
        });

        // 2. Move Up (Should Wrap to Bottom -> file3)
        act(() => {
            result.current.moveFocus(-1);
        });

        const lastNode = result.current.visibleNodes[result.current.visibleNodes.length - 1];
        expect(result.current.focusedPath).toBe(lastNode.path);
    });

    it('Safe guard checks: Does not crash on empty list', () => {
        const emptyRoot: FileNode = { path: '/root', name: 'root', type: 'directory', status: 'same', children: [] };
        const { result } = renderHook(() => useTreeNavigation(emptyRoot, mockConfig, ""));

        // Only root is visible.
        expect(result.current.visibleNodes.length).toBe(1);

        act(() => {
            result.current.moveFocus(1);
        });
        expect(true).toBe(true);
    });

    it('Regression: Handles Bottom -> Up Correctly (No Skip)', () => {
        const { result } = renderHook(() => useTreeNavigation(mockRoot, mockConfig, ""));

        // 1. Focus Last Item (Bottom, index 3)
        const lastNode = result.current.visibleNodes[result.current.visibleNodes.length - 1];
        act(() => {
            result.current.setFocusedPath(lastNode.path);
        });

        // 2. Move Up (Should go to index 2, which is file2)
        act(() => {
            result.current.moveFocus(-1);
        });

        const secondLastNode = result.current.visibleNodes[result.current.visibleNodes.length - 2];
        expect(result.current.focusedPath).toBe(secondLastNode.path);
    });

    it('Scenario: Filtered List Navigation (Wrap Around)', () => {
        // Config that hides 'same' files. Root is 'same' dir, file1 is 'same'.
        // Visible should be: Root(directory with visible children), file2(added), file3(removed).
        // Sequence: Root -> file2 -> file3.
        const filteredConfig = {
            folderFilters: { same: false, modified: true, added: true, removed: true }
        } as any;

        const { result } = renderHook(() => useTreeNavigation(mockRoot, filteredConfig, ""));

        expect(result.current.visibleNodes.length).toBe(3);
        expect(result.current.visibleNodes[0].name).toBe('root');

        // Test Wrap Bottom -> Top
        const last = '/root/file3';
        act(() => { result.current.setFocusedPath(last); });

        // Move Down (Wrap to Top -> root)
        act(() => { result.current.moveFocus(1); });

        const first = result.current.visibleNodes[0];
        expect(result.current.focusedPath).toBe(first.path);
    });

    it('Scenario: Derived Focus State (Focus lost -> Immediate Fallback)', () => {
        const { result } = renderHook(() => useTreeNavigation(mockRoot, mockConfig, ""));

        // 1. Set Focus to a non-existent path
        act(() => {
            result.current.setFocusedPath('/root/ghost-file');
        });

        // Fallback to index 0 (root)
        const first = result.current.visibleNodes[0];
        expect(result.current.focusedPath).toBe(first.path);

        // 2. Move Down (Delta +1) from "Fallback" state (0) -> index 1 (file1)
        act(() => {
            result.current.moveFocus(1);
        });

        const second = result.current.visibleNodes[1];
        expect(result.current.focusedPath).toBe(second.path);
    });

    it('Scenario: Auto-Expand on Next Change (Hidden file)', () => {
        // Setup: Root contains 'dir1' (collapsed) -> 'file_changed' (modified)
        const rootWithHiddenChange: FileNode = {
            path: '/root',
            name: 'root',
            type: 'directory',
            status: 'same',
            children: [
                {
                    path: '/root/dir1', name: 'dir1', type: 'directory', status: 'same',
                    children: [
                        { path: '/root/dir1/file_changed', name: 'file_changed', type: 'file', status: 'modified' }
                    ]
                }
            ]
        };

        const { result } = renderHook(() => useTreeNavigation(rootWithHiddenChange, mockConfig, ""));

        // Initial state: dir1 is expanded by default (useEffect initial).
        // Let's collapse it manually.
        act(() => {
            result.current.toggleExpand('/root/dir1');
        });

        // Verify collapsed based on visible nodes
        // Visible: Root, dir1. (file_changed NOT visible)
        expect(result.current.visibleNodes.find(n => n.name === 'file_changed')).toBeUndefined();

        // Trigger Next Change
        act(() => {
            result.current.selectNextChange();
        });

        // Expectation 1: Focus moved to file_changed
        expect(result.current.focusedPath).toBe('/root/dir1/file_changed');

        // Expectation 2: Parent Expanded
        expect(result.current.expandedPaths.has('/root/dir1')).toBe(true);

        // Expectation 3: Now visible
        expect(result.current.visibleNodes.find(n => n.name === 'file_changed')).toBeDefined();
    });

    it('Scenario: Fold/Unfold Root (Locked)', () => {
        const { result } = renderHook(() => useTreeNavigation(mockRoot, mockConfig, ""));

        // Initial: Expanded (Root + 3 children = 4)
        expect(result.current.visibleNodes.length).toBe(4);
        expect(result.current.expandedPaths.has('/root')).toBe(true);

        // Try to fold Root (Should be IGNORED)
        act(() => {
            result.current.toggleExpand('/root');
        });

        // Visible: STILL 4 (Root + 3 children)
        expect(result.current.visibleNodes.length).toBe(4);
        expect(result.current.expandedPaths.has('/root')).toBe(true);
    });
});
