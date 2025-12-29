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
};
