import React from 'react';

export const SideBySideView: React.FC<{ leftRows?: any[], rightRows?: any[], filters?: any, onMerge: any }> = ({ leftRows, rightRows, filters, onMerge }) => {
    if (!leftRows || !rightRows) return <div>No Split Data</div>;

    // Filter Logic: Skip rows where BOTH sides are hidden by filter
    // 1. "same" lines are symmetric. If filter.same=false, both are hidden -> Skip.
    // 2. "detailed" lines: if left is added (filtered?) and right is empty...
    //    If we filter "added", left is hidden. Right is empty. Should we show?
    //    Usually we hide the whole row if it contains no visible info.
    //    Let's check visibility.

    const rows = [];
    const len = Math.max(leftRows.length, rightRows.length);

    for (let i = 0; i < len; i++) {
        const l = leftRows[i] || { type: 'empty' };
        const r = rightRows[i] || { type: 'empty' };

        // Check if visible
        // Helper: type -> visibility
        const isVisible = (rowNode: any) => {
            const t = rowNode.type === 'modified' ? 'modified' :
                rowNode.type === 'added' ? 'added' :
                    rowNode.type === 'removed' ? 'removed' : 'same';
            // Empty is always "visible" unless paired with a hidden content?
            // No, empty itself is neutral. Visibility depends on CONTENT.
            // If type is empty, it doesn't force show.
            if (rowNode.type === 'empty') return false; // Empty doesn't demand show
            return filters?.[t] !== false;
        };

        const lVis = isVisible(l);
        const rVis = isVisible(r);

        // If NEITHER side produces visible content, skip row.
        // (Empty counts as "not producing content").
        // Exception: If one side is empty and other is hidden content -> Skip.
        // If one side is empty and other is visible content -> Show.
        // If both are same (and filtered) -> Skip.
        // If both are same (and shown) -> Show.

        if (!lVis && !rVis) continue;

        rows.push(
            <div key={i} className="diff-row-wrapper" style={{ display: 'flex', minHeight: '24px' }}>
                <div className="diff-col left" style={{ flex: '1 1 50%', width: '50%', maxWidth: '50%' }}>
                    <DiffRow row={l} side="left" otherRow={r} filters={filters} onMerge={onMerge} index={i} forceRender={true} />
                </div>
                <div className="diff-col right" style={{ flex: '1 1 50%', width: '50%', maxWidth: '50%' }}>
                    <DiffRow row={r} side="right" otherRow={l} filters={filters} onMerge={onMerge} index={i} forceRender={true} />
                </div>
            </div>
        );
    }

    return (
        <div className="split-diff-container custom-scroll" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', minHeight: 0 }}>
            {rows}
            {rows.length === 0 && <div className="empty-diff-message" style={{ padding: 20, color: '#888' }}>No visible changes</div>}
        </div>
    )
}

const DiffRow: React.FC<{ row: any, side: 'left' | 'right', otherRow: any, filters?: any, onMerge: any, index: number, forceRender?: boolean }> = ({ row, side, otherRow, onMerge, index }) => {
    // Merge Logic Determination
    // Case 1: I have content. Target is Empty (Insert) or Different (Replace).

    // Filter Logic is now handled by Parent for Row Skipping.
    // However, we might still want to apply classes or styling.
    // If strict row skipping is done, we simply render.

    // Legacy Safety:
    // const isHidden = !forceRender && filters?.[type] === false;
    // if (isHidden) return <div className={`diff-line hidden-by-filter ${myType}`}></div>;

    // Merge Logic Determination

    // If I am empty, I can "pull" from other side? Or "delete" myself?
    // Wait, the button is usually on the CONTENT side to push to other, OR on the EMPTY side to pull/delete?

    // Legacy Logic:
    // Button on the row that handles the action.
    // If I have content (Mod/Add/Rem): Button to Copy TO Other Side.
    // If I am empty (and other has content): Button to DELETE from Other Side (acting as "pull deletion"? No, "Delete Right Line").

    // React Implementation:
    // Let's put buttons on the source of the action.

    // Case 1: I have content. Target is Empty (Insert) or Different (Replace).
    // Button: "Copy to Right/Left".
    const hasContent = row.type !== 'empty' && row.type !== 'same'; // same doesn't need merge usually
    // valid types for action: modified, added, removed.

    // Case 2: I am empty. Target has content.
    // Button: "Delete Right/Left Line" (simulate pulling an emptiness/deletion).
    const isEmptySpacer = row.type === 'empty' && otherRow && otherRow.type !== 'empty' && otherRow.type !== 'same';

    return (
        <div className={`diff-line ${row.type}`} data-idx={index}>
            <div className="diff-actions">
                {hasContent && (
                    <button className="merge-btn small" title={`Copy to ${side === 'left' ? 'Right' : 'Left'}`} onClick={() => {
                        // Copy MY text to OTHER side
                        // If other side is empty -> Insert
                        // If other side has content -> Replace
                        const actionType = (!otherRow || !otherRow.line) ? 'insert' : 'replace';
                        const sourceText = Array.isArray(row.text) ? row.text.map((t: any) => t.text).join('') : row.text;
                        onMerge(sourceText, side === 'left' ? 'right' : 'left', otherRow?.line || null, actionType, index);
                    }}>
                        {side === 'left' ? '→' : '←'}
                    </button>
                )}
                {isEmptySpacer && (
                    <button className="merge-btn small" title={`Copy Empty to ${side === 'left' ? 'Right' : 'Left'} (Delete)`} onClick={() => {
                        // Delete OTHER side's line (Propagate Emptiness)
                        onMerge("", side === 'left' ? 'right' : 'left', otherRow.line, 'delete', index);
                    }}>
                        {side === 'left' ? '→' : '←'}
                    </button>
                )}
            </div>

            <span className="diff-text">
                {Array.isArray(row.text) ? (
                    row.text.map((seg: any, si: number) => (
                        <span key={si} className={seg.type !== 'same' ? `diff-span-${seg.type}` : ''}>{seg.text}</span>
                    ))
                ) : (
                    row.text || " "
                )}
            </span>
        </div>
    );
};
