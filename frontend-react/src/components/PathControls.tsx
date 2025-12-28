import { History, FolderOpen, ArrowRightLeft } from 'lucide-react';

interface PathControlsProps {
    leftPath: string;
    setLeftPath: (p: string) => void;
    rightPath: string;
    setRightPath: (p: string) => void;
    onHistory: (side: 'left' | 'right') => void;
    onBrowse: (side: 'left' | 'right') => void;
    onSwap: () => void;
}

export function PathControls({
    leftPath, setLeftPath,
    rightPath, setRightPath,
    onHistory, onBrowse, onSwap
}: PathControlsProps) {
    return (
        <div className="controls-bar glass-panel" style={{ margin: '0 20px', borderRadius: '0 0 6px 6px', borderTop: 'none' }}>
            <div className="path-group">
                <div className="input-wrapper">
                    <input value={leftPath} onChange={e => setLeftPath(e.target.value)} placeholder="/path/to/left" />
                    <button className="inner-btn" title="Recent Left Paths" onClick={() => onHistory('left')}><History size={14} /></button>
                    <button className="inner-btn" title="Browse" onClick={() => onBrowse('left')}><FolderOpen size={14} /></button>
                </div>
            </div>

            <button className="icon-btn" onClick={onSwap} title="Swap Paths">
                <ArrowRightLeft size={16} />
            </button>

            <div className="path-group">
                <div className="input-wrapper">
                    <input value={rightPath} onChange={e => setRightPath(e.target.value)} placeholder="/path/to/right" />
                    <button className="inner-btn" title="Recent Right Paths" onClick={() => onHistory('right')}><History size={14} /></button>
                    <button className="inner-btn" title="Browse" onClick={() => onBrowse('right')}><FolderOpen size={14} /></button>
                </div>
            </div>
        </div>
    );
}
