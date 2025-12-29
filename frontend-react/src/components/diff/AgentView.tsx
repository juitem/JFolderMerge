import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../../api';

interface DiffLine {
    type: 'header' | 'added' | 'removed' | 'same' | 'empty' | 'gap';
    content: string;
    leftLine?: number;
    rightLine?: number;
    // For gap expansion
    gapStart?: number;
    gapEnd?: number;
}

interface AgentViewProps {
    diff?: string[];
    showLineNumbers?: boolean;
    fullRightPath?: string;
    showSame?: boolean;
}

export const AgentView: React.FC<AgentViewProps> = ({ diff, showLineNumbers = true, fullRightPath, showSame = false }) => {
    // We store expanded lines in a map: gapKey -> string[]
    // gapKey e.g., "10-50" (start-end on right side)
    const [expandedContent, setExpandedContent] = useState<Record<string, string[]>>({});
    const [loadingGaps, setLoadingGaps] = useState<Record<string, boolean>>({});

    // Reset expansion when diff changes
    useEffect(() => {
        setExpandedContent({});
        setLoadingGaps({});
    }, [diff]);

    const parsedLines = useMemo(() => {
        if (!diff) return [];
        const lines: DiffLine[] = [];
        let leftLn = 0;
        let rightLn = 0;

        for (const line of diff) {
            if (line.startsWith('---') || line.startsWith('+++')) {
                continue; // Skip file headers
            }
            if (line.startsWith('@@')) {
                // Parse Header: @@ -OldStart,OldLen +NewStart,NewLen @@
                const match = line.match(/@@\s-(\d+)(?:,\d+)?\s\+(\d+)(?:,\d+)?\s@@/);
                if (match) {
                    const newLeftLn = parseInt(match[1], 10) - 1;
                    const newRightLn = parseInt(match[2], 10) - 1;

                    // Gap Detection
                    if (newRightLn > rightLn) {
                        const gapSize = newRightLn - rightLn;
                        if (gapSize > 0) {
                            lines.push({
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
                }
            } else if (line.startsWith('-')) {
                leftLn++;
                lines.push({ type: 'removed', content: line.substring(1), leftLine: leftLn });
            } else if (line.startsWith('+')) {
                rightLn++;
                lines.push({ type: 'added', content: line.substring(1), rightLine: rightLn });
            } else if (line.startsWith(' ')) {
                leftLn++;
                rightLn++;
                lines.push({ type: 'same', content: line.substring(1), leftLine: leftLn, rightLine: rightLn });
            } else {
                lines.push({ type: 'empty', content: line });
            }
        }
        return lines;
    }, [diff]);

    // Effect: Handle Global Context Toggle (mapped to showSame prop)
    useEffect(() => {
        if (showSame && fullRightPath) {
            // Expand ALL gaps
            const gaps = parsedLines.filter(l => l.type === 'gap');
            if (gaps.length === 0) return;

            // Optimisation: Fetch file once, then fill all gaps
            const fetchAndExpandAll = async () => {
                try {
                    const res = await api.fetchFileContent(fullRightPath);
                    if (res && res.content) {
                        const allLines = res.content.split(/\r?\n/);
                        const newExpanded: Record<string, string[]> = {};

                        gaps.forEach(gap => {
                            if (gap.gapStart && gap.gapEnd) {
                                const key = `${gap.gapStart}-${gap.gapEnd}`;
                                // slice is 0-indexed, start-1. End is exclusive.
                                // Inclusive end means we need (gapEnd) for slice?
                                // slice(start-index, end-index).
                                // If I want lines 4 to 6 (4,5,6). Index 3 to 6. (6 is exclusive, so 3,4,5).
                                // slice(3, 6).
                                // gapStart=4, gapEnd=6.
                                // slice(gapStart-1, gapEnd).
                                newExpanded[key] = allLines.slice(gap.gapStart - 1, gap.gapEnd);
                            }
                        });

                        setExpandedContent(prev => ({ ...prev, ...newExpanded }));
                    }
                } catch (e) {
                    console.error("Failed to expand all", e);
                }
            };
            fetchAndExpandAll();
        } else if (!showSame) {
            // Collapse if toggled off
            if (diff) { // Check ensures not initial render
                setExpandedContent({});
            }
        }
    }, [showSame, parsedLines, fullRightPath]);

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
        } catch (e) {
            console.error("Failed to expand lines", e);
        } finally {
            setLoadingGaps(prev => ({ ...prev, [key]: false }));
        }
    };

    if (!diff) return <div className="p-4 text-gray-500">No Diff Data</div>;

    return (
        <div className="agent-view-container custom-scroll">
            <div className="agent-diff-table">
                {parsedLines.map((line, idx) => {
                    if (line.type === 'gap') {
                        const key = `${line.gapStart}-${line.gapEnd}`;
                        const expandedLines = expandedContent[key];

                        if (expandedLines || showSame) {
                            // If showSame is ON but we are waiting for data or expandedLines exists
                            if (!expandedLines) {
                                return (
                                    <div key={idx} className="agent-diff-row gap">
                                        <div className="agent-gap-bar">Loading Context...</div>
                                    </div>
                                );
                            }

                            // Render expanded lines
                            return (
                                <React.Fragment key={idx}>
                                    {expandedLines.map((content, i) => {
                                        const actualLn = (line.gapStart || 0) + i;
                                        return (
                                            <div key={`${key}-${i}`} className="agent-diff-row same expanded">
                                                {showLineNumbers && (
                                                    <>
                                                        <div className="agent-gutter noselect">{/* approx left ln? */}</div>
                                                        <div className="agent-gutter noselect">{actualLn}</div>
                                                    </>
                                                )}
                                                <div className="agent-content">{content}</div>
                                            </div>
                                        )
                                    })}
                                </React.Fragment>
                            );
                        } else {
                            // Render Gap Button
                            return (
                                <div key={idx} className="agent-diff-row gap" onClick={() => line.gapStart && line.gapEnd && handleExpand(line.gapStart, line.gapEnd)}>
                                    <div className="agent-gap-bar">
                                        {loadingGaps[key] ? 'Loading...' : `↕ ${line.content}`}
                                    </div>
                                </div>
                            );
                        }
                    }

                    return (
                        <div key={idx} className={`agent-diff-row ${line.type}`}>
                            {showLineNumbers && (
                                <>
                                    <div className="agent-gutter noselect">
                                        {line.type === 'header' || line.type === 'empty' ? '' : (line.leftLine || '')}
                                    </div>
                                    <div className="agent-gutter noselect">
                                        {line.type === 'header' || line.type === 'empty' ? '' : (line.rightLine || '')}
                                    </div>
                                </>
                            )}
                            <div className="agent-content">
                                {line.content}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
