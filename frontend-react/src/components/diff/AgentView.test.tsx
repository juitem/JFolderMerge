import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentView } from './AgentView';

// Mock Lucide Icons
vi.mock('lucide-react', () => ({
    ArrowLeft: () => <div data-testid="icon-arrow-left" />,
    ArrowRight: () => <div data-testid="icon-arrow-right" />,
    Trash2: () => <div data-testid="icon-trash" />,
    CheckCircle: () => <div data-testid="icon-check" />,
    ChevronsUp: () => <div data-testid="icon-chevrons-up" />,
    ChevronsDown: () => <div data-testid="icon-chevrons-down" />,
    ChevronUp: () => <div data-testid="icon-chevron-up" />,
    ChevronDown: () => <div data-testid="icon-chevron-down" />,
    ArrowLeftRight: () => <div data-testid="icon-arrow-left-right" />,
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

describe('AgentView Navigation & Focus Logic', () => {
    const mockDiffLong = [
        '@@ -1,5 +1,6 @@',
        '-remove1',
        '+add1',
        ' unchanged',
        '-remove2',
        '+add2',
    ];

    beforeEach(() => {
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
        vi.clearAllMocks();
    });

    const flushPromises = () => act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('Smart Jump (Normal Down): Highlight both in a pair', async () => {
        const { container } = render(<AgentView diff={mockDiffLong} mergeMode="group" fullRightPath="file.txt" />);
        await flushPromises();
        const av = container.querySelector('.agent-view-container') as HTMLElement;
        av.focus();

        const blocks = container.querySelectorAll('.diff-block-group');
        // Initial auto-focus (Smart mode) -> highlight both 0 and 1
        expect(blocks[0].className).toContain('active');
        expect(blocks[1].className).toContain('active');
    });

    it('Strict Smart Mode: Shift + Down does NOT override smart behavior', async () => {
        const { container } = render(<AgentView diff={mockDiffLong} mergeMode="group" fullRightPath="file.txt" />);
        await flushPromises();
        const av = container.querySelector('.agent-view-container') as HTMLElement;
        av.focus();

        const blocks = container.querySelectorAll('.diff-block-group');

        // Shift + Down -> In Smart mode, this should behave like normal Down 
        // (Jumping PAST index 1 if 0 is head of a pair)
        // Wait, mockDiffLong: 0 is remove, 1 is add -> PAIR.
        // So ArrowDown (with or without shift) should jump to the NEXT pair/block After index 1.
        // There is no next block in mockDiffLong after index 3 (lines 37-38).

        // Let's re-verify mockDiffLong: 
        // 0: -remove1 (head)
        // 1: +add1 (tail)
        // 2: unchanged (text)
        // 3: -remove2 (head)
        // 4: +add2 (tail)

        // ArrowDown from 0/1 should land on 3/4 (parsedItems) which are blocks[2] and blocks[3]
        await act(async () => {
            fireEvent.keyDown(av, { key: 'ArrowDown', shiftKey: true });
        });
        await flushPromises();

        expect(blocks[2].className).toContain('active');
        expect(blocks[3].className).toContain('active');
        expect(blocks[1].className).not.toContain('active');
    });

    it('U Key Toggle: Should call onMergeModeChange', async () => {
        const onModeChange = vi.fn();
        const { container } = render(
            <AgentView diff={mockDiffLong} mergeMode="group" onMergeModeChange={onModeChange} />
        );
        await flushPromises();
        const av = container.querySelector('.agent-view-container') as HTMLElement;
        av.focus();

        await act(async () => {
            fireEvent.keyDown(av, { key: 'u' });
        });

        expect(onModeChange).toHaveBeenCalled();
    });

    it('Unit mode: Highlight ONLY the selected block', async () => {
        const { container } = render(<AgentView diff={mockDiffLong} mergeMode="unit" fullRightPath="file.txt" />);
        await flushPromises();
        const av = container.querySelector('.agent-view-container') as HTMLElement;
        av.focus();

        const blocks = container.querySelectorAll('.diff-block-group');
        // Initial auto-focus in Unit mode -> only idx 0 highlighted
        expect(blocks[0].className).toContain('active');
        expect(blocks[1].className).not.toContain('active');
    });
});
