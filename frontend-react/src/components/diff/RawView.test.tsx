import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RawView } from './RawView';
import { api } from '../../api';

describe('RawView', () => {
    const defaultProps = {
        left: 'Left Content',
        right: 'Right Content',
    };

    // Mock API
    vi.mock('../../api', () => ({
        api: {
            saveFile: vi.fn(),
        }
    }));

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders normal editor view (split) by default', () => {
        render(<RawView {...defaultProps} />);
        expect(screen.getByText('Left')).toBeInTheDocument();
        expect(screen.getByText('Right')).toBeInTheDocument();
        // Check for textareas values
        expect(screen.getAllByRole('textbox')[0]).toHaveValue('Left Content');
        expect(screen.getAllByRole('textbox')[1]).toHaveValue('Right Content');
    });

    it('renders single view editor with default Right side', () => {
        render(<RawView {...defaultProps} mode="single" />);
        expect(screen.getByRole('textbox')).toHaveValue('Right Content');

        // Use more specific queries for buttons to avoid ambiguity if multiple exist (though valid text should be unique enough)
        expect(screen.getByText('Single View')).toBeInTheDocument();
        expect(screen.getByText('Left')).toBeInTheDocument();
        expect(screen.getByText('Right')).toBeInTheDocument();
    });

    it('allows editing and enables save button', async () => {
        render(<RawView {...defaultProps} mode="single" rightPath="/path/right.txt" />);

        const textarea = screen.getByRole('textbox');
        const saveBtn = screen.getByTitle('Save');

        expect(saveBtn).toBeDisabled();

        fireEvent.change(textarea, { target: { value: 'New Content' } });

        expect(textarea).toHaveValue('New Content');
        expect(saveBtn).toBeEnabled();

        // Test Undo
        const undoBtn = screen.getByTitle('Undo');
        expect(undoBtn).toBeEnabled();
        fireEvent.click(undoBtn);
        expect(textarea).toHaveValue('Right Content');

        // Test Redo
        const redoBtn = screen.getByTitle('Redo');
        expect(redoBtn).toBeEnabled();
        fireEvent.click(redoBtn);
        expect(textarea).toHaveValue('New Content');

        // Test Save
        fireEvent.click(saveBtn);
        expect(api.saveFile).toHaveBeenCalledWith('/path/right.txt', 'New Content');
    });

    it('handles keyboard shortcuts', () => {
        const { getByRole } = render(<RawView left="Left Content" right="Right Content" mode="single" />);
        const textarea = getByRole('textbox');

        // Type content
        fireEvent.change(textarea, { target: { value: 'Edited' } });
        expect(textarea).toHaveValue('Edited');

        // Cmd+Z (Undo)
        fireEvent.keyDown(textarea, {
            key: 'z',
            metaKey: true,
            nativeEvent: { stopImmediatePropagation: vi.fn() }
        });
        expect(textarea).toHaveValue('Right Content');

        // Cmd+Shift+Z (Redo)
        fireEvent.keyDown(textarea, {
            key: 'z',
            metaKey: true,
            shiftKey: true,
            nativeEvent: { stopImmediatePropagation: vi.fn() }
        });
        expect(textarea).toHaveValue('Edited');

        // Cmd+S (Save) - just verifying it doesn't crash, logic mocked deeper but at least handler fires
        // Real save verification would need mocking api.saveFile which we can do if we expand mock
        fireEvent.keyDown(textarea, {
            key: 's',
            metaKey: true,
            nativeEvent: { stopImmediatePropagation: vi.fn() }
        });

        // Test Tab Key
        // Helper to mimic selection since JSDOM doesn't handle it fully automatically for controlled inputs
        (textarea as HTMLTextAreaElement).selectionStart = 6; // 'Edited' length is 6
        (textarea as HTMLTextAreaElement).selectionEnd = 6;

        fireEvent.keyDown(textarea, {
            key: 'Tab',
            nativeEvent: { stopImmediatePropagation: vi.fn() }
        });
        // Expected: 'Edited' + '    ' (4 spaces)
        // Since the component uses requestAnimationFrame to set cursor, we just care about content here.
        // The mock onChange in test doesn't actually update the 'value' prop passed back to RawView unless we re-render?
        // Wait, current RawView test uses real RawView state? Yes.
        // So change actually updates the state.
        expect(textarea).toHaveValue('Edited    ');
    });

    it('toggles markdown preview', () => {
        const mdContent = '# Header\n* Bold *';
        render(<RawView left="" right={mdContent} mode="single" />);

        const toggleBtn = screen.getByTitle('Preview Markdown');
        fireEvent.click(toggleBtn);

        // Check for headings (markdown rendered)
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Header');

        // Toggle back
        fireEvent.click(screen.getByTitle('Edit Code'));
        expect(screen.getByRole('textbox')).toHaveValue(mdContent);
    });
});
