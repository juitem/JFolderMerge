import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { DiffViewer } from './DiffViewer';
import type { DiffData } from '../types';

// Mock Child Components
vi.mock('./diff/SideBySideView', () => ({
    SideBySideView: (props: any) => {
        return (
            <div data-testid="mock-side-view">
                <button onClick={() => props.onMerge('merged content', 'left', 1, 'replace', 1)} data-testid="trigger-merge-replace">
                    Merge Replace
                </button>
                <button onClick={() => props.onMerge('new content', 'left', 1, 'insert', 1)} data-testid="trigger-merge-insert">
                    Merge Insert
                </button>
            </div>
        );
    }
}));

vi.mock('./diff/AgentView', () => ({
    AgentView: () => <div data-testid="mock-agent-view">AgentView</div>,
}));

vi.mock('./diff/UnifiedView', () => ({
    UnifiedView: () => <div>UnifiedView</div>,
}));

vi.mock('./diff/RawView', () => ({
    RawView: () => <div>RawView</div>,
}));

vi.mock('../services/api', () => ({
    api: {
        fetchDiff: vi.fn(),
        fetchFileContent: vi.fn(),
        saveFile: vi.fn(),
    }
}));

describe('DiffViewer Merge Logic', () => {
    const mockOnSaveFile = vi.fn();
    const mockOnFetchContent = vi.fn();
    const mockRefreshDiff = vi.fn();

    const mockDiffData: DiffData = {
        diff: [],
        left_rows: [{ line: 1, content: 'line1' }],
        right_rows: [{ line: 1, content: 'line1_mod' }],
    };

    const defaultProps = {
        mode: 'side-by-side' as const,
        diffData: mockDiffData,
        rawContent: null,
        loading: false,
        error: null,
        onReload: mockRefreshDiff,
        config: { viewOptions: {}, diffFilters: {} },
        onSaveFile: mockOnSaveFile,
        onFetchContent: mockOnFetchContent,
        leftPathBase: 'root',
        rightPathBase: 'root',
        relPath: 'file.txt',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handles replace merge correctly', async () => {
        // Mock Content Fetch
        mockOnFetchContent.mockResolvedValue({ content: "line1\nline2\nline3" });

        render(<DiffViewer {...defaultProps} />);

        // Click the trigger button in mocked SideBySideView
        const btn = screen.getByTestId('trigger-merge-replace');
        await act(async () => {
            btn.click();
        });

        // Verify Fetch was called
        await waitFor(() => {
            expect(mockOnFetchContent).toHaveBeenCalledWith('root/file.txt');
        });

        // Verify Save was called with replaced content
        await waitFor(() => {
            // Check for error first
            expect(screen.queryByText(/Merge failed/)).toBeNull();

            // Replaced line 1 ("line1") with "merged content"
            expect(mockOnSaveFile).toHaveBeenCalledWith(
                'root/file.txt',
                'merged content\nline2\nline3'
            );
        });

        // Verify Reload
        await waitFor(() => {
            expect(mockRefreshDiff).toHaveBeenCalled();
        });
    });

    // it('handles agent view line merge correctly', async () => {
    //    // TODO: Add unit test for AgentView component logic specifically.
    // });

    it('handles insert merge correctly', async () => {
        // Mock Content Fetch
        mockOnFetchContent.mockResolvedValue({ content: "line1\nline2" });

        render(<DiffViewer {...defaultProps} />);

        const btn = screen.getByTestId('trigger-merge-insert');
        await act(async () => {
            btn.click();
        });

        // Verify Save with inserted content
        await waitFor(() => {
            expect(screen.queryByText(/Merge failed/)).toBeNull();
            expect(mockOnSaveFile).toHaveBeenCalled();
        });
    });
});
