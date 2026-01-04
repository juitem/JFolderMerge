import React, { useState, useEffect, useRef } from 'react';
import { FileText, Save, Undo, Redo, Eye, EyeOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../api';

interface RawViewProps {
    left: string;
    right: string;
    mode?: 'raw' | 'single';
    showLineNumbers?: boolean;
    wrap?: boolean;
    leftPath?: string; // Add path props for saving
    rightPath?: string;
}

interface EditorProps {
    content: string;
    readOnly?: boolean;
    onChange?: (val: string) => void;
    showLineNumbers?: boolean;
    wrap?: boolean;
    onSave?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
}

const EditorComponent: React.FC<EditorProps> = ({
    content,
    readOnly = false,
    onChange,
    showLineNumbers = true,
    wrap = false,
    onSave,
    onUndo,
    onRedo
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumsRef = useRef<HTMLDivElement>(null);

    const lines = content ? content.split(/\r?\n/) : [];
    const lineCount = lines.length || 1;

    const handleScroll = () => {
        if (textareaRef.current && lineNumsRef.current) {
            lineNumsRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (readOnly) return;

        // CRITICAL: Stop propagation for ALL keys to prevent app-level shortcuts (like global search, navigation, etc.)
        // while the user is focused on this editor.
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();

        if (e.key === 'Tab') {
            e.preventDefault();
            const target = e.currentTarget;
            const start = target.selectionStart;
            const end = target.selectionEnd;

            // Insert 4 spaces
            const indent = '    ';
            const newValue = content.substring(0, start) + indent + content.substring(end);

            onChange?.(newValue);

            // Restore cursor position after state update
            // We need to wait for the value to update in React render cycle, but setting it on the DOM element 
            // directly often works for cursor management in controlled inputs if timed right.
            // React's state update is async, so we use a small timeout or just set it immediately hoping for the best?
            // Actually, best practice in controlled component is to handle selection range.
            // But since we don't have full selection state management here, we'll try immediate update + requestAnimationFrame.
            requestAnimationFrame(() => {
                target.setSelectionRange(start + indent.length, start + indent.length);
            });
        }
        else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            onSave?.();
        } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
            e.preventDefault();
            onRedo?.();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            onUndo?.();
        }
    };

    return (
        <div className="editor-container" style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
            {showLineNumbers && (
                <div
                    ref={lineNumsRef}
                    className="line-numbers custom-scroll"
                    style={{
                        width: '40px',
                        minWidth: '40px',
                        textAlign: 'right',
                        padding: '10px 5px 10px 0',
                        color: '#64748b',
                        background: '#0f172a',
                        borderRight: '1px solid #334155',
                        userSelect: 'none',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        overflow: 'hidden'
                    }}
                >
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i}>{i + 1}</div>
                    ))}
                </div>
            )}
            <textarea
                ref={textareaRef}
                value={content || ''}
                readOnly={readOnly}
                onChange={(e) => onChange && onChange(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                className="custom-scroll"
                spellCheck={false}
                style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#e2e8f0',
                    border: 'none',
                    resize: 'none',
                    padding: '10px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    fontFamily: 'monospace',
                    outline: 'none',
                    whiteSpace: wrap ? 'pre-wrap' : 'pre',
                    overflow: 'auto'
                }}
            />
        </div>
    );
};

