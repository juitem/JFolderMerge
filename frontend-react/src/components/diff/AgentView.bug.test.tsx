import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentView } from './AgentView';
import { api } from '../../api';

// Mock Lucide
vi.mock('lucide-react', () => ({
    ArrowLeft: () => <div />,
    ArrowRight: () => <div />,
    Trash2: () => <div />,
    CheckCircle: () => <div />,
    ChevronsUp: () => <div />,
    ChevronsDown: () => <div />,
    ChevronUp: () => <div />,
    ChevronDown: () => <div />,
    ArrowLeftRight: () => <div />,
}));

// Mock API
vi.mock('../../api', () => ({
    api: {
        fetchFileContent: vi.fn(),
    }
}));

// Mock KeyLogger
vi.mock('../../hooks/useKeyLogger', () => ({
    useKeyLogger: () => ({ logKey: vi.fn() }),
}));

describe('AgentView Same Filter Bug', () => {
    const diffWithGap = [
        '@@ -10,1 +10,1 @@',
        '+added_line'
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock full content
        (api.fetchFileContent as any).mockResolvedValue({
            content: Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n')
        });
    });

    const flushPromises = () => act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('toggles gap expansion when showSame changes', async () => {
        const { rerender, container, debug } = render(
            <AgentView
                diff={diffWithGap}
                showSame={false}
                fullRightPath="file.txt"
            />
        );
        await flushPromises();

        // Should receive gap
        const gaps = container.querySelectorAll('.agent-diff-row.gap');
        if (gaps.length === 0) {
            console.log("DEBUG: No gaps found. HTML:", container.innerHTML);
        }
        expect(gaps.length).toBeGreaterThan(0);
        expect(container.textContent).toContain('Expand');

        // Manually expand - THIS IS KEY TO REPRODUCING THE BUG
        const gapBar = container.querySelector('.agent-gap-bar');
        if (gapBar) {
            fireEvent.click(gapBar);
        }
        await flushPromises();
        expect(container.textContent).toContain('line 1'); // Should be expanded now

        // Toggle showSame = true
        rerender(
            <AgentView
                diff={diffWithGap}
                showSame={true}
                fullRightPath="file.txt"
            />
        );
        await flushPromises();

        // Should still be expanded
        expect(container.textContent).not.toContain('Expand');
        expect(container.textContent).toContain('line 1');

        // Toggle showSame = false
        rerender(
            <AgentView
                diff={diffWithGap}
                showSame={false}
                fullRightPath="file.txt"
            />
        );
        await flushPromises();

        // Should be gap again (BUT WILL FAIL IF BUG EXISTS)
        const gaps2 = container.querySelectorAll('.agent-diff-row.gap');
        expect(gaps2.length).toBeGreaterThan(0);
        expect(container.textContent).toContain('Expand');
    });
});
