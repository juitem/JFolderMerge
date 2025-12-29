import React from 'react';
import { X } from 'lucide-react';
import { BrowseModal } from '../BrowseModal';
import { HistoryModal } from '../HistoryModal';
import ConfirmModal from '../ConfirmModal';
import type { Config } from '../../types';

import { useConfig } from '../../contexts/ConfigContext';
import { JLogo } from '../common/JLogo';

interface AppModalsProps {
    config: Config | null;
    // Browse State
    browseState: {
        isOpen: boolean;
        target: 'left' | 'right' | 'import-exclude-folders' | 'import-exclude-files' | null;
        mode: 'file' | 'directory';
    };
    setBrowseState: (s: any) => void; // Using any for simplicty of state update merge
    onBrowseSelect: (path: string) => void;
    leftPath: string;
    rightPath: string;

    // History State
    historyState: { isOpen: boolean; side: 'left' | 'right' | null };
    setHistoryState: (s: any) => void;
    onHistorySelect: (left: string, right?: string) => void;

    // Confirm State
    confirmState: {
        isOpen: boolean;
        title: string;
        message: string;
        action: (() => void) | null;
        isAlert?: boolean;
    };
    setConfirmState: (s: any) => void;

    // About State
    aboutOpen: boolean;
    setAboutOpen: (b: boolean) => void;
}

export const AppModals: React.FC<AppModalsProps> = (props) => {
    const { setViewOption } = useConfig();
    const [doNotAskAgain, setDoNotAskAgain] = React.useState(false);

    // Reset checkbox when modal opens
    React.useEffect(() => {
        if (props.confirmState.isOpen) {
            setDoNotAskAgain(false);
        }
    }, [props.confirmState.isOpen]);

    return (
        <>
            <BrowseModal
                isOpen={props.browseState.isOpen}
                onClose={() => props.setBrowseState({ ...props.browseState, isOpen: false })}
                onSelect={props.onBrowseSelect}
                initialPath={
                    (props.browseState.target === 'import-exclude-folders' && props.config?.ignoreFoldersPath) ? props.config.ignoreFoldersPath :
                        (props.browseState.target === 'import-exclude-files' && props.config?.ignoreFilesPath) ? props.config.ignoreFilesPath :
                            (props.browseState.target === 'right') ? props.rightPath : props.leftPath
                }
                title={
                    props.browseState.target === 'import-exclude-folders' ? 'Select Exclude Folder List' :
                        props.browseState.target === 'import-exclude-files' ? 'Select Exclude File List' :
                            `Browse ${props.browseState.target === 'left' ? 'Left' : 'Right'} Folder`
                }
                mode={props.browseState.mode}
                restrictTo={
                    (props.browseState.target === 'import-exclude-folders' && props.config?.ignoreFoldersPath) ? props.config.ignoreFoldersPath :
                        (props.browseState.target === 'import-exclude-files' && props.config?.ignoreFilesPath) ? props.config.ignoreFilesPath :
                            undefined
                }
                submitLabel={props.browseState.target?.includes('import') ? 'Import' : undefined}
            />

            <HistoryModal
                isOpen={props.historyState.isOpen}
                onClose={() => props.setHistoryState({ ...props.historyState, isOpen: false, side: null })}
                onSelect={props.onHistorySelect}
                side={props.historyState.side}
            />

            <ConfirmModal
                isOpen={props.confirmState.isOpen}
                title={props.confirmState.title}
                message={props.confirmState.message}
                onConfirm={() => {
                    if (props.confirmState.action) props.confirmState.action();

                    // Handle Do Not Ask Again Logic
                    if (doNotAskAgain && !props.confirmState.isAlert) {
                        if (props.confirmState.title.includes('Merge')) {
                            setViewOption('confirmMerge', false);
                        } else if (props.confirmState.title.includes('Delete')) {
                            setViewOption('confirmDelete', false);
                        }
                    }

                    props.setConfirmState((prev: any) => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => props.setConfirmState((prev: any) => ({ ...prev, isOpen: false }))}
                isAlert={props.confirmState.isAlert}
                showDoNotAskAgain={!props.confirmState.isAlert && (props.confirmState.title.includes('Merge') || props.confirmState.title.includes('Delete'))}
                doNotAskAgainChecked={doNotAskAgain}
                onDoNotAskAgainChange={setDoNotAskAgain}
            />

            {props.aboutOpen && (
                <div className="modal-overlay" onClick={() => props.setAboutOpen(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>About</h3>
                            <button className="icon-btn" onClick={() => props.setAboutOpen(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ marginBottom: '15px' }}><JLogo size={64} style={{ display: 'inline-block' }} /></div>
                            <h2 style={{ marginBottom: '10px' }}>J-Folder Merge</h2>
                            <p style={{ color: '#888', marginBottom: '20px' }}>Oscar Series</p>
                            <p>By: Juitem JoonWoo Kim</p>
                            <p><a href="mailto:juitem@gmail.com" style={{ color: '#646cff' }}>juitem@gmail.com</a></p>
                            <p style={{ marginTop: '10px' }}><a href="https://github.com/juitem/JFolderMerge" target="_blank" style={{ color: '#646cff' }}>https://github.com/juitem/JFolderMerge</a></p>
                        </div>
                        <div className="modal-footer">
                            <button className="primary-btn" onClick={() => props.setAboutOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
