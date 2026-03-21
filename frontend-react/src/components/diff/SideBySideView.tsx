import React from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';

export const SideBySideView: React.FC<{
    leftRows?: any[],
    rightRows?: any[],
    filters?: any,
    onMerge?: (sourceText: string, side: 'left' | 'right', line: number | null, type: 'insert' | 'replace' | 'delete', index: number, count?: number) => void;
    showLineNumbers?: boolean;
    wrap?: boolean;
    scrollerRef?: (el: HTMLElement | Window | null) => void;
    mergeMode?: 'group' | 'unit';
    onMergeModeChange?: () => void;
    onShowConfirm?: (title: string, message: string, action: () => void) => void;
    isMarkdownMode?: boolean;
}> = ({
    leftRows = [],
    rightRows = [],
    filters,
    onMerge,
    showLineNumbers,
    wrap,
    scrollerRef,
    mergeMode = 'unit',
    onMergeModeChange,
    onShowConfirm,
    isMarkdownMode = false
}) => {
        if (!leftRows || !rightRows) return <div>No Split Data</div>;

        const len = Math.max(leftRows.length, rightRows.length);

        const getErrorSafeText = (row: any) => {
            if (!row) return "";
            return Array.isArray(row.text) ? row.text.map((t: any) => t.text).join('') : (row.text || "");
        };

        const isVisible = (rowNode: any) => {
            if (!rowNode || rowNode.type === 'empty') return false;
            const t = rowNode.type === 'modified' ? 'modified' :
                rowNode.type === 'added' ? 'added' :
                    rowNode.type === 'removed' ? 'removed' : 'same';
            return filters?.[t] !== false;
        };

        const computeBlocks = (targetRows: any[]) => {
            const blocks: Record<number, { type: string, lines: string[], count: number, startLine?: number }> = {};
            if (!targetRows) return blocks;

            let currentType = '';
            let currentStart = -1;
            let currentLines: string[] = [];

            for (let i = 0; i < len; i++) {
                const row = targetRows[i] || { type: 'empty' };
                const type = row.type;
                const validBlock = type === 'added' || type === 'removed' || type === 'modified';

                if (validBlock) {
                    if (type !== currentType) {
                        if (currentStart !== -1) {
                            blocks[currentStart] = { type: currentType, lines: currentLines, count: currentLines.length, startLine: targetRows[currentStart]?.line };
                        }
                        currentType = type;
                        currentStart = i;
                        currentLines = [getErrorSafeText(row)];
                    } else {
                        currentLines.push(getErrorSafeText(row));
                    }
                } else {
                    if (currentStart !== -1) {
                        blocks[currentStart] = { type: currentType, lines: currentLines, count: currentLines.length, startLine: targetRows[currentStart]?.line };
                    }
                    currentType = '';
                    currentStart = -1;
                    currentLines = [];
                }
            }
            if (currentStart !== -1) {
                blocks[currentStart] = { type: currentType, lines: currentLines, count: currentLines.length, startLine: targetRows[currentStart]?.line };
            }
            return blocks;
        };

        const leftBlocks = React.useMemo(() => computeBlocks(leftRows), [leftRows, len]);
        const rightBlocks = React.useMemo(() => computeBlocks(rightRows), [rightRows, len]);

        // Pre-filter visible rows for virtualization
        const visibleData = React.useMemo(() => {
            const result: { originalIdx: number, l: any, r: any, lBlock: any, rBlock: any }[] = [];
            for (let i = 0; i < len; i++) {
                const l = leftRows[i] || { type: 'empty' };
                const r = rightRows[i] || { type: 'empty' };
                if (isVisible(l) || isVisible(r)) {
                    result.push({ originalIdx: i, l, r, lBlock: leftBlocks[i], rBlock: rightBlocks[i] });
                }
            }
            return result;
        }, [leftRows, rightRows, leftBlocks, rightBlocks, len, filters]);

        const [focusedIdx, setFocusedIdx] = React.useState<number>(0); // index into visibleData
        const [focusZone, setFocusZone] = React.useState<'content' | 'line' | 'block'>('content');
        const [focusSide, setFocusSide] = React.useState<'left' | 'right'>('left');
        const virtuosoRef = React.useRef<VirtuosoHandle>(null);

        React.useEffect(() => {
            if (focusedIdx >= 0 && focusedIdx < visibleData.length) {
                virtuosoRef.current?.scrollToIndex({ index: focusedIdx, behavior: 'smooth', align: 'center' });
            }
        }, [focusedIdx]);

        const currentRow = visibleData[focusedIdx];

        const triggerMergeDir = (direction: 'left' | 'right') => {
            if (!currentRow) return;
            const { originalIdx, l, r, lBlock, rBlock } = currentRow;
            const targetSide = direction;
            const sourceSide = direction === 'left' ? 'right' : 'left';
            const row = sourceSide === 'left' ? l : r;
            const other = targetSide === 'left' ? l : r;
            const block = sourceSide === 'left' ? lBlock : rBlock;
            const otherBlock = targetSide === 'left' ? lBlock : rBlock;

            if (block && block.count > 1) {
                const actionType = (!other || !other.line) ? 'insert' : 'replace';
                onMerge?.(block.lines.join('\n'), targetSide, other?.line || null, actionType, originalIdx);
            } else if (otherBlock && otherBlock.count > 1 && row?.type === 'empty') {
                onMerge?.("", targetSide, otherBlock.startLine || null, 'delete', originalIdx);
            } else {
                const hasContent = row && row.type !== 'empty' && row.type !== 'same';
                const isEmptySpacer = row && row.type === 'empty' && other && other.type !== 'empty' && other.type !== 'same';
                if (hasContent || isEmptySpacer) {
                    const actionType = (!other || !other.line) ? 'insert' : (isEmptySpacer ? 'delete' : 'replace');
                    const sourceText = getErrorSafeText(row);
                    const targetLine = other?.line || (actionType === 'delete' ? (other?.line || null) : null);
                    onMerge?.(sourceText, targetSide, targetLine, actionType, originalIdx, 1);
                }
            }
        };

        const triggerMergeFocus = () => {
            if (!currentRow) return;
            const { originalIdx, l, r, lBlock, rBlock } = currentRow;
            const actionSide = focusSide === 'left' ? 'right' : 'left';
            const row = focusSide === 'left' ? l : r;
            const other = focusSide === 'left' ? r : l;
            const block = focusSide === 'left' ? lBlock : rBlock;
            const otherBlock = focusSide === 'left' ? rBlock : lBlock;

            if (focusZone === 'line') {
                const hasContent = row && row.type !== 'empty' && row.type !== 'same';
                const isEmptySpacer = row && row.type === 'empty' && other && other.type !== 'empty' && other.type !== 'same';
                if (hasContent || isEmptySpacer) {
                    const actionType = (!other || !other.line) ? 'insert' : (isEmptySpacer ? 'delete' : 'replace');
                    const sourceText = getErrorSafeText(row);
                    const targetLine = other?.line || (actionType === 'delete' ? (other?.line || null) : null);
                    onMerge?.(sourceText, actionSide, targetLine, actionType, originalIdx, 1);
                }
            } else if (focusZone === 'block') {
                if (block && block.count > 1) {
                    const actionType = (!other || !other.line) ? 'insert' : 'replace';
                    onMerge?.(block.lines.join('\n'), actionSide, other?.line || null, actionType, originalIdx);
                } else if (otherBlock && otherBlock.count > 1 && row?.type === 'empty') {
                    onMerge?.("", actionSide, otherBlock.startLine || null, 'delete', originalIdx);
                }
            }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
                e.stopPropagation();
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (mergeMode === 'group') {
                    const next = visibleData.findIndex((d, vi) => vi > focusedIdx && (
                        (d.l && d.l.type !== 'same' && d.l.type !== 'empty') ||
                        (d.r && d.r.type !== 'same' && d.r.type !== 'empty')
                    ));
                    if (next !== -1) setFocusedIdx(next);
                } else {
                    setFocusedIdx(prev => Math.min(prev + 1, visibleData.length - 1));
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (mergeMode === 'group') {
                    let prev = -1;
                    for (let vi = focusedIdx - 1; vi >= 0; vi--) {
                        const d = visibleData[vi];
                        if ((d.l && d.l.type !== 'same' && d.l.type !== 'empty') ||
                            (d.r && d.r.type !== 'same' && d.r.type !== 'empty')) {
                            prev = vi; break;
                        }
                    }
                    if (prev >= 0) setFocusedIdx(prev);
                } else {
                    setFocusedIdx(prev => Math.max(prev - 1, 0));
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (e.shiftKey) {
                    triggerMergeDir('right');
                } else {
                    if (focusSide === 'left') {
                        if (focusZone === 'block') setFocusZone('line');
                        else if (focusZone === 'line') setFocusZone('content');
                        else { setFocusSide('right'); setFocusZone('content'); }
                    } else {
                        if (focusZone === 'content') setFocusZone('line');
                        else if (focusZone === 'line') setFocusZone('block');
                    }
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (e.shiftKey) {
                    triggerMergeDir('left');
                } else {
                    if (focusSide === 'right') {
                        if (focusZone === 'block') setFocusZone('line');
                        else if (focusZone === 'line') setFocusZone('content');
                        else { setFocusSide('left'); setFocusZone('content'); }
                    } else {
                        if (focusZone === 'content') setFocusZone('line');
                        else if (focusZone === 'line') setFocusZone('block');
                    }
                }
            } else if (e.key === 'u' || e.key === 'U') {
                e.preventDefault();
                onMergeModeChange?.();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (focusZone === 'line' || focusZone === 'block') {
                    if (onShowConfirm) {
                        const isBlock = focusZone === 'block';
                        onShowConfirm(
                            isBlock ? "Confirm Block Merge" : "Confirm Line Merge",
                            isBlock ? "Merge this change block?" : "Merge this line?",
                            () => triggerMergeFocus()
                        );
                    } else {
                        triggerMergeFocus();
                    }
                }
            }
        };

        return (
            <div className="split-diff-container"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0, outline: 'none' }}>
                {visibleData.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-secondary)', backgroundColor: 'var(--panel-bg)', borderRadius: 'var(--radius-lg)', margin: '20px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9 }}>
                            <span>✓</span>
                            <span>File Synchronized</span>
                        </div>
                        <div style={{ marginTop: '8px', opacity: 0.7, fontSize: '0.9rem' }}>No differences remain in this file.</div>
                    </div>
                ) : (
                    <Virtuoso
                        ref={virtuosoRef}
                        data={visibleData}
                        itemContent={(vi, { originalIdx, l, r, lBlock, rBlock }) => (
                            <div className={`diff-row-wrapper ${focusedIdx === vi ? 'is-focused-row' : ''}`}
                                style={{ display: 'flex', minHeight: '16px', height: 'auto', flexShrink: 0 }}
                                onClick={() => setFocusedIdx(vi)}
                            >
                                <div className="diff-col left" style={{ flex: '1 1 50%', width: '50%', maxWidth: '50%' }}>
                                    <DiffRow row={l} side="left" otherRow={r} onMerge={onMerge} index={originalIdx} showLineNumber={showLineNumbers} block={lBlock} otherBlock={rBlock} wrap={wrap} focusedZone={focusedIdx === vi && focusSide === 'left' ? focusZone : null} isMarkdownMode={isMarkdownMode} />
                                </div>
                                <div className="diff-col right" style={{ flex: '1 1 50%', width: '50%', maxWidth: '50%' }}>
                                    <DiffRow row={r} side="right" otherRow={l} onMerge={onMerge} index={originalIdx} showLineNumber={showLineNumbers} block={rBlock} otherBlock={lBlock} wrap={wrap} focusedZone={focusedIdx === vi && focusSide === 'right' ? focusZone : null} isMarkdownMode={isMarkdownMode} />
                                </div>
                            </div>
                        )}
                        style={{ flex: 1 }}
                        scrollerRef={scrollerRef}
                    />
                )}
            </div>
        );
    };

