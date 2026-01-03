import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../../api';
import { ArrowLeft, ArrowRight, Trash2, CheckCircle, ChevronsUp, ChevronsDown, ChevronUp, ChevronDown, ArrowLeftRight } from 'lucide-react';
import { useKeyLogger } from '../../hooks/useKeyLogger';

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
    onMerge?: (lines: string[], targetSide: 'left' | 'right', anchorLine: number, type: 'insert' | 'delete' | 'replace', deleteCount?: number) => void;
    onNextFile?: () => void;
    onPrevFile?: () => void;
    wrap?: boolean;
    scrollerRef?: (el: HTMLElement | Window | null) => void;
    smoothScroll?: boolean;
    mergeMode?: 'group' | 'line';
    onShowConfirm?: (title: string, message: string, action: () => void) => void;
}

export interface AgentViewHandle {
    scrollToChange: (type: 'added' | 'removed' | 'any', direction: 'prev' | 'next' | 'first' | 'last') => void;
    mergeActiveBlock: () => void; // Merge (Green) / Delete (Delete Left) - ACCEPT
    deleteActiveBlock: () => void; // Revert (Trash) / Restore (Arrow) - REJECT
}

export const AgentView = React.forwardRef<AgentViewHandle, AgentViewProps>(
    (props, ref) => {
        const { diff, showLineNumbers = true, fullRightPath, showSame = false, onMerge, wrap, mergeMode = 'group', onShowConfirm } = props;
        const [expandedContent, setExpandedContent] = useState<Record<string, string[]>>({});
        const [loadingGaps, setLoadingGaps] = useState<Record<string, boolean>>({});
        const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
        const [focusGranularity, setFocusGranularity] = useState<'smart' | 'block'>('smart');
        const [focusZone, setFocusZone] = useState<'content' | 'revert' | 'accept'>('content');

        const containerRef = React.useRef<HTMLDivElement>(null);

        // Only reset state when the file actually changes.
        // If just the diff updates (after a merge), we want to preserve the active block index.
        useEffect(() => {
            setExpandedContent({});
            setLoadingGaps({});
            setActiveBlockIndex(null);
        }, [fullRightPath]);

        const parsedItems = useMemo(() => {
            if (!diff) return [];
            const items: DiffItem[] = [];
            let leftLn = 0;
            let rightLn = 0;
            let currentBlock: DiffBlock | null = null;
            let lastRightLn = 0;

            const flushBlock = () => {
                if (currentBlock) {
                    items.push(currentBlock);
                    currentBlock = null;
                }
            };

            for (const line of diff) {
                if (line.startsWith('---') || line.startsWith('+++')) continue;
                if (line.startsWith('@@')) {
                    flushBlock();
                    const match = line.match(/@@\s-(\d+)(?:,\d+)?\s\+(\d+)(?:,\d+)?\s@@/);
                    if (match) {
                        const newLeftLn = parseInt(match[1], 10) - 1;
                        const newRightLn = parseInt(match[2], 10) - 1;

                        if (newRightLn > rightLn) {
                            const gapSize = newRightLn - rightLn;
                            if (gapSize > 0) {
                                items.push({
                                    type: 'gap',
                                    content: `Expand ${gapSize} lines`,
                                    gapStart: rightLn + 1,
                                    gapEnd: newRightLn
                                });
                            }
                        }
                        leftLn = newLeftLn;
                        rightLn = newRightLn;
                        lastRightLn = rightLn;
                    }
                } else if (line.startsWith('-')) {
                    leftLn++;
                    const lineObj: DiffLine = {
                        type: 'removed',
                        content: line.substring(1),
                        leftLine: leftLn,
                        rightLine: lastRightLn
                    };
                    if (currentBlock && currentBlock.type === 'block-removed') {
                        currentBlock.lines.push(lineObj);
                    } else {
                        flushBlock();
                        currentBlock = { type: 'block-removed', lines: [lineObj] };
                    }
                } else if (line.startsWith('+')) {
                    rightLn++;
                    const lineObj: DiffLine = { type: 'added', content: line.substring(1), rightLine: rightLn, leftLine: leftLn };
                    if (currentBlock && currentBlock.type === 'block-added') {
                        currentBlock.lines.push(lineObj);
                    } else {
                        flushBlock();
                        currentBlock = { type: 'block-added', lines: [lineObj] };
                    }
                    lastRightLn = rightLn;
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

        // [Compliance] Auto-focus the first change block on file load
        useEffect(() => {
            if (parsedItems.length > 0 && activeBlockIndex === null) {
                const firstBlockIdx = parsedItems.findIndex(item => (item as any).type?.startsWith('block-'));
                if (firstBlockIdx !== -1) {
                    setActiveBlockIndex(firstBlockIdx);
                }
            }
        }, [parsedItems, activeBlockIndex]);

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

        // Adjust activeBlockIndex when parsedItems changes (e.g. after a merge)
        useEffect(() => {
            if (parsedItems.length === 0) {
                setActiveBlockIndex(null);
                return;
            }

            // 1. If nothing is selected, find the first available block
            if (activeBlockIndex === null) {
                const firstBlockIdx = parsedItems.findIndex(item => 'lines' in item);
                if (firstBlockIdx !== -1) {
                    setActiveBlockIndex(firstBlockIdx);
                    setTimeout(() => {
                        const el = containerRef.current?.querySelector(`[data-block-index='${firstBlockIdx}']`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            } else {
                // 2. If already selected, check if it's still a block (it might have become "same" after merge)
                // Ensure index is within bounds before checking
                const safeIdx = Math.min(activeBlockIndex, parsedItems.length - 1);
                const currentItem = parsedItems[safeIdx];

                if (!currentItem || !('lines' in currentItem)) {
                    // The current index is no longer a block. 
                    // Find the NEAREST block (preferring forward, then backward).
                    let foundIdx = -1;
                    // Look forward
                    for (let i = safeIdx; i < parsedItems.length; i++) {
                        const item = parsedItems[i];
                        if (item && 'lines' in item) { foundIdx = i; break; }
                    }
                    // If not found forward, look backward
                    if (foundIdx === -1) {
                        for (let i = Math.min(safeIdx - 1, parsedItems.length - 1); i >= 0; i--) {
                            const item = parsedItems[i];
                            if (item && 'lines' in item) { foundIdx = i; break; }
                        }
                    }

                    if (foundIdx !== -1) {
                        setActiveBlockIndex(foundIdx);
                        setTimeout(() => {
                            const el = containerRef.current?.querySelector(`[data-block-index='${foundIdx}']`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            containerRef.current?.focus();
                        }, 0);
                    } else {
                        // No blocks found anywhere
                        setActiveBlockIndex(null);
                    }
                }
            }

            // 3. Robust Focus Maintenance:
            setTimeout(() => {
                if (document.activeElement === document.body || document.activeElement === null) {
                    containerRef.current?.focus();
                }
            }, 100);
        }, [parsedItems]);

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

        const scrollToChangeInternal = (type: 'added' | 'removed' | 'any', direction: 'prev' | 'next' | 'first' | 'last') => {
            if (!diff || parsedItems.length === 0) return;
            const isMatch = (item: DiffItem) => {
                if (!('lines' in item)) return false;
                const block = item as DiffBlock;
                if (type === 'any') return true;
                if (type === 'added' && block.type === 'block-added') return true;
                if (type === 'removed' && block.type === 'block-removed') return true;
                return false;
            };

            const start = activeBlockIndex !== null ? activeBlockIndex : (direction === 'next' ? -1 : parsedItems.length);
            let foundIdx = -1;

            if (direction === 'first') {
                foundIdx = parsedItems.findIndex(isMatch);
            } else if (direction === 'last') {
                for (let i = parsedItems.length - 1; i >= 0; i--) if (isMatch(parsedItems[i])) { foundIdx = i; break; }
            } else if (direction === 'next') {
                for (let i = start + 1; i < parsedItems.length; i++) if (isMatch(parsedItems[i])) { foundIdx = i; break; }
                if (foundIdx === -1) for (let i = 0; i <= start; i++) if (isMatch(parsedItems[i])) { foundIdx = i; break; }
            } else {
                for (let i = start - 1; i >= 0; i--) if (isMatch(parsedItems[i])) { foundIdx = i; break; }
                if (foundIdx === -1) for (let i = parsedItems.length - 1; i >= start; i--) if (isMatch(parsedItems[i])) { foundIdx = i; break; }
            }

            if (foundIdx !== -1) {
                setActiveBlockIndex(foundIdx);
                setTimeout(() => {
                    const el = containerRef.current?.querySelector(`[data-block-index='${foundIdx}']`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 0);
            }
        };

        const handleMergeBlock = (isSmartParam?: boolean) => {
            if (activeBlockIndex === null) return;
            const item = parsedItems[activeBlockIndex];
            if (!item || !('lines' in item)) return;
            const block = item as DiffBlock;

            if (onMerge) {
                const isSmart = isSmartParam !== undefined ? isSmartParam : (mergeMode === 'group');
                const content = block.lines.map(l => l.content);
                const anchor = block.lines[0].leftLine || 0;

                if (block.type === 'block-removed') {
                    // Accept Removal (Delete from Left)
                    onMerge(content, 'left', anchor, 'delete');
                } else {
                    // Merge Added Block to Left
                    let deleteCount = 0;
                    if (isSmart && activeBlockIndex > 0) {
                        const prev = parsedItems[activeBlockIndex - 1];
                        if ('lines' in prev && (prev as DiffBlock).type === 'block-removed') {
                            deleteCount = (prev as DiffBlock).lines.length;
                        }
                    }

                    if (deleteCount > 0) {
                        onMerge(content, 'left', anchor, 'replace', deleteCount);
                    } else {
                        onMerge(content, 'left', anchor, 'insert');
                    }
                }
            }
        };

        const handleDeleteBlock = (isSmartParam?: boolean) => {
            if (activeBlockIndex === null) return;
            const item = parsedItems[activeBlockIndex];
            if (!item || !('lines' in item)) return;
            const block = item as DiffBlock;

            if (onMerge) {
                const isSmart = isSmartParam !== undefined ? isSmartParam : (mergeMode === 'group');
                const content = block.lines.map(l => l.content);
                const startLine = block.lines[0].rightLine || 0;

                if (block.type === 'block-removed') {
                    // Revert Removal -> Insert back to Right (Restore)
                    let nextIsAdded = false;
                    let nextItemCount = 0;

                    if (isSmart && activeBlockIndex + 1 < parsedItems.length) {
                        const next = parsedItems[activeBlockIndex + 1];
                        if ('lines' in next && (next as DiffBlock).type === 'block-added') {
                            nextIsAdded = true;
                            nextItemCount = (next as DiffBlock).lines.length;
                        }
                    }

                    if (nextIsAdded) {
                        const nextItem = parsedItems[activeBlockIndex + 1] as DiffBlock;
                        onMerge(content, 'right', nextItem.lines[0].rightLine || 0, 'replace', nextItemCount);
                    } else {
                        onMerge(content, 'right', startLine, 'insert');
                    }
                } else {
                    // Revert Added Block -> Delete from Right
                    let prevIsRemoved = false;
                    let prevItemContent: string[] = [];

                    if (isSmart && activeBlockIndex > 0) {
                        const prev = parsedItems[activeBlockIndex - 1];
                        if ('lines' in prev && (prev as DiffBlock).type === 'block-removed') {
                            prevIsRemoved = true;
                            prevItemContent = (prev as DiffBlock).lines.map(l => l.content);
                        }
                    }

                    if (prevIsRemoved) {
                        onMerge(prevItemContent, 'right', startLine, 'replace', block.lines.length);
                    } else {
                        onMerge(content, 'right', startLine, 'delete');
                    }
                }
            }
        };

        React.useImperativeHandle(ref, () => ({
            scrollToChange: (type, direction) => scrollToChangeInternal(type, direction),
            mergeActiveBlock: handleMergeBlock,
            deleteActiveBlock: handleDeleteBlock
        }));

        const { logKey } = useKeyLogger('AgentView');

        const handleKeyDown = (e: React.KeyboardEvent) => {
            logKey(e, { activeBlockIndex });
            if (e.key === 'Escape' || e.key === 'Tab') {
                e.preventDefault();
                (document.querySelector('.tree-container') as HTMLElement)?.focus();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const navMode = (e.shiftKey || mergeMode !== 'group') ? 'block' : 'smart';
                navigateBlock('next', navMode);
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const navMode = (e.shiftKey || mergeMode !== 'group') ? 'block' : 'smart';
                navigateBlock('prev', navMode);
            }
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (e.shiftKey && onMerge && activeBlockIndex !== null) {
                    handleDeleteBlock(false); // REVERT - FORCE UNIT
                } else if (activeBlockIndex !== null) {
                    if (focusZone === 'revert') setFocusZone('accept');
                    else if (focusZone === 'accept') setFocusZone('content');
                }
            }
            else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (e.shiftKey && onMerge && activeBlockIndex !== null) {
                    handleMergeBlock(false); // ACCEPT - FORCE UNIT
                } else if (activeBlockIndex !== null) {
                    if (focusZone === 'content') setFocusZone('accept');
                    else if (focusZone === 'accept') setFocusZone('revert');
                }
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeBlockIndex !== null) {
                    if (focusZone === 'accept') {
                        const action = () => handleMergeBlock();
                        if (onShowConfirm) {
                            onShowConfirm("Confirm Merge", "Apply this change to the left side?", action);
                        } else {
                            action();
                        }
                    }
                    else if (focusZone === 'revert') {
                        const action = () => handleDeleteBlock();
                        if (onShowConfirm) {
                            onShowConfirm("Confirm Revert", "Revert this change on the right side?", action);
                        } else {
                            action();
                        }
                    }
                }
            }
            else if (e.key === 'a') { e.preventDefault(); scrollToChangeInternal('added', 'prev'); }
            else if (e.key === 's') { e.preventDefault(); scrollToChangeInternal('added', 'next'); }
            else if (e.key === 'e') { e.preventDefault(); scrollToChangeInternal('removed', 'prev'); }
            else if (e.key === 'r') { e.preventDefault(); scrollToChangeInternal('removed', 'next'); }
        };

        const navigateBlock = (direction: 'next' | 'prev', mode: 'smart' | 'block') => {
            let newIdx = -1;
            const start = activeBlockIndex !== null ? activeBlockIndex : (direction === 'next' ? -1 : parsedItems.length);

            // Helpers to detect pairs
            const isPairStart = (i: number) => {
                const item = parsedItems[i];
                if (!item || !('lines' in item) || (item as any).type !== 'block-removed') return false;
                const next = parsedItems[i + 1];
                return next && 'lines' in next && (next as any).type === 'block-added';
            };
            const isPairEnd = (i: number) => {
                const item = parsedItems[i];
                if (!item || !('lines' in item) || (item as any).type !== 'block-added') return false;
                const prev = parsedItems[i - 1];
                return prev && 'lines' in prev && (prev as any).type === 'block-removed';
            };

            if (direction === 'next') {
                let i = start + 1;
                if (mode === 'smart' && start !== -1 && isPairStart(start)) i = start + 2; // Jump PAST the partner

                for (; i < parsedItems.length; i++) {
                    if ('lines' in parsedItems[i]) {
                        newIdx = i;
                        break;
                    }
                }
            } else {
                let i = start - 1;
                if (mode === 'smart' && start !== -1 && isPairEnd(start)) i = start - 2; // Jump PAST the partner

                for (; i >= 0; i--) {
                    if ('lines' in parsedItems[i]) {
                        newIdx = i;
                        // If we land on an end-of-pair in smart mode, shift to the head
                        if (mode === 'smart' && isPairEnd(i)) newIdx = i - 1;
                        break;
                    }
                }
            }

            if (newIdx !== -1) {
                setActiveBlockIndex(newIdx);
                setFocusGranularity(mode);
                setFocusZone('content');
                setTimeout(() => {
                    const el = containerRef.current?.querySelector(`[data-block-index='${newIdx}']`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 0);
            }
        };

        const renderLine = (line: DiffLine, idx: number, isActive: boolean = false) => (
            <div key={idx} className={`agent-diff-row ${line.type} ${isActive ? 'active' : ''}`}>
                {showLineNumbers && (
                    <>
                        <div className="agent-gutter noselect">{line.type === 'added' ? '' : line.leftLine || ''}</div>
                        <div className="agent-gutter noselect">{line.type === 'removed' ? '' : line.rightLine || ''}</div>
                    </>
                )}
                <div className="agent-content" style={{
                    paddingLeft: '60px',
                    whiteSpace: wrap ? 'pre-wrap' : 'pre',
                    wordBreak: wrap ? 'break-all' : 'normal'
                }}>{line.content}</div>
            </div>
        );

        if (!diff) return <div className="p-4 text-gray-500">No Diff Data</div>;

        const hasBlocks = parsedItems.some(item => 'lines' in item);

        return (
            <div className="agent-view-container custom-scroll"
                ref={(el) => {
                    // @ts-ignore
                    containerRef.current = el;
                    if (props.scrollerRef) props.scrollerRef(el);
                }}
                style={{
                    padding: '0', // Removed global padding to flush header
                    outline: 'none',
                    border: '2px solid transparent',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0
                }}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.currentTarget.focus()}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
                <div className="agent-control-bar" style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px',
                    background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)',
                    position: 'sticky', top: 0, zIndex: 20, marginBottom: '0',
                    opacity: 1
                }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: 'auto' }}>
                        Agent Controls
                    </span>

                    {/* Navigation Group */}
                    <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
                        <button className="icon-btn small" onClick={() => scrollToChangeInternal('any', 'first')} title="First Change">
                            <ChevronsUp size={14} />
                        </button>
                        <button className="icon-btn small" onClick={() => scrollToChangeInternal('any', 'prev')} title="Previous Change">
                            <ChevronUp size={14} />
                        </button>
                        <button className="icon-btn small" onClick={() => scrollToChangeInternal('any', 'next')} title="Next Change">
                            <ChevronDown size={14} />
                        </button>
                        <button className="icon-btn small" onClick={() => scrollToChangeInternal('any', 'last')} title="Last Change">
                            <ChevronsDown size={14} />
                        </button>
                    </div>

                    <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }}></div>

                    {/* Merge Group */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="merge-btn small"
                            style={{ width: 'auto', padding: '0 8px', gap: '4px', fontSize: '0.8rem', height: '24px' }}
                            onClick={() => {
                                if (activeBlockIndex !== null) handleDeleteBlock();
                            }} title={`Merge Left to Right (Overwrite Right) [${mergeMode}]`}>
                            <ArrowRight size={14} />
                            Merge
                            <sup style={{ color: '#ec4899', fontWeight: 800, marginLeft: '2px' }}>R</sup>
                        </button>
                        <button className="merge-btn small"
                            style={{ width: 'auto', padding: '0 8px', gap: '4px', fontSize: '0.8rem', height: '24px' }}
                            onClick={() => {
                                if (activeBlockIndex !== null) handleMergeBlock();
                            }} title={`Merge Right to Left (Overwrite Left) [${mergeMode}]`}>
                            <ArrowLeft size={14} />
                            Merge
                            <sup style={{ color: '#10b981', fontWeight: 800, marginLeft: '2px' }}>L</sup>
                        </button>
                    </div>
                </div>

                {
                    !hasBlocks ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--panel-bg)',
                            borderRadius: 'var(--radius-lg)',
                            margin: '10px',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.2)'
                        }}>
                            <div className="text-center p-8">
                                <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto 20px auto', opacity: 0.8 }} />
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>All changes merged!</h3>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '1.1rem' }}>This file is now synchronized.</p>
                                <div style={{ marginTop: '24px', padding: '8px 16px', backgroundColor: 'var(--hover-bg)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Press <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', color: '#eee' }}>Esc</kbd> to return to folder tree
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="agent-diff-table" style={{ flex: 1, padding: '0 10px 10px 10px' }}>
                            {parsedItems.map((item, idx) => {
                                if ('lines' in item) {
                                    const block = item as DiffBlock;
                                    const blockClass = block.type === 'block-removed' ? 'group-removed' : 'group-added';

                                    const isSelfActive = activeBlockIndex === idx;
                                    const next = parsedItems[idx + 1];
                                    const prev = parsedItems[idx - 1];
                                    const isPairStartHead = block.type === 'block-removed' && next && 'lines' in next && (next as any).type === 'block-added';
                                    const isPairEndTail = block.type === 'block-added' && prev && 'lines' in prev && (prev as any).type === 'block-removed';

                                    const isPartnerActive = mergeMode === 'group' && focusGranularity === 'smart' && (
                                        (isPairStartHead && activeBlockIndex === idx + 1) ||
                                        (isPairEndTail && activeBlockIndex === idx - 1)
                                    );
                                    const isActive = isSelfActive || isPartnerActive;

                                    return (
                                        <div key={idx} data-block-index={idx}
                                            className={`diff-block-group ${blockClass} ${isActive ? 'active' : ''}`}
                                            style={{
                                                position: 'relative',
                                                cursor: 'pointer',
                                                boxShadow: (isActive && focusZone === 'content') ? 'inset 0 0 0 2px var(--accent-color, #6366f1)' : 'none'
                                            }}
                                            onClick={(e) => { e.stopPropagation(); setActiveBlockIndex(idx); setFocusGranularity(mergeMode === 'group' ? 'smart' : 'block'); setFocusZone('content'); containerRef.current?.focus(); }}
                                        >
                                            {block.lines.map((l, i) => renderLine(l, i))}

                                            {/* Smart Pair Indicator */}
                                            {(() => {
                                                const isPairStart = mergeMode === 'group' && isPairStartHead;
                                                const isPairEnd = mergeMode === 'group' && isPairEndTail;

                                                if (isPairStart || isPairEnd) {
                                                    return (
                                                        <div className="smart-pair-indicator" style={{
                                                            position: 'absolute', top: '4px', right: '8px', zIndex: 5,
                                                            color: 'var(--accent-color, #6366f1)', opacity: 0.4,
                                                            display: 'flex', alignItems: 'center', gap: '4px',
                                                            fontSize: '0.65rem', fontWeight: 700, pointerEvents: 'none',
                                                            textTransform: 'uppercase', letterSpacing: '0.05em'
                                                        }}>
                                                            <ArrowLeftRight size={12} />
                                                            {isPairStart ? "Replace" : ""}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            <div className="merge-action-overlay" style={{
                                                position: 'absolute', zIndex: 10, opacity: 0.6, transition: 'opacity 0.2s',
                                                top: '0px', left: '0px', right: '0px', height: '100%', pointerEvents: 'none'
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                            >
                                                {onMerge && (
                                                    <>
                                                        <div style={{ position: 'absolute', top: 0, left: showLineNumbers ? '52px' : '5px', pointerEvents: 'auto' }}>
                                                            {block.type === 'block-removed' ? (
                                                                <button className="icon-btn xs agent-merge-btn" title="Copy to Right (Restore)"
                                                                    style={{
                                                                        background: 'rgba(50,0,0,0.8)', color: '#ec4899', border: '1px solid #ec4899', borderRadius: '0', width: '16px', height: '16px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        boxShadow: (isActive && focusZone === 'revert') ? '0 0 0 2px var(--accent-color, #6366f1)' : 'none',
                                                                        backgroundColor: (isActive && focusZone === 'revert') ? 'rgba(99, 102, 241, 0.4)' : 'rgba(50,0,0,0.8)'
                                                                    }}
                                                                    onClick={(e) => { e.stopPropagation(); const anchor = block.lines[0].rightLine || 0; onMerge(block.lines.map(l => l.content), 'right', anchor, 'insert'); }}
                                                                >
                                                                    <ArrowRight size={12} />
                                                                </button>
                                                            ) : (
                                                                <button className="icon-btn xs agent-merge-btn" title="Delete from Right (Revert)"
                                                                    style={{
                                                                        background: 'rgba(50,0,0,0.8)', color: '#ec4899', border: '1px solid #ec4899', borderRadius: '0', width: '16px', height: '16px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        boxShadow: (isActive && focusZone === 'revert') ? '0 0 0 2px var(--accent-color, #6366f1)' : 'none',
                                                                        backgroundColor: (isActive && focusZone === 'revert') ? 'rgba(99, 102, 241, 0.4)' : 'rgba(50,0,0,0.8)'
                                                                    }}
                                                                    onClick={(e) => { e.stopPropagation(); onMerge(block.lines.map(l => l.content), 'right', block.lines[0].rightLine || 0, 'delete'); }}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div style={{ position: 'absolute', top: 0, left: showLineNumbers ? '106px' : '30px', pointerEvents: 'auto' }}>
                                                            {block.type === 'block-removed' ? (
                                                                <button className="icon-btn xs agent-merge-btn" title="Delete from Left (Accept Removal)"
                                                                    style={{
                                                                        background: 'rgba(50,0,0,0.8)', color: '#4ade80', border: '1px solid #4ade80', borderRadius: '0', width: '16px', height: '16px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        boxShadow: (isActive && focusZone === 'accept') ? '0 0 0 2px var(--accent-color, #6366f1)' : 'none',
                                                                        backgroundColor: (isActive && focusZone === 'accept') ? 'rgba(99, 102, 241, 0.4)' : 'rgba(50,0,0,0.8)'
                                                                    }}
                                                                    onClick={(e) => { e.stopPropagation(); onMerge(block.lines.map(l => l.content), 'left', block.lines[0].leftLine || 0, 'delete'); }}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            ) : (
                                                                <button className="icon-btn xs agent-merge-btn" title="Merge to Left"
                                                                    style={{
                                                                        background: 'rgba(0,50,0,0.8)', color: '#4ade80', border: '1px solid #4ade80', borderRadius: '0', width: '16px', height: '16px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        boxShadow: (isActive && focusZone === 'accept') ? '0 0 0 2px var(--accent-color, #6366f1)' : 'none',
                                                                        backgroundColor: (isActive && focusZone === 'accept') ? 'rgba(99, 102, 241, 0.4)' : 'rgba(0,50,0,0.8)'
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const content = block.lines.map(l => l.content);
                                                                        const anchor = block.lines[0].leftLine || 0;
                                                                        let deleteCount = 0;
                                                                        if (idx > 0) {
                                                                            const prevItem = parsedItems[idx - 1];
                                                                            if (prevItem && 'lines' in prevItem && (prevItem as DiffBlock).type === 'block-removed') deleteCount = (prevItem as DiffBlock).lines.length;
                                                                        }
                                                                        deleteCount > 0 ? onMerge(content, 'left', anchor, 'replace', deleteCount) : onMerge(content, 'left', anchor, 'insert');
                                                                    }}
                                                                >
                                                                    <ArrowLeft size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
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
                                        if (!expandedLines) return <div key={idx} className="agent-diff-row gap"><div className="agent-gap-bar">Loading Context...</div></div>;
                                        return expandedLines.map((content, i) => (
                                            <div key={`${key}-${i}`} className="agent-diff-row same expanded">
                                                {showLineNumbers && (<><div className="agent-gutter noselect"></div><div className="agent-gutter noselect">{(line.gapStart || 0) + i}</div></>)}
                                                <div className="agent-content">{content}</div>
                                            </div>
                                        ));
                                    }
                                    return (
                                        <div key={idx} className="agent-diff-row gap">
                                            <div className="agent-gap-bar" onClick={() => line.gapStart && line.gapEnd && handleExpand(line.gapStart, line.gapEnd)}>
                                                {loadingGaps[key] ? 'Loading...' : `↕ ${line.content}`}
                                            </div>
                                        </div>
                                    );
                                }
                                return renderLine(line, idx);
                            })}
                        </div>
                    )
                }
            </div>
        );
    });
