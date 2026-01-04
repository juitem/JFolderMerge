import { useState } from 'react';

export interface ConfirmState {
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
    isAlert?: boolean;
}

export interface BrowseState {
    isOpen: boolean;
    target: 'left' | 'right' | 'import-exclude-folders' | 'import-exclude-files' | null;
    mode: 'file' | 'directory';
}

export interface HistoryState {
    isOpen: boolean;
    side: 'left' | 'right' | null;
}

export const useModalLogic = () => {
    // Confirm / Alert Modal
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false, title: '', message: '', action: null, isAlert: false
    });

    const showAlert = (title: string, message: string) => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            action: null,
            isAlert: true
        });
    };

    const showConfirm = (title: string, message: string, action: () => void) => {
        setConfirmState({
            isOpen: true,
            title,
            message,
            action,
            isAlert: false
        });
    };

    // Browse Modal
    const [browseState, setBrowseState] = useState<BrowseState>({
        isOpen: false, target: null, mode: 'directory'
    });

    const openBrowse = (target: 'left' | 'right' | 'import-exclude-folders' | 'import-exclude-files') => {
        const mode = (target === 'import-exclude-folders' || target === 'import-exclude-files') ? 'file' : 'directory';
        setBrowseState({ isOpen: true, target, mode });
    };

    const closeBrowse = () => setBrowseState(prev => ({ ...prev, isOpen: false }));

    // History Modal
    const [historyState, setHistoryState] = useState<HistoryState>({
        isOpen: false, side: null
    });

    const openHistory = (side: 'left' | 'right') => setHistoryState({ isOpen: true, side });
    const closeHistory = () => setHistoryState({ isOpen: false, side: null });

    // Help Modal
    const [helpOpen, setHelpOpen] = useState(false);

    return {
        confirmState, setConfirmState, showAlert, showConfirm,
        browseState, setBrowseState, openBrowse, closeBrowse,
        historyState, setHistoryState, openHistory, closeHistory,
        helpOpen, setHelpOpen
    };
};
