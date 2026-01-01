import React from 'react';

export const UnifiedView: React.FC<{ diff?: string[], filters?: any }> = ({ diff, filters }) => {
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
        <div className="unified-container custom-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minHeight: 0 }}>
            {filteredDiff.length === 0 ? (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    color: '#888'
                }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 500, color: '#aaa' }}>✓ All changes merged</div>
                    <div style={{ marginTop: '8px', opacity: 0.7 }}>This file is synchronized.</div>
                </div>
            ) : (
                filteredDiff.map((line, idx) => {
                    let className = 'diff-line';
                    if (line.startsWith('+')) className += ' added';
                    if (line.startsWith('-')) className += ' removed';
                    if (line.startsWith('@@')) className += ' header';
                    return <div key={idx} className={className}>{line}</div>
                })
            )}
        </div>
    );
};
