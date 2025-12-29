import React from 'react';

export const RawView: React.FC<{ left: string, right: string }> = ({ left, right }) => {
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
