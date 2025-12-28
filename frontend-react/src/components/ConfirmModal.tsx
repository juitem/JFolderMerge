import React from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isAlert?: boolean; // New optional prop
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel, isAlert = false }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={isAlert ? onConfirm : onCancel} style={{ zIndex: 1000 }}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="icon-btn" onClick={isAlert ? onConfirm : onCancel}><X size={18} /></button>
                </div>
                <div className="modal-body" style={{ padding: '20px' }}>
                    <p>{message}</p>
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {!isAlert && <button className="secondary-btn" onClick={onCancel}>Cancel</button>}
                    <button className="primary-btn" onClick={onConfirm} autoFocus={isAlert}>{isAlert ? 'OK' : 'Confirm'}</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
