import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { DiffResult, DiffMode, Config } from '../types';



interface DiffViewerProps {
    leftPathBase: string;
    rightPathBase: string;
    relPath: string; // Relative path of selected file
    initialMode?: DiffMode;
    onModeChange?: (mode: DiffMode) => void;
    config: Config;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
    leftPathBase, rightPathBase, relPath, initialMode = 'side-by-side', config
}) => {
    const [mode, setMode] = useState<DiffMode>(initialMode);

    // Sync if initialMode changes (though usually App passes persisted state)
    useEffect(() => {
        if (initialMode && initialMode !== mode) {
            setMode(initialMode);
        }
    }, [initialMode]);


    const [diffData, setDiffData] = useState<DiffResult | null>(null);
    const [rawContent, setRawContent] = useState<{ left: string, right: string } | null>(null);



    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchDiff = async () => {
        setLoading(true);
        setError("");
        setDiffData(null);
        setRawContent(null);

        try {
            const fullLeft = leftPathBase + '/' + relPath;
            const fullRight = rightPathBase + '/' + relPath;

            if (mode === 'raw') {
                // Fetch raw content for both files
                // We use Promise.allSettled to allow one side to be missing (e.g. added/removed file)
                const [leftRes, rightRes] = await Promise.allSettled([
                    api.fetchFileContent(fullLeft),
                    api.fetchFileContent(fullRight)
                ]);

                // Helper to extract content
                const getStr = (val: any) => {
                    if (!val) return "";
                    if (typeof val === 'string') return val;
                    if (val.content !== undefined) return val.content;
                    return JSON.stringify(val, null, 2);
                };

                setRawContent({
                    left: getStr(leftRes.status === 'fulfilled' ? leftRes.value : null),
                    right: getStr(rightRes.status === 'fulfilled' ? rightRes.value : null)
                });

            } else {
                const data = await api.fetchDiff(fullLeft, fullRight, mode);
                setDiffData(data);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiff();
    }, [relPath, mode, leftPathBase, rightPathBase]);

    const handleLineMerge = async (sourceText: string, targetSide: 'left' | 'right', targetLineIndex: number | null, type: 'insert' | 'replace' | 'delete', viewIndex: number) => {
        setLoading(true);
        try {
            const targetPathBase = targetSide === 'left' ? leftPathBase : rightPathBase;
            const fullTargetPath = targetPathBase + '/' + relPath;

            // 1. Fetch current target content
            const fileData = await api.fetchFileContent(fullTargetPath);
            let lines = fileData && fileData.content ? fileData.content.split(/\r?\n/) : [];

            // 2. Modify Lines
            if (type === 'delete') {
                if (targetLineIndex !== null) {
                    // Line numbers are 1-based, array is 0-based
                    lines.splice(targetLineIndex - 1, 1);
                }
            } else if (type === 'replace') {
                if (targetLineIndex !== null) {
                    lines[targetLineIndex - 1] = sourceText;
                }
            } else if (type === 'insert') {
                let insertAt = 0;
                const rows = targetSide === 'left' ? diffData?.left_rows : diffData?.right_rows;
                if (rows) {
                    for (let i = viewIndex - 1; i >= 0; i--) {
                        if (rows[i].line) {
                            insertAt = rows[i].line; // Insert AFTER this line
                            break;
                        }
                    }
                }
                lines.splice(insertAt, 0, sourceText);
            }

            // 3. Save
            await api.saveFile(fullTargetPath, lines.join('\n'));

            // 4. Refresh
            await fetchDiff();
        } catch (e: any) {
            setError("Merge failed: " + e.message);
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-diff">Loading Diff...</div>;
    // Error can be shown, but sometimes we want to show partial content.
    if (error) return <div className="error-diff">Error: {error}</div>;

    // In raw mode, we check rawContent. In other modes, diffData.
    if (mode === 'raw' && !rawContent) return <div className="empty-diff">Select a file to compare</div>;
    if (mode !== 'raw' && !diffData) return <div className="empty-diff">Select a file to compare</div>;

    return (
        <div className="diff-component">
            <div className={`diff-content ${mode}`}>
                {mode === 'unified' && diffData && <UnifiedView diff={diffData.diff} filters={config.diffFilters} />}
                {mode === 'side-by-side' && diffData && (
                    <SideBySideView
                        leftRows={diffData.left_rows}
                        rightRows={diffData.right_rows}
                        filters={config.diffFilters}
                        onMerge={handleLineMerge}
                    />
                )}
                {mode === 'raw' && rawContent && (
                    <RawView left={rawContent.left} right={rawContent.right} />
                )}
                {mode === 'combined' && diffData && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        <div style={{ flex: 1, minHeight: 0, borderBottom: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                            <UnifiedView diff={diffData.diff} filters={config.diffFilters} />
                        </div>
                        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            <SideBySideView
                                leftRows={diffData.left_rows}
                                rightRows={diffData.right_rows}
                                filters={config.diffFilters}
                                onMerge={handleLineMerge}
                            />
                        </div>
                    </div>
                )}

            </div>

        </div>
    );
};

// ... Subcomponents remain same (UnifiedView, SideBySideView)
// But I need to include them in export to avoid duplicate logic unless I split files.
// I will include them here.

const RawView: React.FC<{ left: string, right: string }> = ({ left, right }) => {
    return (
        <div className="raw-diff-container" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <div className="diff-col left custom-scroll" style={{ flex: 1, padding: '10px', overflow: 'auto', borderRight: '1px solid #333' }}>
                <div className="diff-header" style={{ color: '#888', marginBottom: '5px' }}>Left</div>
                <pre style={{ margin: 0 }}>{left || "(Empty or Missing)"}</pre>
            </div>
            <div className="diff-col right custom-scroll" style={{ flex: 1, padding: '10px', overflow: 'auto' }}>
                <div className="diff-header" style={{ color: '#888', marginBottom: '5px' }}>Right</div>
                <pre style={{ margin: 0 }}>{right || "(Empty or Missing)"}</pre>
            </div>
        </div>
    );
};

const UnifiedView: React.FC<{ diff?: string[], filters?: any }> = ({ diff, filters }) => {
    if (!diff) return <div>No Diff Data</div>;

    // Filter Logic
    const filteredDiff = diff.filter(line => {
        let type = 'same';
        if (line.startsWith('+')) type = 'added';
        else if (line.startsWith('-')) type = 'removed';
        else if (line.startsWith('@@')) type = 'header';

        return filters?.[type] !== false;
    });

    return (
        <div className="unified-container custom-scroll" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {filteredDiff.map((line, idx) => {
                let className = 'diff-line';
                if (line.startsWith('+')) className += ' added';
                if (line.startsWith('-')) className += ' removed';
                if (line.startsWith('@@')) className += ' header';
                return <div key={idx} className={className}>{line}</div>
            })}
        </div>
    );
}

const SideBySideView: React.FC<{ leftRows?: any[], rightRows?: any[], filters?: any, onMerge: any }> = ({ leftRows, rightRows, filters, onMerge }) => {
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

const DiffRow: React.FC<{ row: any, side: 'left' | 'right', otherRow: any, onMerge: any, index: number, forceRender?: boolean }> = ({ row, side, otherRow, onMerge, index }) => {
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
}