const DiffRow: React.FC<{
    row: any,
    side: 'left' | 'right',
    otherRow: any,
    onMerge: any,
    index: number,
    showLineNumber?: boolean,
    block?: { type: string, lines: string[], count: number, startLine?: number },
    otherBlock?: { type: string, lines: string[], count: number, startLine?: number },
    wrap?: boolean,
    focusedZone?: 'content' | 'line' | 'block' | null,
    isMarkdownMode?: boolean
}> = ({ row, side, otherRow, onMerge, index, showLineNumber, block, otherBlock, wrap, focusedZone, isMarkdownMode }) => {
    const hasContent = row.type !== 'empty' && row.type !== 'same';
    const isEmptySpacer = row.type === 'empty' && otherRow && otherRow.type !== 'empty' && otherRow.type !== 'same';

    const getFocusStyle = (zone: string) => {
        if (focusedZone === zone) {
            return {
                boxShadow: '0 0 0 2px var(--accent-primary, #6366f1)',
                zIndex: 10,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderRadius: '2px'
            };
        }
        return {};
    };

    return (
        <div className={`diff-line ${row.type}`} data-idx={index}>
            {showLineNumber && (
                <span className="line-number" style={{
                    display: 'inline-block', width: '30px', textAlign: 'right', marginRight: '8px',
                    color: '#666', fontSize: '0.8rem', userSelect: 'none', opacity: 0.7,
                    flexShrink: 0
                }}>{row.line || ''}</span>
            )}

            {
                (block && block.count > 1) ? (
                    <div className="block-merge-gutter" style={{ width: '20px', display: 'flex', justifyContent: 'center', marginRight: '4px', flexShrink: 0 }}>
                        <button className="merge-btn small block-btn"
                            title={`Merge ${block.count} lines to ${side === 'left' ? 'Right' : 'Left'}`}
                            style={{
                                height: '16px', width: '16px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: side === 'left' ? 'rgba(50,0,0,0.8)' : 'rgba(0,50,0,0.8)',
                                color: side === 'left' ? '#ec4899' : '#4ade80',
                                border: side === 'left' ? '1px solid #ec4899' : '1px solid #4ade80',
                                ...getFocusStyle('block')
                            }}
                            onClick={() => {
                                const actionType = (!otherRow || !otherRow.line) ? 'insert' : 'replace';
                                const sourceText = block.lines.join('\n');
                                onMerge(sourceText, side === 'left' ? 'right' : 'left', otherRow?.line || null, actionType, index);
                            }}
                        >
                            {side === 'left' ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
                        </button>
                    </div>
                ) : (otherBlock && otherBlock.count > 1 && row.type === 'empty') ? (
                    <div className="block-merge-gutter spacer-block-btn" style={{ width: '20px', display: 'flex', justifyContent: 'center', marginRight: '4px', flexShrink: 0 }}>
                        <button className="merge-btn small block-btn to-spacer"
                            title={`Merge Empty (Delete ${otherBlock.count} lines) to ${side === 'left' ? 'Right' : 'Left'}`}
                            style={{
                                height: '16px', width: '16px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: side === 'left' ? 'rgba(50,0,0,0.8)' : 'rgba(0,50,0,0.8)',
                                color: side === 'left' ? '#ec4899' : '#4ade80',
                                border: side === 'left' ? '1px solid #ec4899' : '1px solid #4ade80',
                                ...getFocusStyle('block')
                            }}
                            onClick={() => {
                                onMerge("", side === 'left' ? 'right' : 'left', otherBlock.startLine || null, 'delete', index);
                            }}
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ) : (
                    <div style={{ width: '20px', marginRight: '4px', flexShrink: 0 }}></div>
                )
            }

            <div className="diff-actions">
                {hasContent && (
                    <button className={`merge-btn small ${side === 'left' ? 'to-right' : 'to-left'}`}
                        title={`Merge Line to ${side === 'left' ? 'Right' : 'Left'}`}
                        style={getFocusStyle('line')}
                        onClick={() => {
                            const actionType = (!otherRow || !otherRow.line) ? 'insert' : 'replace';
                            const sourceText = Array.isArray(row.text) ? row.text.map((t: any) => t.text).join('') : row.text;
                            onMerge(sourceText, side === 'left' ? 'right' : 'left', otherRow?.line || null, actionType, index, 1);
                        }}>
                        {side === 'left' ? <ArrowRight size={12} strokeWidth={3} /> : <ArrowLeft size={12} strokeWidth={3} />}
                    </button>
                )}
                {isEmptySpacer && (
                    <button className={`merge-btn small ${side === 'left' ? 'to-right' : 'to-left'}`}
                        title={`Merge Empty to ${side === 'left' ? 'Right' : 'Left'} (Delete Line)`}
                        style={getFocusStyle('line')}
                        onClick={() => {
                            onMerge("", side === 'left' ? 'right' : 'left', otherRow.line, 'delete', index, 1);
                        }}>
                        <Trash2 size={12} strokeWidth={3} />
                    </button>
                )}
            </div>

            {isMarkdownMode ? (
                <div className="markdown-preview" style={{ flex: 1, padding: '4px 8px', overflow: 'hidden', ...getFocusStyle('content') }}>
                    <ReactMarkdown>{Array.isArray(row.text) ? row.text.map((s: any) => s.text).join('') : (row.text || '')}</ReactMarkdown>
                </div>
            ) : (
                <span className={`diff-text ${wrap === false ? 'no-wrap' : ''} ${focusedZone === 'content' ? 'is-focused-text' : ''}`}
                    style={getFocusStyle('content')}>
                    {Array.isArray(row.text) ? (
                        row.text.map((seg: any, si: number) => (
                            <span key={si} className={seg.type !== 'same' ? `diff-span-${seg.type}` : ''}>{seg.text}</span>
                        ))
                    ) : (
                        row.text || " "
                    )}
                </span>
            )}
        </div >
    );
};
