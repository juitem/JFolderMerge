import React, { useEffect, useState, useRef, useImperativeHandle } from 'react';
import { api } from '../api';
import type { DiffResult, DiffMode, Config } from '../types';
import { UnifiedView } from './diff/UnifiedView';
import { SideBySideView } from './diff/SideBySideView';
import { RawView } from './diff/RawView';
import { AgentView, type AgentViewHandle } from './diff/AgentView';

interface DiffViewerProps {
    leftPathBase: string;
    rightPathBase: string;
    relPath: string; // Relative path of selected file
    initialMode?: DiffMode;
    onModeChange?: (mode: DiffMode) => void;
    config: Config;
    onNextFile?: () => void;
    onPrevFile?: () => void;
}

export interface DiffViewerHandle {
    scrollToChange: (type: 'added' | 'removed' | 'any', direction: 'prev' | 'next') => void;
    mergeActiveBlock: () => void;
}

export const DiffViewer = React.forwardRef<DiffViewerHandle, DiffViewerProps>(({
    leftPathBase, rightPathBase, relPath, initialMode = 'side-by-side', config, onNextFile, onPrevFile
}, ref) => {
    const [mode, setMode] = useState<DiffMode>(initialMode);

    // Sync if initialMode changes (though usually App passes persisted state)
    useEffect(() => {
        if (initialMode && initialMode !== mode) {
            setMode(initialMode);
        }
    }, [initialMode]);


    const [diffData, setDiffData] = useState<DiffResult | null>(null);
    const [rawContent, setRawContent] = useState<{ left: string, right: string } | null>(null);

    const agentViewRef = useRef<AgentViewHandle>(null);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        scrollToChange: (type, direction) => {
            if (mode === 'agent' && agentViewRef.current) {
                agentViewRef.current.scrollToChange(type, direction);
            } else {
                console.log("Scroll to change not implemented for mode:", mode);
            }
        },
        mergeActiveBlock: () => {
            if (mode === 'agent' && agentViewRef.current) {
                agentViewRef.current.mergeActiveBlock();
            }
        }
    }));


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

    const handleAgentMerge = async (linesToMerge: string[], targetSide: 'left' | 'right', anchorLine: number, type: 'insert' | 'delete') => {
        setLoading(true);
        try {
            const targetPathBase = targetSide === 'left' ? leftPathBase : rightPathBase;
            const fullTargetPath = targetPathBase + '/' + relPath;

            // 1. Fetch
            const fileData = await api.fetchFileContent(fullTargetPath);
            let lines = fileData && fileData.content ? fileData.content.split(/\r?\n/) : [];

            // 2. Modify
            if (type === 'delete') {
                // anchorLine is 1-based, starting line to delete
                // linesToMerge length is how many lines to delete
                if (anchorLine > 0 && anchorLine <= lines.length) {
                    lines.splice(anchorLine - 1, linesToMerge.length);
                }
            } else if (type === 'insert') {
                // Insert lines AFTER anchorLine (1-based)
                // If anchorLine is 0, insert at beginning.
                lines.splice(anchorLine, 0, ...linesToMerge);
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
                        showLineNumbers={!!config.viewOptions?.showLineNumbers}
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
                                showLineNumbers={!!config.viewOptions?.showLineNumbers}
                            />
                        </div>
                    </div>
                )}
                {mode === 'agent' && diffData && (
                    <AgentView
                        ref={agentViewRef}
                        diff={diffData.diff}
                        showLineNumbers={!!config.viewOptions?.showLineNumbers}
                        fullRightPath={rightPathBase + '/' + relPath}
                        showSame={!!config.diffFilters?.same}
                        onMerge={handleAgentMerge}
                        onNextFile={onNextFile}
                        onPrevFile={onPrevFile}
                    />
                )}

            </div>

        </div>
    );
});
