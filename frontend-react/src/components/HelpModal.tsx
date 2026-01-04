import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    React.useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sections = [
        {
            title: "Global & Layout",
            keys: [
                { key: "v", desc: "Cycle Layout (Tree → Split → Full View)" },
                { key: "Esc", desc: "Global Reset / Close Active View" },
                { key: "F11", desc: "Toggle Full Screen" },
            ]
        },
        {
            title: "Folder Tree Navigation",
            keys: [
                { key: "↑ / ↓", desc: "Navigate files and folders" },
                { key: "Space / →", desc: "Expand folder or Open file preview" },
                { key: "←", desc: "Collapse folder or Jump to parent" },
                { key: "a / r / c", desc: "Jump to next Added / Removed / Modified" },
                { key: "Shift + a / r / c", desc: "Jump to previous Added / Removed / Modified" },
                { key: "h", desc: "Toggle visibility of hidden files" },
                { key: "Ctrl + H", desc: "Hide currently focused file (Alt+H on Mac)" },
            ]
        },
        {
            title: "Agent View (Diff Editor)",
            keys: [
                { key: "↑ / ↓", desc: "Navigate between difference blocks" },
                { key: "Enter", desc: "Quick Accept (Merge Left) on selected block" },
                { key: "← / →", desc: "Cycle: Content → Accept (←) → Revert (→)" },
                { key: "u", desc: "Toggle Merge Mode (Standard Line vs Smart Group)" },
                { key: "Esc", desc: "Step out: Focus Zones → Block Select → Folder Tree" },
                { key: "Ctrl + S", desc: "Save merged changes to disk" },
            ]
        }
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                width: '100%',
                maxWidth: '600px',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.03)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Keyboard className="text-accent" size={20} />
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Keyboard Shortcuts</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            borderRadius: '4px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '20px',
                    overflowY: 'auto',
                    flex: 1
                }} className="custom-scroll">
                    {sections.map((section, idx) => (
                        <div key={idx} style={{ marginBottom: idx === sections.length - 1 ? 0 : '24px' }}>
                            <h3 style={{
                                margin: '0 0 12px 0',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#60a5fa',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                {section.title}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {section.keys.map((item, kIdx) => (
                                    <div key={kIdx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        padding: '8px 12px',
                                        borderRadius: '6px'
                                    }}>
                                        <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{item.desc}</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {item.key.split(' ').map((k, i) => (
                                                <kbd key={i} style={{
                                                    backgroundColor: '#334155',
                                                    color: '#f1f5f9',
                                                    border: '1px solid #475569',
                                                    borderBottom: '2px solid #475569',
                                                    borderRadius: '4px',
                                                    padding: '2px 6px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    minWidth: '20px',
                                                    textAlign: 'center',
                                                    boxShadow: '0 1px 1px rgba(0,0,0,0.2)'
                                                }}>
                                                    {k === '+' ? '+' : k}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'rgba(0, 0, 0, 0.2)'
                }}>
                    <Command size={14} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Press <kbd style={{ background: '#334155', padding: '1px 4px', borderRadius: '3px', fontSize: '10px' }}>Esc</kbd> to close this menu
                    </span>
                </div>
            </div>
        </div>
    );
};