export const RawView: React.FC<RawViewProps> = ({
    left: initialLeft,
    right: initialRight,
    mode = 'raw',
    showLineNumbers = true,
    wrap = false,
    leftPath = '',
    rightPath = ''
}) => {
    const [activeSide, setActiveSide] = useState<'left' | 'right'>('right');
    const [history, setHistory] = useState<{ left: string[], right: string[] }>({ left: [], right: [] });
    const [historyIndex, setHistoryIndex] = useState<{ left: number, right: number }>({ left: -1, right: -1 });
    const [isDirty, setIsDirty] = useState<{ left: boolean, right: boolean }>({ left: false, right: false });
    const [showMarkdown, setShowMarkdown] = useState(false);

    // Track current content separately for left/right to support switching without losing edits
    const [currentLeft, setCurrentLeft] = useState(initialLeft);
    const [currentRight, setCurrentRight] = useState(initialRight);

    useEffect(() => {
        setCurrentLeft(initialLeft);
        setCurrentRight(initialRight);
        setHistory({ left: [initialLeft], right: [initialRight] });
        setHistoryIndex({ left: 0, right: 0 });
        setIsDirty({ left: false, right: false });
    }, [initialLeft, initialRight]);

    const getCurrentContent = () => activeSide === 'left' ? currentLeft : currentRight;
    const getCurrentPath = () => activeSide === 'left' ? leftPath : rightPath;

    const handleContentChange = (newContent: string) => {
        const side = activeSide;
        if (side === 'left') {
            setCurrentLeft(newContent);
        } else {
            setCurrentRight(newContent);
        }

        // Add to history
        const currentHist = history[side];
        const currentIndex = historyIndex[side];

        const newHistory = [...currentHist.slice(0, currentIndex + 1), newContent];

        setHistory(prev => ({ ...prev, [side]: newHistory }));
        setHistoryIndex(prev => ({ ...prev, [side]: newHistory.length - 1 }));
        setIsDirty(prev => ({ ...prev, [side]: true }));
    };

    const handleUndo = () => {
        const side = activeSide;
        const index = historyIndex[side];
        if (index > 0) {
            const newIndex = index - 1;
            const content = history[side][newIndex];
            if (side === 'left') setCurrentLeft(content);
            else setCurrentRight(content);
            setHistoryIndex(prev => ({ ...prev, [side]: newIndex }));
        }
    };

    const handleRedo = () => {
        const side = activeSide;
        const index = historyIndex[side];
        if (index < history[side].length - 1) {
            const newIndex = index + 1;
            const content = history[side][newIndex];
            if (side === 'left') setCurrentLeft(content);
            else setCurrentRight(content);
            setHistoryIndex(prev => ({ ...prev, [side]: newIndex }));
        }
    };

    const handleSave = async () => {
        const path = getCurrentPath();
        const content = getCurrentContent();
        if (!path) {
            alert("Cannot save: No file path available.");
            return;
        }
        try {
            await api.saveFile(path, content);
            setIsDirty(prev => ({ ...prev, [activeSide]: false }));
            // Optionally notify user
        } catch (e) {
            alert("Failed to save file.");
            console.error(e);
        }
    };

    const renderMarkdown = (content: string) => (
        <div className="markdown-preview custom-scroll" style={{ flex: 1, padding: '20px', overflow: 'auto', background: '#0f172a', color: '#e2e8f0' }}>
            <ReactMarkdown>{content}</ReactMarkdown>
        </div>
    );

    if (mode === 'single') {
        const content = getCurrentContent();
        const side = activeSide;
        const canUndo = historyIndex[side] > 0;
        const canRedo = historyIndex[side] < history[side].length - 1;
        const dirty = isDirty[side];

        return (
            <div className="raw-diff-container" style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>
                <div className="diff-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, width: '100%', maxWidth: '100%' }}>
                    <div className="diff-header" style={{
                        color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderBottom: '1px solid #333', padding: '8px 16px', background: '#0f172a', flexShrink: 0
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={16} />
                                <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Single View</span>
                                {dirty && <span style={{ color: '#eab308', fontSize: '10px' }}>●</span>}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', padding: '2px', borderRadius: '6px' }}>
                                <button
                                    onClick={() => setActiveSide('left')}
                                    style={{
                                        border: 'none',
                                        background: activeSide === 'left' ? '#3b82f6' : 'transparent',
                                        color: activeSide === 'left' ? 'white' : '#94a3b8',
                                        padding: '4px 12px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}>
                                    Left
                                </button>
                                <button
                                    onClick={() => setActiveSide('right')}
                                    style={{
                                        border: 'none',
                                        background: activeSide === 'right' ? '#3b82f6' : 'transparent',
                                        color: activeSide === 'right' ? 'white' : '#94a3b8',
                                        padding: '4px 12px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}>
                                    Right
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={handleUndo} disabled={!canUndo} title="Undo" style={{ background: 'none', border: 'none', cursor: canUndo ? 'pointer' : 'default', color: canUndo ? '#cbd5e1' : '#475569' }}>
                                <Undo size={16} />
                            </button>
                            <button onClick={handleRedo} disabled={!canRedo} title="Redo" style={{ background: 'none', border: 'none', cursor: canRedo ? 'pointer' : 'default', color: canRedo ? '#cbd5e1' : '#475569' }}>
                                <Redo size={16} />
                            </button>
                            <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 4px' }} />
                            <button onClick={handleSave} disabled={!dirty} title="Save" style={{ background: 'none', border: 'none', cursor: dirty ? 'pointer' : 'default', color: dirty ? '#3b82f6' : '#475569' }}>
                                <Save size={16} />
                            </button>
                            <div style={{ width: '1px', height: '16px', background: '#334155', margin: '0 4px' }} />
                            <button
                                onClick={() => setShowMarkdown(!showMarkdown)}
                                title={showMarkdown ? "Edit Code" : "Preview Markdown"}
                                style={{ background: showMarkdown ? '#3b82f6' : 'none', border: 'none', cursor: 'pointer', color: showMarkdown ? 'white' : '#cbd5e1', borderRadius: '4px', padding: '2px' }}
                            >
                                {showMarkdown ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {showMarkdown ? renderMarkdown(content) : (
                        <EditorComponent
                            content={content}
                            onChange={handleContentChange}
                            showLineNumbers={showLineNumbers}
                            wrap={wrap}
                            onSave={handleSave}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="raw-diff-container" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <div className="diff-col left" style={{ flex: 1, padding: '0', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                <div className="diff-header" style={{ color: '#888', padding: '10px', background: '#0f172a', borderBottom: '1px solid #333' }}>Left</div>
                <EditorComponent
                    content={currentLeft}
                    readOnly={true}
                    showLineNumbers={showLineNumbers}
                    wrap={wrap}
                />
            </div>
            <div className="diff-col right" style={{ flex: 1, padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div className="diff-header" style={{ color: '#888', padding: '10px', background: '#0f172a', borderBottom: '1px solid #333' }}>Right</div>
                <EditorComponent
                    content={currentRight}
                    readOnly={true}
                    showLineNumbers={showLineNumbers}
                    wrap={wrap}
                />
            </div>
        </div>
    );
};
