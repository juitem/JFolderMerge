import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiffViewer } from './DiffViewer';
import { api } from '../api';

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

vi.mock('../api', () => ({
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

    const mockDiffData = {
        diff: [],
        left_rows: [{ line: 1, type: 'removed', content: 'line1' }],
        right_rows: [{ line: 1, type: 'added', content: 'line1_mod' }],
        mode: 'side-by-side'
    };

    const defaultProps = {
        leftPathBase: 'root',
        rightPathBase: 'root',
        relPath: 'file.txt',
        initialMode: 'side-by-side' as const,
        config: { viewOptions: { mergeMode: 'group' }, diffFilters: {} },
        onReload: mockRefreshDiff,
        onSaveFile: mockOnSaveFile,
        onFetchContent: mockOnFetchContent,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (api.fetchDiff as any).mockResolvedValue(mockDiffData);
    });

    it('handles replace merge correctly', async () => {
        // Mock Content Fetch
        mockOnFetchContent.mockResolvedValue({ content: "line1\nline2\nline3" });

        render(<DiffViewer {...defaultProps} />);

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText(/Loading Diff/)).toBeNull();
        });

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
            expect(screen.queryByText(/Merge failed/)).toBeNull();
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

    it('handles insert merge correctly', async () => {
        // Mock Content Fetch
        mockOnFetchContent.mockResolvedValue({ content: "line1\nline2" });

        render(<DiffViewer {...defaultProps} />);

        await waitFor(() => {
            expect(screen.queryByText(/Loading Diff/)).toBeNull();
        });

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
