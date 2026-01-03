import React from 'react';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';

export const SideBySideView: React.FC<{
    leftRows?: any[],
    rightRows?: any[],
    filters?: any,
    onMerge?: (sourceText: string, side: 'left' | 'right', line: number | null, type: 'insert' | 'replace' | 'delete', index: number, count?: number) => void;
    showLineNumbers?: boolean;
    wrap?: boolean;
    scrollerRef?: (el: HTMLElement | Window | null) => void;
    mergeMode?: 'group' | 'line';
    onShowConfirm?: (title: string, message: string, action: () => void) => void;
}> = ({
    leftRows = [],
    rightRows = [],
    filters,
    onMerge,
    showLineNumbers,
    wrap,
    scrollerRef,
    mergeMode = 'line',
    onShowConfirm
}) => {
        if (!leftRows || !rightRows) return <div>No Split Data</div>;

        const len = Math.max(leftRows.length, rightRows.length);
        const rows = Array.from({ length: len });

        const getErrorSafeText = (row: any) => {
            if (!row) return "";
            return Array.isArray(row.text) ? row.text.map((t: any) => t.text).join('') : (row.text || "");
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

        const [focusedIdx, setFocusedIdx] = React.useState<number>(0);
        const [focusZone, setFocusZone] = React.useState<'content' | 'line' | 'block'>('content');
        const [focusSide, setFocusSide] = React.useState<'left' | 'right'>('left');

        const triggerMergeDir = (direction: 'left' | 'right') => {
            // Shift + ArrowLeft -> Accept -> Right to Left (action on Left side)
            // Shift + ArrowRight -> Revert -> Left to Right (action on Right side)
            const targetSide = direction === 'left' ? 'left' : 'right';
            const sourceSide = direction === 'left' ? 'right' : 'left';

            const row = (sourceSide === 'left' ? leftRows : rightRows)[focusedIdx];
            const other = (targetSide === 'left' ? leftRows : rightRows)[focusedIdx];
            const blocks = (sourceSide === 'left' ? leftBlocks : rightBlocks);
            const otherBlocks = (targetSide === 'left' ? leftBlocks : rightBlocks);

            const block = blocks[focusedIdx];
            const otherBlock = otherBlocks[focusedIdx];

            if (block && block.count > 1) {
                const actionType = (!other || !other.line) ? 'insert' : 'replace';
                onMerge?.(block.lines.join('\n'), targetSide, other?.line || null, actionType, focusedIdx);
            } else if (otherBlock && otherBlock.count > 1 && row?.type === 'empty') {
                onMerge?.("", targetSide, otherBlock.startLine || null, 'delete', focusedIdx);
            } else {
                const hasContent = row && row.type !== 'empty' && row.type !== 'same';
                const isEmptySpacer = row && row.type === 'empty' && other && other.type !== 'empty' && other.type !== 'same';

                if (hasContent || isEmptySpacer) {
                    const actionType = (!other || !other.line) ? 'insert' : (isEmptySpacer ? 'delete' : 'replace');
                    const sourceText = getErrorSafeText(row);
                    const targetLine = other?.line || (actionType === 'delete' ? (other?.line || null) : null);
                    onMerge?.(sourceText, targetSide, targetLine, actionType, focusedIdx, 1);
                }
            }
        };

        const triggerMergeFocus = () => {
            // Trigger based on current focused icon
            const actionSide = focusSide === 'left' ? 'right' : 'left';
            const row = (focusSide === 'left' ? leftRows : rightRows)[focusedIdx];
            const other = (focusSide === 'left' ? rightRows : leftRows)[focusedIdx];
            const blocks = (focusSide === 'left' ? leftBlocks : rightBlocks);
            const otherBlocks = (focusSide === 'left' ? rightBlocks : leftBlocks);

            if (focusZone === 'line') {
                const hasContent = row && row.type !== 'empty' && row.type !== 'same';
                const isEmptySpacer = row && row.type === 'empty' && other && other.type !== 'empty' && other.type !== 'same';
                if (hasContent || isEmptySpacer) {
                    const actionType = (!other || !other.line) ? 'insert' : (isEmptySpacer ? 'delete' : 'replace');
                    const sourceText = getErrorSafeText(row);
                    const targetLine = other?.line || (actionType === 'delete' ? (other?.line || null) : null);
                    onMerge?.(sourceText, actionSide, targetLine, actionType, focusedIdx, 1);
                }
            } else if (focusZone === 'block') {
                const block = blocks[focusedIdx];
                const otherBlock = otherBlocks[focusedIdx];
                if (block && block.count > 1) {
                    const actionType = (!other || !other.line) ? 'insert' : 'replace';
                    onMerge?.(block.lines.join('\n'), actionSide, other?.line || null, actionType, focusedIdx);
                } else if (otherBlock && otherBlock.count > 1 && row?.type === 'empty') {
                    onMerge?.("", actionSide, otherBlock.startLine || null, 'delete', focusedIdx);
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
                    let next = focusedIdx + 1;
                    while (next < len) {
                        const l = leftRows[next];
                        const r = rightRows[next];
                        if ((l && l.type !== 'same' && l.type !== 'empty') || (r && r.type !== 'same' && r.type !== 'empty')) break;
                        next++;
                    }
                    if (next < len) setFocusedIdx(next);
                } else {
                    setFocusedIdx(prev => Math.min(prev + 1, len - 1));
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (mergeMode === 'group') {
                    let prev = focusedIdx - 1;
                    while (prev >= 0) {
                        const l = leftRows[prev];
                        const r = rightRows[prev];
                        if ((l && l.type !== 'same' && l.type !== 'empty') || (r && r.type !== 'same' && r.type !== 'empty')) break;
                        prev--;
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
            <div className="split-diff-container custom-scroll"
                ref={scrollerRef}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', minHeight: 0, outline: 'none' }}>
                {rows.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: 'var(--text-secondary)', backgroundColor: 'var(--panel-bg)', borderRadius: 'var(--radius-lg)', margin: '20px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9 }}>
                            <span>✓</span>
                            <span>File Synchronized</span>
                        </div>
                        <div style={{ marginTop: '8px', opacity: 0.7, fontSize: '0.9rem' }}>No differences remain in this file.</div>
                    </div>
                ) : (
                    rows.map((_, i) => {
                        const l = leftRows[i] || { type: 'empty' };
                        const r = rightRows[i] || { type: 'empty' };

                        const isVisible = (rowNode: any) => {
                            if (rowNode.type === 'empty') return false;
                            const t = rowNode.type === 'modified' ? 'modified' :
                                rowNode.type === 'added' ? 'added' :
                                    rowNode.type === 'removed' ? 'removed' : 'same';
                            return filters?.[t] !== false;
                        };

                        const lVis = isVisible(l);
                        const rVis = isVisible(r);

                        if (!lVis && !rVis) return null;

                        const lBlock = leftBlocks[i];
                        const rBlock = rightBlocks[i];

                        return (
                            <div key={i} className={`diff-row-wrapper ${focusedIdx === i ? 'is-focused-row' : ''}`} style={{ display: 'flex', minHeight: '16px', height: 'auto', flexShrink: 0 }}>
                                <div className="diff-col left" style={{ flex: '1 1 50%', width: '50%', maxWidth: '50%' }}>
                                    <DiffRow row={l} side="left" otherRow={r} onMerge={onMerge} index={i} showLineNumber={showLineNumbers} block={lBlock} otherBlock={rBlock} wrap={wrap} focusedZone={focusedIdx === i && focusSide === 'left' ? focusZone : null} />
                                </div>
                                <div className="diff-col right" style={{ flex: '1 1 50%', width: '50%', maxWidth: '50%' }}>
                                    <DiffRow row={r} side="right" otherRow={l} onMerge={onMerge} index={i} showLineNumber={showLineNumbers} block={rBlock} otherBlock={lBlock} wrap={wrap} focusedZone={focusedIdx === i && focusSide === 'right' ? focusZone : null} />
                                </div>
                            </div>
                        );
                    })
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
    focusedZone?: 'content' | 'line' | 'block' | null
}> = ({ row, side, otherRow, onMerge, index, showLineNumber, block, otherBlock, wrap, focusedZone }) => {
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
        </div >
    );
};
