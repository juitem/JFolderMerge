import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../../api';
import { ArrowLeft, ArrowRight, CheckCircle, ChevronsUp, ChevronsDown, ChevronUp, ChevronDown, ArrowLeftRight } from 'lucide-react';
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
    mergeMode?: 'group' | 'unit';
    onMergeModeChange?: () => void;
    onShowConfirm?: (title: string, message: string, action: () => void) => void;
}

export interface AgentViewHandle {
    scrollToChange: (type: 'added' | 'removed' | 'any', direction: 'prev' | 'next' | 'first' | 'last') => void;
    mergeActiveBlock: () => void;
    deleteActiveBlock: () => void;
}

export const AgentView = React.forwardRef<AgentViewHandle, AgentViewProps>(
    (props, ref) => {
        const { diff, showLineNumbers = true, fullRightPath, showSame = false, onMerge, wrap, mergeMode = 'group', onMergeModeChange, onShowConfirm } = props;
        const [fullFileLines, setFullFileLines] = useState<string[] | null>(null);
        const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({});
        const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
        const [focusZone, setFocusZone] = useState<'content' | 'revert' | 'accept'>('content');

        const containerRef = React.useRef<HTMLDivElement>(null);

        useEffect(() => {
            setExpandedContent({});
            setFullFileLines(null);
            setActiveBlockIndex(null);

            if (fullRightPath) {
                const loadFile = async () => {
                    try {
                        const res = await api.fetchFileContent(fullRightPath);
                        if (res && res.content) {
                            setFullFileLines(res.content.split(/\r?\n/));
                        }
                    } catch (err) {
                        console.error("Failed to load full file for AgentView gaps:", err);
                    }
                };
                loadFile();
            }
        }, [fullRightPath]);

        const parsedItems = useMemo(() => {
            if (!diff) return [];
            const rawItems: DiffItem[] = [];
            let leftLn = 0;
            let rightLn = 0;
            let currentBlock: DiffBlock | null = null;
            let lastRightLn = 0;

            const flushBlock = () => {
                if (currentBlock) {
                    rawItems.push(currentBlock);
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
                                rawItems.push({
                                    type: 'gap',
                                    content: `Expand ${gapSize} lines`,
                                    gapStart: rightLn + 1,
                                    gapEnd: newRightLn
                                } as DiffLine);
                            }
                        }
                        leftLn = newLeftLn;
                        rightLn = newRightLn;
                        lastRightLn = rightLn;
                    }
                } else if (line.startsWith('-')) {
                    leftLn++;
                    const lineObj: DiffLine = { type: 'removed', content: line.substring(1), leftLine: leftLn, rightLine: lastRightLn };
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
                    rawItems.push({ type: 'same', content: line.substring(1), leftLine: leftLn, rightLine: rightLn });
                } else {
                    flushBlock();
                    rawItems.push({ type: 'empty', content: line } as DiffLine);
                }
            }
            flushBlock();
            return rawItems;
        }, [diff]);

        const getPartnerIndex = (idx: number | null): number | null => {
            if (idx === null) return null;
            const isSmart = mergeMode === 'group';
            if (!isSmart) return null;
            const item = parsedItems[idx];
            if (!item || !('lines' in item)) return null;

            if ((item as DiffBlock).type === 'block-removed') {
                const next = parsedItems[idx + 1];
                if (next && 'lines' in next && (next as DiffBlock).type === 'block-added') return idx + 1;
            } else if ((item as DiffBlock).type === 'block-added') {
                const prev = parsedItems[idx - 1];
                if (prev && 'lines' in prev && (prev as DiffBlock).type === 'block-removed') return idx - 1;
            }
            return null;
        };

        useEffect(() => {
            if (parsedItems.length === 0) {
                setActiveBlockIndex(null);
                return;
            }
            if (activeBlockIndex === null) {
                const firstBlockIdx = parsedItems.findIndex(item => 'lines' in item);
                if (firstBlockIdx !== -1) {
                    setActiveBlockIndex(firstBlockIdx);
                }
            } else {
                const safeIdx = Math.min(activeBlockIndex, parsedItems.length - 1);
                const currentItem = parsedItems[safeIdx];
                if (!currentItem || !('lines' in currentItem)) {
                    let foundIdx = -1;
                    for (let i = safeIdx; i < parsedItems.length; i++) {
                        if (parsedItems[i] && 'lines' in parsedItems[i]) { foundIdx = i; break; }
                    }
                    if (foundIdx === -1) {
                        for (let i = Math.min(safeIdx - 1, parsedItems.length - 1); i >= 0; i--) {
                            if (parsedItems[i] && 'lines' in parsedItems[i]) { foundIdx = i; break; }
                        }
                    }
                    if (foundIdx !== -1) setActiveBlockIndex(foundIdx);
                    else setActiveBlockIndex(null);
                }
            }
        }, [parsedItems]);

        const handleExpand = (start: number, end: number) => {
            const key = `${start}-${end}`;
            setExpandedContent(prev => ({ ...prev, [key]: true }));
        };

        const scrollToChangeInternal = (type: 'added' | 'removed' | 'any', direction: 'prev' | 'next' | 'first' | 'last') => {
            if (!diff || parsedItems.length === 0) return;
            const isMatch = (item: DiffItem) => {
                if (!('lines' in item)) return false;
                if (type === 'any') return true;
                if (type === 'added' && (item as DiffBlock).type === 'block-added') return true;
                if (type === 'removed' && (item as DiffBlock).type === 'block-removed') return true;
                return false;
            };

            const start = activeBlockIndex !== null ? activeBlockIndex : (direction === 'next' ? -1 : parsedItems.length);
            let foundIdx = -1;

            if (direction === 'first') { foundIdx = parsedItems.findIndex(isMatch); }
            else if (direction === 'last') { for (let i = parsedItems.length - 1; i >= 0; i--) if (isMatch(parsedItems[i])) { foundIdx = i; break; } }
            else if (direction === 'next') {
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

        const handleMergeBlock = () => {
            if (activeBlockIndex === null) return;
            const item = parsedItems[activeBlockIndex];
            if (!item || !('lines' in item)) return;
            const block = item as DiffBlock;

            if (onMerge) {
                const partnerIdx = getPartnerIndex(activeBlockIndex);
                const isSmart = mergeMode === 'group' && partnerIdx !== null;

                if (isSmart) {
                    const removed = (block.type === 'block-removed' ? block : parsedItems[partnerIdx!]) as DiffBlock;
                    const added = (block.type === 'block-added' ? block : parsedItems[partnerIdx!]) as DiffBlock;
                    onMerge(added.lines.map(l => l.content), 'left', removed.lines[0].leftLine || 0, 'replace', removed.lines.length);
                } else {
                    if (block.type === 'block-removed') {
                        onMerge(block.lines.map(l => l.content), 'left', block.lines[0].leftLine || 0, 'delete');
                    } else {
                        onMerge(block.lines.map(l => l.content), 'left', block.lines[0].leftLine || 0, 'insert');
                    }
                }
                setFocusZone('content');
                // Ensure focus returns to the main container after the action
                setTimeout(() => containerRef.current?.focus(), 50);
            }
        };

        const handleDeleteBlock = () => {
            if (activeBlockIndex === null) return;
            const item = parsedItems[activeBlockIndex];
            if (!item || !('lines' in item)) return;
            const block = item as DiffBlock;

            if (onMerge) {
                const partnerIdx = getPartnerIndex(activeBlockIndex);
                const isSmart = mergeMode === 'group' && partnerIdx !== null;

                if (isSmart) {
                    const removed = (block.type === 'block-removed' ? block : parsedItems[partnerIdx!]) as DiffBlock;
                    const added = (block.type === 'block-added' ? block : parsedItems[partnerIdx!]) as DiffBlock;
                    onMerge(removed.lines.map(l => l.content), 'right', added.lines[0].rightLine || 0, 'replace', added.lines.length);
                } else {
                    if (block.type === 'block-removed') {
                        onMerge(block.lines.map(l => l.content), 'right', block.lines[0].rightLine || 0, 'insert');
                    } else {
                        onMerge(block.lines.map(l => l.content), 'right', block.lines[0].rightLine || 0, 'delete');
                    }
                }
                setFocusZone('content');
                // Ensure focus returns to the main container after the action
                setTimeout(() => containerRef.current?.focus(), 50);
            }
        };

        React.useImperativeHandle(ref, () => ({
            scrollToChange: (type, direction) => scrollToChangeInternal(type, direction),
            mergeActiveBlock: handleMergeBlock,
            deleteActiveBlock: handleDeleteBlock
        }));

        const { logKey } = useKeyLogger('AgentView');

        const navigateBlock = (direction: 'next' | 'prev') => {
            let newIdx = -1;
            const start = activeBlockIndex !== null ? activeBlockIndex : (direction === 'next' ? -1 : parsedItems.length);
            const isSmartMode = mergeMode === 'group';

            if (direction === 'next') {
                let i = start + 1;
                if (isSmartMode && start !== -1) {
                    const item = parsedItems[start];
                    if (item && 'lines' in item && (item as DiffBlock).type === 'block-removed') {
                        const partner = parsedItems[start + 1];
                        if (partner && 'lines' in partner && (partner as DiffBlock).type === 'block-added') i = start + 2;
                    }
                }

                for (; i < parsedItems.length; i++) {
                    if (parsedItems[i] && 'lines' in parsedItems[i]) { newIdx = i; break; }
                }
            } else {
                let i = start - 1;
                if (isSmartMode && start !== -1) {
                    const item = parsedItems[start];
                    if (item && 'lines' in item && (item as DiffBlock).type === 'block-added') {
                        const partner = parsedItems[start - 1];
                        if (partner && 'lines' in partner && (partner as DiffBlock).type === 'block-removed') i = start - 2;
                    }
                }

                for (; i >= 0; i--) {
                    if (parsedItems[i] && 'lines' in parsedItems[i]) {
                        newIdx = i;
                        if (isSmartMode) {
                            const partner = parsedItems[i - 1];
                            if (partner && 'lines' in partner && (partner as DiffBlock).type === 'block-removed' && (parsedItems[i] as DiffBlock).type === 'block-added') {
                                newIdx = i - 1;
                            }
                        }
                        break;
                    }
                }
            }

            if (newIdx !== -1) {
                setActiveBlockIndex(newIdx);
                setFocusZone('content');
                setTimeout(() => {
                    const el = containerRef.current?.querySelector(`[data-block-index='${newIdx}']`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 0);
            }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            logKey(e, { activeBlockIndex });
            if (e.key === 'Escape') {
                e.preventDefault();
                if (focusZone !== 'content') {
                    setFocusZone('content');
                } else {
                    (document.querySelector('.tree-container') as HTMLElement)?.focus();
                }
                return;
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                (document.querySelector('.tree-container') as HTMLElement)?.focus();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateBlock('next');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateBlock('prev');
            } else if (e.key === 'ArrowRight') {
                if (e.shiftKey && onMerge && activeBlockIndex !== null) {
                    e.preventDefault();
                    handleDeleteBlock();
                } else if (activeBlockIndex !== null) {
                    e.preventDefault();
                    // Linear scale: [Accept] <-> [Content] <-> [Revert]
                    if (focusZone === 'accept') setFocusZone('content');
                    else if (focusZone === 'content') setFocusZone('revert');
                    // If already in revert, stay there
                }
            } else if (e.key === 'ArrowLeft') {
                if (e.shiftKey && onMerge && activeBlockIndex !== null) {
                    e.preventDefault();
                    handleMergeBlock();
                } else if (activeBlockIndex !== null) {
                    e.preventDefault();
                    // Linear scale: [Accept] <-> [Content] <-> [Revert]
                    if (focusZone === 'revert') setFocusZone('content');
                    else if (focusZone === 'content') setFocusZone('accept');
                    // If already in accept, stay there
                }
            } else if (e.key === 'Enter') {
                if (activeBlockIndex !== null) {
                    e.preventDefault();
                    if (focusZone === 'accept') {
                        const action = () => {
                            handleMergeBlock();
                            // Re-focus after modal closes and action completes
                            setTimeout(() => containerRef.current?.focus(), 100);
                        };
                        if (onShowConfirm) onShowConfirm("Confirm Merge", "Apply this change to the left side?", action);
                        else action();
                    } else if (focusZone === 'revert') {
                        const action = () => {
                            handleDeleteBlock();
                            // Re-focus after modal closes and action completes
                            setTimeout(() => containerRef.current?.focus(), 100);
                        };
                        if (onShowConfirm) onShowConfirm("Confirm Revert", "Revert this change on the right side?", action);
                        else action();
                    }
                    // In 'content' zone, Enter does nothing to prevent accidental operations
                }
            } else if (e.key === 'u' || e.key === 'U') {
                e.preventDefault();
                onMergeModeChange?.();
            } else if (e.key === 'a') { e.preventDefault(); scrollToChangeInternal('added', 'prev'); }
            else if (e.key === 's') { e.preventDefault(); scrollToChangeInternal('added', 'next'); }
            else if (e.key === 'e') { e.preventDefault(); scrollToChangeInternal('removed', 'prev'); }
            else if (e.key === 'r') { e.preventDefault(); scrollToChangeInternal('removed', 'next'); }
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

        return (
            <div className="agent-view-container"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.currentTarget.focus()}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
                style={{
                    padding: '0',
                    outline: 'none',
                    border: '2px solid transparent',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden'
                }}
            >
                <div className="custom-scroll"
                    ref={(el) => {
                        // @ts-ignore
                        containerRef.current = el;
                        if (props.scrollerRef) props.scrollerRef(el);
                    }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: 0,
                        outline: 'none'
                    }}
                >
                    <div className="agent-control-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 20 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: 'auto' }}>Agent Controls</span>
                        <div style={{ display: 'flex', gap: '2px', marginRight: '8px' }}>
                            <button className="icon-btn small" onClick={() => scrollToChangeInternal('any', 'first')} title="First Change"><ChevronsUp size={14} /></button>
                            <button className="icon-btn small" onClick={() => scrollToChangeInternal('any', 'prev')} title="Previous Change"><ChevronUp size={14} /></button>
                            <button className="icon-btn small" onClick={() => scrollToChangeInternal('any', 'next')} title="Next Change"><ChevronDown size={14} /></button>
                            <button className="icon-btn small" onClick={() => scrollToChangeInternal('any', 'last')} title="Last Change"><ChevronsDown size={14} /></button>
                        </div>
                        <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="merge-btn small" style={{ width: 'auto', padding: '0 8px', gap: '4px', fontSize: '0.8rem', height: '24px' }}
                                onClick={() => { if (activeBlockIndex !== null) handleDeleteBlock(); }} title="Merge Left to Right">
                                <ArrowRight size={14} /><ArrowRight size={14} />Merge<sup style={{ color: '#ec4899', fontWeight: 800 }}>R</sup>
                            </button>
                            <button className="merge-btn small" style={{ width: 'auto', padding: '0 8px', gap: '4px', fontSize: '0.8rem', height: '24px' }}
                                onClick={() => { if (activeBlockIndex !== null) handleMergeBlock(); }} title="Merge Right to Left">
                                <ArrowLeft size={14} /><ArrowLeft size={14} />Merge<sup style={{ color: '#10b981', fontWeight: 800 }}>L</sup>
                            </button>
                        </div>
                    </div>

                    {!parsedItems.some(i => 'lines' in i) ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--panel-bg)', borderRadius: 'var(--radius-lg)', margin: '10px', border: '1px solid var(--border-color)' }}>
                            <div className="text-center p-8">
                                <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto 20px auto', opacity: 0.8 }} />
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>All changes merged!</h3>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>This file is now synchronized.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="agent-diff-table" style={{ flex: 1, padding: '0 10px 10px 10px' }}>
                            {parsedItems.map((item, idx) => {
                                if ('lines' in item) {
                                    const block = item as DiffBlock;
                                    const partnerIdx = getPartnerIndex(idx);
                                    const isSelfActive = activeBlockIndex === idx;
                                    const isPartnerActive = mergeMode === 'group' && partnerIdx !== null && activeBlockIndex === partnerIdx;
                                    const isActive = isSelfActive || isPartnerActive;

                                    return (
                                        <div key={idx} data-block-index={idx}
                                            className={`diff-block-group group-${block.type.split('-')[1]} ${isActive ? 'active' : ''}`}
                                            style={{
                                                position: 'relative',
                                                cursor: 'pointer',
                                                boxShadow: (isSelfActive && focusZone === 'content' && mergeMode !== 'group') ? 'inset 0 0 0 2px var(--accent-color)' : 'none'
                                            }}
                                            onClick={(e) => { e.stopPropagation(); setActiveBlockIndex(idx); setFocusZone('content'); containerRef.current?.focus(); }}
                                        >
                                            {block.lines.map((l, i) => renderLine(l, i))}
                                            <div className="merge-action-overlay" style={{ position: 'absolute', zIndex: 10, top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                                                {onMerge && (
                                                    <>
                                                        <div style={{ position: 'absolute', top: 0, left: showLineNumbers ? '52px' : '5px', pointerEvents: 'auto' }}>
                                                            <button className="icon-btn xs agent-merge-btn"
                                                                style={{
                                                                    color: '#ec4899', width: '18px', height: '18px', border: '1px solid #ec4899',
                                                                    background: 'rgba(50, 0, 0, 0.9)', borderRadius: '4px', padding: 0,
                                                                    boxShadow: (isActive && focusZone === 'revert') ? '0 0 0 2px var(--accent-color)' : '0 1px 3px rgba(0,0,0,0.3)',
                                                                    opacity: isActive ? 1 : 0.6
                                                                }}
                                                                onClick={(e) => { e.stopPropagation(); setActiveBlockIndex(idx); handleDeleteBlock(); }}
                                                                title="Revert Change (Right to Right)"
                                                            >
                                                                <ArrowRight size={12} strokeWidth={2.5} />
                                                            </button>
                                                        </div>
                                                        <div style={{ position: 'absolute', top: 0, left: showLineNumbers ? '106px' : '30px', pointerEvents: 'auto' }}>
                                                            <button className="icon-btn xs agent-merge-btn"
                                                                style={{
                                                                    color: '#4ade80', width: '18px', height: '18px', border: '1px solid #4ade80',
                                                                    background: 'rgba(0, 50, 0, 0.9)', borderRadius: '4px', padding: 0,
                                                                    boxShadow: (isActive && focusZone === 'accept') ? '0 0 0 2px var(--accent-color)' : '0 1px 3px rgba(0,0,0,0.3)',
                                                                    opacity: isActive ? 1 : 0.6
                                                                }}
                                                                onClick={(e) => { e.stopPropagation(); setActiveBlockIndex(idx); handleMergeBlock(); }}
                                                                title="Accept Change (Right to Left)"
                                                            >
                                                                <ArrowLeft size={12} strokeWidth={2.5} />
                                                            </button>
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
                                    const isExpanded = showSame || !!expandedContent[key];
                                    if (isExpanded) {
                                        if (!fullFileLines) return <div key={idx} className="agent-diff-row gap"><div className="agent-gap-bar">Loading file content...</div></div>;
                                        const snippet = fullFileLines.slice((line.gapStart || 1) - 1, line.gapEnd);
                                        return snippet.map((content, i) => (
                                            <div key={`${key}-${i}`} className="agent-diff-row same expanded">
                                                {showLineNumbers && (<><div className="agent-gutter noselect"></div><div className="agent-gutter noselect">{(line.gapStart || 0) + i}</div></>)}
                                                <div className="agent-content">{content}</div>
                                            </div>
                                        ));
                                    }
                                    return (
                                        <div key={idx} className="agent-diff-row gap">
                                            <div className="agent-gap-bar" onClick={() => line.gapStart && line.gapEnd && handleExpand(line.gapStart, line.gapEnd)}>↕ {line.content}</div>
                                        </div>
                                    );
                                }
                                return renderLine(line, idx);
                            })}
                        </div>
                    )}
                </div>

                {/* Floating Global Merge Mode Overlay Indicator */}
                {mergeMode === 'group' && (
                    <div style={{
                        position: 'absolute',
                        bottom: '20px',
                        right: '25px',
                        zIndex: 100,
                        pointerEvents: 'none',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <div className="smart-pair-indicator" style={{
                            position: 'relative',
                            bottom: 'auto',
                            right: 'auto',
                            opacity: 0.9,
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: 'rgba(30, 41, 59, 0.95)',
                            backdropFilter: 'blur(4px)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid #60a5fa',
                            color: '#60a5fa',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            pointerEvents: 'auto'
                        }}>
                            <ArrowLeftRight size={14} />
                            <span>GROUP MERGE MODE (REPLACE)</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);
