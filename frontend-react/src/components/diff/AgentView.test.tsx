import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
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

    it('Block Jump (Shift Down): Highlight ONLY the selected block', async () => {
        const { container } = render(<AgentView diff={mockDiffLong} mergeMode="group" fullRightPath="file.txt" />);
        await flushPromises();
        const av = container.querySelector('.agent-view-container') as HTMLElement;
        av.focus();

        const blocks = container.querySelectorAll('.diff-block-group');

        // Shift + Down -> Jump logically to index 1 (add1)
        await act(async () => {
            fireEvent.keyDown(av, { key: 'ArrowDown', shiftKey: true });
        });
        await flushPromises();

        // Logical focus is on index 1. 
        // Since we used Shift, granularity is 'block'. 
        // Thus, index 0 (partner) should NOT be active anymore.
        expect(blocks[1].className).toContain('active');
        expect(blocks[0].className).not.toContain('active');
    });

    it('Unit mode: Highlight ONLY the selected block (No Shift needed)', async () => {
        const { container } = render(<AgentView diff={mockDiffLong} mergeMode="line" fullRightPath="file.txt" />);
        await flushPromises();
        const av = container.querySelector('.agent-view-container') as HTMLElement;
        av.focus();

        const blocks = container.querySelectorAll('.diff-block-group');
        // Initial auto-focus in Unit mode -> only idx 0 highlighted
        expect(blocks[0].className).toContain('active');
        expect(blocks[1].className).not.toContain('active');
    });
});
