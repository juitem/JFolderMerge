import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    danger?: boolean;
    separator?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        // Prevent scroll when menu is open? Maybe not necessary but helpful.
        // document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            // document.body.style.overflow = '';
        };
    }, [onClose]);

    // Adjust position to keep in viewport (basic implementation)
    // We can use useLayoutEffect for more advanced positioning if needed.
    const style: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 9999, // High z-index
        minWidth: '200px',
        backgroundColor: '#1e293b', // Slate-800
        border: '1px solid #334155', // Slate-700
        borderRadius: '8px',
        padding: '4px 0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    };

    return (
        <div ref={menuRef} style={style} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
            {items.map((item, index) => {
                if (item.separator) {
                    return <div key={index} style={{ height: '1px', backgroundColor: '#334155', margin: '4px 0' }} />;
                }

                return (
                    <button
                        key={index}
                        onClick={() => {
                            if (!item.disabled) {
                                item.onClick();
                                onClose();
                            }
                        }}
                        disabled={item.disabled}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            padding: '8px 16px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: item.danger ? '#ef4444' : (item.disabled ? '#64748b' : '#e2e8f0'),
                            fontSize: '13px',
                            cursor: item.disabled ? 'default' : 'pointer',
                            transition: 'background-color 0.1s',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            if (!item.disabled) e.currentTarget.style.backgroundColor = '#334155';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        {item.icon && <span style={{ width: '16px', display: 'flex' }}>{item.icon}</span>}
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
};
