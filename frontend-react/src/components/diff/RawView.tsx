import React from 'react';
import { FileText } from 'lucide-react';

export const RawView: React.FC<{ left: string, right: string, mode?: 'raw' | 'single' }> = ({ left, right, mode = 'raw' }) => {
    if (mode === 'single') {
        return (
            <div className="raw-diff-container" style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>
                <div className="diff-col right custom-scroll" style={{ flex: 1, padding: '20px', overflow: 'auto', width: '100%', maxWidth: '100%' }}>
                    <div className="diff-header" style={{ color: '#888', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} />
                        <span>Full Content (Right/Agent Version)</span>
                    </div>
                    <pre style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#eee' }}>{right || "(Empty or Missing)"}</pre>
                </div>
            </div>
        );
    }

    return (
        <div className="raw-diff-container" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <div className="diff-col left custom-scroll" style={{ flex: 1, padding: '10px', overflow: 'auto', borderRight: '1px solid #333' }}>
                <div className="diff-header" style={{ color: '#888', marginBottom: '5px' }}>Left (User)</div>
                <pre style={{ margin: 0 }}>{left || "(Empty or Missing)"}</pre>
            </div>
            <div className="diff-col right custom-scroll" style={{ flex: 1, padding: '10px', overflow: 'auto' }}>
                <div className="diff-header" style={{ color: '#888', marginBottom: '5px' }}>Right (Agent)</div>
                <pre style={{ margin: 0 }}>{right || "(Empty or Missing)"}</pre>
            </div>
        </div>
    );
};
