import React from 'react';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';

export const SideBySideView: React.FC<{
    leftRows?: any[],
    rightRows?: any[],
    filters?: any,
    onMerge: any,
    showLineNumbers?: boolean,
    wrap?: boolean
}> = ({ leftRows, rightRows, filters, onMerge, showLineNumbers, wrap }) => {
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

    return (
        <div className="split-diff-container custom-scroll" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', minHeight: 0 }}>
            {rows.map((_, i) => {
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
                    <div key={i} className="diff-row-wrapper" style={{ display: 'flex', minHeight: '16px', height: 'auto', flexShrink: 0 }}>
                        <div className="diff-col left" style={{ flex: '1 1 50%', width: '50%', maxWidth: '50%' }}>
                            <DiffRow row={l} side="left" otherRow={r} filters={filters} onMerge={onMerge} index={i} forceRender={true} showLineNumber={showLineNumbers} block={lBlock} otherBlock={rBlock} wrap={wrap} />
                        </div>
                        <div className="diff-col right" style={{ flex: '1 1 50%', width: '50%', maxWidth: '50%' }}>
                            <DiffRow row={r} side="right" otherRow={l} filters={filters} onMerge={onMerge} index={i} forceRender={true} showLineNumber={showLineNumbers} block={rBlock} otherBlock={lBlock} wrap={wrap} />
                        </div>
                    </div>
                );
            })}
            {len === 0 && <div className="empty-diff-message" style={{ padding: 20, color: '#888' }}>No visible changes</div>}
        </div>
    );
};

const DiffRow: React.FC<{
    row: any,
    side: 'left' | 'right',
    otherRow: any,
    filters?: any,
    onMerge: any,
    index: number,
    forceRender?: boolean,
    showLineNumber?: boolean,
    block?: { type: string, lines: string[], count: number, startLine?: number },
    otherBlock?: { type: string, lines: string[], count: number, startLine?: number },
    wrap?: boolean
}> = ({ row, side, otherRow, onMerge, index, showLineNumber, block, otherBlock, wrap }) => {
    const hasContent = row.type !== 'empty' && row.type !== 'same';
    const isEmptySpacer = row.type === 'empty' && otherRow && otherRow.type !== 'empty' && otherRow.type !== 'same';

    return (
        <div className={`diff-line ${row.type}`} data-idx={index}>
            {showLineNumber && (
                <span className="line-number" style={{
                    display: 'inline-block', width: '30px', textAlign: 'right', marginRight: '8px',
                    color: '#666', fontSize: '0.8rem', userSelect: 'none', opacity: 0.7,
                    flexShrink: 0 // Prevent shrinking
                }}>{row.line || ''}</span>
            )}

            {/* Block Merge Icon */}
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
                                color: side === 'left' ? '#ec4899' : '#4ade80', // Magenta for Revert (Right), Green for Accept (Left)
                                border: side === 'left' ? '1px solid #ec4899' : '1px solid #4ade80',
                            }}
                            onClick={() => {
                                // Delete OTHER side's block
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
                    <button className={`merge-btn small ${side === 'left' ? 'to-right' : 'to-left'}`} title={`Merge to ${side === 'left' ? 'Right' : 'Left'}`} onClick={() => {
                        const actionType = (!otherRow || !otherRow.line) ? 'insert' : 'replace';
                        const sourceText = Array.isArray(row.text) ? row.text.map((t: any) => t.text).join('') : row.text;
                        onMerge(sourceText, side === 'left' ? 'right' : 'left', otherRow?.line || null, actionType, index);
                    }}>
                        {side === 'left' ? <ArrowRight size={12} strokeWidth={3} /> : <ArrowLeft size={12} strokeWidth={3} />}
                    </button>
                )}
                {isEmptySpacer && (
                    <button className={`merge-btn small ${side === 'left' ? 'to-right' : 'to-left'}`} title={`Merge Empty to ${side === 'left' ? 'Right' : 'Left'} (Delete)`} onClick={() => {
                        onMerge("", side === 'left' ? 'right' : 'left', otherRow.line, 'delete', index);
                    }}>
                        <Trash2 size={12} strokeWidth={3} />
                    </button>
                )}
            </div>

            <span className={`diff-text ${wrap === false ? 'no-wrap' : ''}`}>
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
