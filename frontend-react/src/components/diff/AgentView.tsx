import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../../api';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface DiffLine {
    type: 'same' | 'added' | 'removed' | 'header' | 'gap' | 'empty';
    content: string;
    leftLine?: number;
    rightLine?: number;
    gapStart?: number;
    gapEnd?: number;
}

interface DiffBlock {
    type: 'block-added' | 'block-removed';
    lines: DiffLine[];
}

type DiffItem = DiffLine | DiffBlock;

interface AgentViewProps {
    diff?: string[];
    showLineNumbers?: boolean;
    fullRightPath?: string;
    showSame?: boolean;
    onMerge?: (lines: string[], targetSide: 'left' | 'right', anchorLine: number, type: 'insert' | 'delete') => void;
    onNextFile?: () => void;
    onPrevFile?: () => void;
}

export interface AgentViewHandle {
    scrollToChange: (type: 'added' | 'removed' | 'any', direction: 'prev' | 'next') => void;
    mergeActiveBlock: () => void;
}

export const AgentView = React.forwardRef<AgentViewHandle, AgentViewProps>(({ diff, showLineNumbers = true, fullRightPath, showSame = false, onMerge, onNextFile, onPrevFile }, ref) => {
    // We store expanded lines in a map: gapKey -> string[]
    const [expandedContent, setExpandedContent] = useState<Record<string, string[]>>({});
    const [loadingGaps, setLoadingGaps] = useState<Record<string, boolean>>({});
    const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);

    // Reset expansion when diff changes
    useEffect(() => {
        setExpandedContent({});
        setLoadingGaps({});
    }, [diff]);

    const parsedItems = useMemo(() => {
        if (!diff) return [];
        const items: DiffItem[] = [];
        let leftLn = 0;
        let rightLn = 0;

        let currentBlock: DiffBlock | null = null;
        let lastRightLn = 0;
        // let lastLeftLn = 0; // Not strictly needed if we assume added blocks anchor to current left

        const flushBlock = () => {
            if (currentBlock) {
                items.push(currentBlock);
                currentBlock = null;
            }
        };

        for (const line of diff) {
            if (line.startsWith('---') || line.startsWith('+++')) {
                continue;
            }
            if (line.startsWith('@@')) {
                flushBlock();
                const match = line.match(/@@\s-(\d+)(?:,\d+)?\s\+(\d+)(?:,\d+)?\s@@/);
                if (match) {
                    const newLeftLn = parseInt(match[1], 10) - 1;
                    const newRightLn = parseInt(match[2], 10) - 1;

                    // Gap Detection
                    if (newRightLn > rightLn) {
                        const gapSize = newRightLn - rightLn;
                        if (gapSize > 0) {
                            items.push({
                                type: 'gap',
                                content: `Expand ${gapSize} lines`,
                                gapStart: rightLn + 1,
                                gapEnd: newRightLn,
                                rightLine: undefined
                            });
                        }
                    }
                    leftLn = newLeftLn;
                    rightLn = newRightLn;
                    lastRightLn = rightLn; // update anchor
                }
            } else if (line.startsWith('-')) {
                leftLn++;
                // Removed line: has leftLine, but no rightLine.
                // It effectively sits "at" the current rightLine position (lastRightLn).
                const lineObj: DiffLine = {
                    type: 'removed',
                    content: line.substring(1),
                    leftLine: leftLn,
                    // We attach the anchor info needed for the button
                    rightLine: lastRightLn // Use rightLine property to store the "Insert Anchor" for removed blocks
                };

                if (currentBlock && currentBlock.type === 'block-removed') {
                    currentBlock.lines.push(lineObj);
                } else {
                    flushBlock();
                    currentBlock = { type: 'block-removed', lines: [lineObj] };
                }
            } else if (line.startsWith('+')) {
                rightLn++;
                // Store leftLine as anchor (current leftLn)
                const lineObj: DiffLine = { type: 'added', content: line.substring(1), rightLine: rightLn, leftLine: leftLn };

                if (currentBlock && currentBlock.type === 'block-added') {
                    currentBlock.lines.push(lineObj);
                } else {
                    flushBlock();
                    currentBlock = { type: 'block-added', lines: [lineObj] };
                }
                lastRightLn = rightLn; // Added lines advance right counter
            } else if (line.startsWith(' ')) {
                flushBlock();
                leftLn++;
                rightLn++;
                lastRightLn = rightLn;
                items.push({ type: 'same', content: line.substring(1), leftLine: leftLn, rightLine: rightLn });
            } else {
                flushBlock();
                items.push({ type: 'empty', content: line });
            }
        }
        flushBlock();
        return items;
    }, [diff]);

    // Effect: Handle Global Context Toggle (mapped to showSame prop)
    useEffect(() => {
        if (showSame && fullRightPath) {
            const gaps = parsedItems.filter(l => (l as any).type === 'gap') as DiffLine[];
            if (gaps.length === 0) return;

            const fetchAndExpandAll = async () => {
                try {
                    const res = await api.fetchFileContent(fullRightPath);
                    if (res && res.content) {
                        const allLines = res.content.split(/\r?\n/);
                        const newExpanded: Record<string, string[]> = {};
                        gaps.forEach(gap => {
                            if (gap.gapStart && gap.gapEnd) {
                                const key = `${gap.gapStart}-${gap.gapEnd}`;
                                newExpanded[key] = allLines.slice(gap.gapStart - 1, gap.gapEnd);
                            }
                        });
                        setExpandedContent(prev => ({ ...prev, ...newExpanded }));
                    }
                } catch (e) { console.error(e); }
            };
            fetchAndExpandAll();
        } else if (!showSame && diff) {
            setExpandedContent({});
        }
    }, [showSame, parsedItems, fullRightPath]);

    const handleExpand = async (start: number, end: number) => {
        if (!fullRightPath) return;
        const key = `${start}-${end}`;
        if (loadingGaps[key]) return;
        setLoadingGaps(prev => ({ ...prev, [key]: true }));
        try {
            const res = await api.fetchFileContent(fullRightPath);
            if (res && res.content) {
                const allLines = res.content.split(/\r?\n/);
                const snippet = allLines.slice(start - 1, end);
                setExpandedContent(prev => ({ ...prev, [key]: snippet }));
            }
        } finally {
            setLoadingGaps(prev => ({ ...prev, [key]: false }));
        }
    };

    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => ({
        scrollToChange: (type: 'added' | 'removed' | 'any', direction: 'prev' | 'next') => {
            if (!containerRef.current) return;

            const selector = type === 'any' ? '.diff-block-group' : (type === 'added' ? '.group-added' : '.group-removed');
            const elements = Array.from(containerRef.current.querySelectorAll(selector));
            if (elements.length === 0) return;

            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();

            let targetEl: Element | null = null;
            const VIEWPORT_OFFSET = 50; // Buffer

            if (direction === 'next') {
                targetEl = elements.find(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.top > containerRect.top + VIEWPORT_OFFSET;
                }) || elements[0];
                if (!targetEl) targetEl = elements[0];
            } else {
                for (let i = elements.length - 1; i >= 0; i--) {
                    const rect = elements[i].getBoundingClientRect();
                    if (rect.top < containerRect.top - VIEWPORT_OFFSET) {
                        targetEl = elements[i];
                        break;
                    }
                }
                if (!targetEl) targetEl = elements[elements.length - 1];
            }

            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Update Active State
                const idx = (targetEl as HTMLElement).dataset.blockIndex;
                if (idx !== undefined) setActiveBlockIndex(parseInt(idx, 10));
            }
        },
        mergeActiveBlock: () => {
            if (activeBlockIndex === null || !diff) return;

            // Find block by index
            // parsedItems isn't easily indexed by blockIndex directly if we skip gaps/lines
            // But activeBlockIndex corresponds to the mapped index in parsedItems?
            // Yes, we assign key={idx} and data-block-index={idx}
            const item = parsedItems[activeBlockIndex];
            if (!item || !('lines' in item)) return;

            const block = item as DiffBlock;
            const isRemoved = block.type === 'block-removed';

            if (onMerge) {
                const content = block.lines.map(l => l.content);
                if (isRemoved) {
                    const anchor = block.lines[0].rightLine || 0;
                    onMerge(content, 'right', anchor, 'insert');
                } else {
                    const anchor = block.lines[0].leftLine || 0;
                    onMerge(content, 'left', anchor, 'insert');
                }
            }
        }
    }));

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Stop propagation to prevent global listeners (e.g. FolderTree) from intercepting
        // But only if we handle the key? Or always?
        // Let's propagate if we don't handle it, but for Arrows we handle.
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.stopPropagation();
        }

        if (e.key === 'Escape' || e.key === 'Tab') {
            e.preventDefault();
            const treeContainer = document.querySelector('.tree-container') as HTMLElement;
            treeContainer?.focus();
            return;
        }

        if (e.key === 'ArrowDown') {
            // Next Block
            e.preventDefault();

            // Find next block index
            let nextIdx = -1;
            for (let i = (activeBlockIndex !== null ? activeBlockIndex + 1 : 0); i < parsedItems.length; i++) {
                if ('lines' in parsedItems[i] && (parsedItems[i] as any).type.startsWith('block-')) {
                    nextIdx = i;
                    break;
                }
            }
            if (nextIdx !== -1) {
                setActiveBlockIndex(nextIdx);
                // Scroll to it
                const el = containerRef.current?.querySelector(`[data-block-index='${nextIdx}']`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();

            let prevIdx = -1;
            for (let i = (activeBlockIndex !== null ? activeBlockIndex - 1 : parsedItems.length - 1); i >= 0; i--) {
                if ('lines' in parsedItems[i] && (parsedItems[i] as any).type.startsWith('block-')) {
                    prevIdx = i;
                    break;
                }
            }
            if (prevIdx !== -1) {
                setActiveBlockIndex(prevIdx);
                const el = containerRef.current?.querySelector(`[data-block-index='${prevIdx}']`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        // Merge Shortcuts
        if (activeBlockIndex !== null && onMerge) {
            const item = parsedItems[activeBlockIndex];
            if (item && 'lines' in item) {
                const block = item as DiffBlock;
                const isRemoved = block.type === 'block-removed';

                if (e.key === 'ArrowRight' && e.shiftKey) {
                    e.preventDefault();
                    if (isRemoved) { // Red block -> Restores to right
                        const content = block.lines.map(l => l.content);
                        const anchor = block.lines[0].rightLine || 0;
                        onMerge(content, 'right', anchor, 'insert');
                    }
                } else if (e.key === 'ArrowLeft' && e.shiftKey) {
                    e.preventDefault();
                    if (!isRemoved) { // Green block -> Apply to left
                        const content = block.lines.map(l => l.content);
                        const anchor = block.lines[0].leftLine || 0;
                        onMerge(content, 'left', anchor, 'insert');
                    }
                }
            }
        }
    };

    if (!diff) return <div className="p-4 text-gray-500">No Diff Data</div>;

    const renderLine = (line: DiffLine, idx: number) => (
        <div key={idx} className={`agent-diff-row ${line.type}`}>
            {showLineNumbers && (
                <>
                    <div className="agent-gutter noselect">
                        {/* For added lines, we stored anchor in leftLine, but shouldn't display it */}
                        {line.type === 'added' ? '' : (line.leftLine || '')}
                    </div>
                    <div className="agent-gutter noselect">
                        {/* For removed lines, we stored anchor in rightLine, but we shouldn't display it as line number if it's the anchor */}
                        {line.type === 'removed' ? '' : (line.rightLine || '')}
                    </div>
                </>
            )}
            <div className="agent-content" style={{ paddingLeft: '20px' }}>{line.content}</div>
        </div>
    );

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.focus();
    };

    return (
        <div className="agent-view-container custom-scroll" ref={containerRef}
            style={{ padding: '10px', outline: 'none', border: '2px solid transparent' }}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onClick={handleContainerClick}
            onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
            <div className="agent-diff-table">
                {parsedItems.map((item, idx) => {
                    if ('lines' in item) {
                        // Block
                        const block = item as DiffBlock;
                        const isRemoved = block.type === 'block-removed';
                        const blockClass = isRemoved ? 'group-removed' : 'group-added';
                        const isActive = activeBlockIndex === idx;

                        return (
                            <div
                                key={idx}
                                data-block-index={idx}
                                className={`diff-block-group ${blockClass} ${isActive ? 'active' : ''}`}
                                style={{ position: 'relative', cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveBlockIndex(idx);
                                    // Ensure container is focused so keyboard works
                                    if (containerRef.current) containerRef.current.focus();
                                }}
                            >
                                {block.lines.map((l, i) => renderLine(l, i))}
                                <div className="merge-action-overlay" style={{
                                    position: 'absolute',
                                    zIndex: 10,
                                    opacity: 0.6,
                                    transition: 'opacity 0.2s',
                                    top: '0px',
                                    left: showLineNumbers
                                        ? (isRemoved ? '52px' : '108px')
                                        : (isRemoved ? '2px' : '2px')
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                >
                                    {isRemoved && onMerge && (
                                        <button className="icon-btn xs" title="Copy to Right (Restore)"
                                            style={{
                                                background: 'rgba(50,0,0,0.8)',
                                                color: '#f87171',
                                                border: '1px solid #f87171',
                                                borderRadius: '0',
                                                width: '20px',
                                                height: '20px',
                                                padding: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onClick={() => {
                                                const anchor = block.lines[0].rightLine || 0; // Stored anchor
                                                const content = block.lines.map(l => l.content);
                                                onMerge(content, 'right', anchor, 'insert');
                                            }}
                                        >
                                            <ArrowRight size={12} />
                                        </button>
                                    )}
                                    {!isRemoved && onMerge && (
                                        <button className="icon-btn xs" title="Copy to Left (Apply)"
                                            style={{
                                                background: 'rgba(0,50,0,0.8)',
                                                color: '#4ade80',
                                                border: '1px solid #4ade80',
                                                borderRadius: '0',
                                                width: '20px',
                                                height: '20px',
                                                padding: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onClick={() => {
                                                // Added Block (Right). Copy to Left.
                                                // We stored the anchor in block.lines[0].leftLine
                                                const anchor = block.lines[0].leftLine || 0;
                                                const content = block.lines.map(l => l.content);
                                                onMerge(content, 'left', anchor, 'insert');
                                            }}
                                        >
                                            <ArrowLeft size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    const line = item as DiffLine;

                    if (line.type === 'gap') {
                        const key = `${line.gapStart}-${line.gapEnd}`;
                        const expandedLines = expandedContent[key];

                        if (expandedLines || showSame) {
                            if (!expandedLines) {
                                return (
                                    <div key={idx} className="agent-diff-row gap">
                                        <div className="agent-gap-bar">Loading Context...</div>
                                    </div>
                                );
                            }
                            return expandedLines.map((content, i) => (
                                <div key={`${key}-${i}`} className="agent-diff-row same expanded">
                                    {showLineNumbers && (
                                        <>
                                            <div className="agent-gutter noselect"></div>
                                            <div className="agent-gutter noselect">{(line.gapStart || 0) + i}</div>
                                        </>
                                    )}
                                    <div className="agent-content">{content}</div>
                                </div>
                            ));
                        }

                        return (
                            <div key={idx} className="agent-diff-row gap" onClick={() => line.gapStart && line.gapEnd && handleExpand(line.gapStart, line.gapEnd)}>
                                <div className="agent-gap-bar">
                                    {loadingGaps[key] ? 'Loading...' : `↕ ${line.content}`}
                                </div>
                            </div>
                        );
                    }

                    return renderLine(line, idx);
                })}
            </div>
        </div>
    );
});
