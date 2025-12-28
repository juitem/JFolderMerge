import { state } from './state.js';
import * as api from './api.js?v=29';
import * as folderView from './folderView.js?v=7';
import { viewerManager } from './viewers/ViewerManager.js';
import { DiffViewer } from './viewers/DiffViewer.js';
import { ImageViewer } from './viewers/ImageViewer.js';
import { EventBus, EVENTS } from './events.js';

// Register Viewers
viewerManager.register(new DiffViewer()); // Fallback / Default
viewerManager.register(new ImageViewer()); // High priority for images

import { openBrowseModal } from './browseModal.js?v=7';
import { Modal } from './modal.js?v=1';
import { Toast } from './toast.js?v=1';

// Elements
const leftInput = document.getElementById('left-path');
const rightInput = document.getElementById('right-path');
const compareBtn = document.getElementById('compare-btn');

// View Toggles
const viewUnifiedBtn = document.getElementById('view-unified-btn');
const viewSplitBtn = document.getElementById('view-split-btn');
const viewBothBtn = document.getElementById('view-both-btn');

// Window Controls
const expandDiffBtn = document.getElementById('expand-diff');
const closeDiffBtn = document.getElementById('close-diff');

// Initialization
let appConfig = {};

(async () => {
    try {
        // initBrowseModal(); // No longer needed/used

        const config = await api.fetchConfig();
        appConfig = config || {};

        if (config) {
            if (config.left) leftInput.value = config.left;
            if (config.right) rightInput.value = config.right;
        }

        // Attach Browse Button Listeners
        document.querySelectorAll('.browse-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const target = document.getElementById(targetId);
                const mode = btn.dataset.type || 'directory';
                const initialPath = target ? target.value : '';

                let title = 'Select Folder';
                // Use config paths for checking? Or just ID check is fine.
                if (targetId === 'exclude-folders') title = 'Select Exclude Folder List';
                if (targetId === 'exclude-files') title = 'Select Exclude File List';

                // Determine start path if empty?
                // For now, let openBrowseModal handle empty initialPath (defaults to home or root)
                // But for exclude lists, we might want to start in the settings folder if empty.
                let startPath = initialPath;
                if (!startPath) {
                    if (targetId === 'exclude-folders') startPath = appConfig.ignoreFoldersPath || 'IgnoreFolders';
                    if (targetId === 'exclude-files') startPath = appConfig.ignoreFilesPath || 'IgnoreFiles';
                }

                openBrowseModal(startPath, {
                    target: target,
                    mode: mode,
                    title: title
                });
            });
        });

        // Auto-load default ignores
        const ignoreFoldersPath = appConfig.ignoreFoldersPath || 'IgnoreFolders';
        const ignoreFilesPath = appConfig.ignoreFilesPath || 'IgnoreFiles';
        const defaultFolder = appConfig.defaultIgnoreFolderFile || 'default';
        const defaultFile = appConfig.defaultIgnoreFileFile || 'default';

        await loadIgnoreConfig(`${ignoreFoldersPath}/${defaultFolder}`, 'exclude-folders');
        await loadIgnoreConfig(`${ignoreFilesPath}/${defaultFile}`, 'exclude-files');

        // Init Events
        folderView.initFolderViewEvents();

        // Wire Viewer Manager
        EventBus.on(EVENTS.FILE_SELECTED, async (data) => {
            const panel = document.getElementById('diff-panel');
            const container = document.getElementById('diff-view-container');
            const viewer = viewerManager.getViewerForFile(data.relPath);

            if (viewer) {
                panel.classList.remove('hidden');

                // Update Header
                const titleEl = document.getElementById('diff-filename');
                if (titleEl) titleEl.textContent = data.relPath;

                applyAutoExpandState();

                await viewer.render(container, data.leftPath, data.rightPath, data.relPath);
            } else {
                Toast.warning("No viewer available for this file type.");
            }
        });

    } catch (e) {
        console.error("Main Init Error", e);
        Toast.error("Initialization Error: " + e.message);
    }
})();

async function loadIgnoreConfig(path, inputId) {
    const data = await api.fetchFileContent(path);
    if (!data || !data.content) return;

    const lines = data.content.split(/\r?\n/);
    const patterns = lines
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));

    const el = document.getElementById(inputId);
    if (el) el.value = patterns.join(', ');
}

// Import Buttons
const importFolderBtn = document.getElementById('import-ignore-folder-btn');
const importFileBtn = document.getElementById('import-ignore-file-btn');

if (importFolderBtn) {
    importFolderBtn.addEventListener('click', async () => {
        try {
            const root = appConfig.ignoreFoldersPath || 'IgnoreFolders';
            const data = await api.listDirs(root + '/'); // Ensure trailing slash if needed used by api? api handles it.
            openBrowseModal(data.current, {
                mode: 'file',
                restrictTo: root, // Use config path as restriction
                title: 'Select Exclude Folder List',
                submitLabel: 'Import',
                onSelect: (path) => loadIgnoreConfig(path, 'exclude-folders')
            });
        } catch (e) {
            console.error(e);
            Toast.error("Failed to open IgnoreFolders");
        }
    });
}
if (importFileBtn) {
    importFileBtn.addEventListener('click', async () => {
        try {
            const root = appConfig.ignoreFilesPath || 'IgnoreFiles';
            const data = await api.listDirs(root + '/');
            openBrowseModal(data.current, {
                mode: 'file',
                restrictTo: root,
                title: 'Select Exclude File List',
                submitLabel: 'Import',
                onSelect: (path) => loadIgnoreConfig(path, 'exclude-files')
            });
        } catch (e) {
            console.error(e);
            Toast.error("Failed to open IgnoreFiles");
        }
    });
}

// Helper to run comparison
async function runComparison() {
    const leftPath = document.getElementById('left-path');
    const rightPath = document.getElementById('right-path');

    if (!leftPath.value || !rightPath.value) {
        Toast.error("Please enter both paths");
        return;
    }

    compareBtn.textContent = 'Comparing...';
    compareBtn.disabled = true;

    try {
        const excludeFiles = document.getElementById('exclude-files').value.split(',').map(s => s.trim()).filter(s => s);
        const excludeFolders = document.getElementById('exclude-folders').value.split(',').map(s => s.trim()).filter(s => s);

        document.getElementById('loading-overlay').classList.remove('hidden');

        const data = await api.compareFolders(leftPath.value, rightPath.value, excludeFiles, excludeFolders);
        folderView.renderTree(data);

        Toast.success("Comparison completed");

        // Save History
        await api.saveHistory(leftPath.value, rightPath.value);

    } catch (e) {
        console.error(e);
        Toast.error("Comparison failed: " + e.message);
    } finally {
        document.getElementById('loading-overlay').classList.add('hidden');
        compareBtn.textContent = 'Compare';
        compareBtn.disabled = false;
    }
}

// Compare Button
if (compareBtn) {
    compareBtn.addEventListener('click', runComparison);
}

// Event Bus Listeners
EventBus.on(EVENTS.REFRESH_TREE, () => {
    runComparison();
});

// History Logic
const historyLeftBtn = document.getElementById('history-left-btn');
const historyRightBtn = document.getElementById('history-right-btn');

async function showHistoryModal(side) {
    const history = await api.getHistory();
    if (!history || history.length === 0) {
        Toast.info("No recent history.");
        return;
    }

    // Filter unique paths for the requested side
    const paths = new Set();
    history.forEach(h => {
        if (side === 'left' && h.left_path) paths.add(h.left_path);
        if (side === 'right' && h.right_path) paths.add(h.right_path);
    });

    const uniquePaths = Array.from(paths);

    if (uniquePaths.length === 0) {
        Toast.info("No recent paths for this side.");
        return;
    }

    const listHtml = uniquePaths.map((path, index) => `
        <div class="history-item" data-path="${path}" style="padding: 8px; border-bottom: 1px solid var(--border-color); cursor: pointer;">
            <div style="font-weight: 500; font-size: 0.9em; word-break: break-all;">${path}</div>
        </div>
    `).join('');

    const modal = new Modal({
        title: `Recent ${side === 'left' ? 'Left' : 'Right'} Folders`,
        content: `<div style="max-height: 400px; overflow-y: auto;">${listHtml}</div>`,
        buttons: [{ text: 'Close', onClick: (e, m) => m.close() }]
    });

    modal.open();

    modal.content.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.dataset.path;
            if (side === 'left') leftInput.value = path;
            else rightInput.value = path;
            modal.close();
        });
        item.addEventListener('mouseenter', () => item.style.backgroundColor = 'var(--hover-bg)');
        item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
    });
}

if (historyLeftBtn) historyLeftBtn.addEventListener('click', () => showHistoryModal('left'));
if (historyRightBtn) historyRightBtn.addEventListener('click', () => showHistoryModal('right'));


// Filters & Toggles (Existing code remains similar, mostly binding)
const folderFilterChecks = {
    added: document.getElementById('folder-show-added'),
    removed: document.getElementById('folder-show-removed'),
    modified: document.getElementById('folder-show-modified'),
    same: document.getElementById('folder-show-same')
};

// Helper to refresh view (applies filters via re-render)
function refreshActiveView() {
    if (state.currentDiffPaths.relPath) {
        EventBus.emit(EVENTS.FILE_SELECTED, {
            leftPath: state.currentDiffPaths.leftRoot,
            rightPath: state.currentDiffPaths.rightRoot,
            relPath: state.currentDiffPaths.relPath
        });
    }
}

Object.keys(folderFilterChecks).forEach(key => {
    if (folderFilterChecks[key]) {
        folderFilterChecks[key].addEventListener('change', (e) => {
            state.folderFilters[key] = e.target.checked;
            folderView.applyFilters();
        });
    }
});

const diffFilterChecks = {
    added: document.getElementById('diff-show-added'),
    removed: document.getElementById('diff-show-removed'),
    modified: document.getElementById('diff-show-modified'),
    same: document.getElementById('diff-show-same')
};

Object.keys(diffFilterChecks).forEach(key => {
    if (diffFilterChecks[key]) {
        diffFilterChecks[key].addEventListener('change', (e) => {
            state.diffFilters[key] = e.target.checked;
            refreshActiveView();
        });
    }
});

// Search
const searchInput = document.getElementById('file-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        folderView.applyFilters();
    });
}

// View Toggles
function updateViewMode(mode) {
    if (state.currentDiffMode === mode) return;
    state.currentDiffMode = mode;

    if (viewUnifiedBtn) viewUnifiedBtn.classList.toggle('active', mode === 'unified');
    if (viewSplitBtn) viewSplitBtn.classList.toggle('active', mode === 'side-by-side');
    if (viewBothBtn) viewBothBtn.classList.toggle('active', mode === 'both');

    console.log("Updating View Mode:", mode, "Current Path:", state.currentDiffPaths.relPath);

    if (state.currentDiffPaths.relPath) {
        // Re-trigger viewer render for current file
        EventBus.emit(EVENTS.FILE_SELECTED, {
            leftPath: state.currentDiffPaths.leftRoot,
            rightPath: state.currentDiffPaths.rightRoot,
            relPath: state.currentDiffPaths.relPath
        });
    } else {
        console.warn("No current file to refresh view for.");
    }
}

if (viewUnifiedBtn) viewUnifiedBtn.addEventListener('click', () => updateViewMode('unified'));
if (viewSplitBtn) viewSplitBtn.addEventListener('click', () => updateViewMode('side-by-side'));
if (viewBothBtn) viewBothBtn.addEventListener('click', () => updateViewMode('both'));

// Diff Window Controls
// Diff Window Controls
const diffPanel = document.getElementById('diff-panel');
const treeContainer = document.querySelector('.tree-container');

function applyAutoExpandState() {
    // Apply the current state to the DOM
    if (state.viewOpts.autoExpand) {
        if (diffPanel) diffPanel.classList.add('expanded');
        if (treeContainer) treeContainer.classList.add('collapsed');
    } else {
        if (diffPanel) diffPanel.classList.remove('expanded');
        if (treeContainer) treeContainer.classList.remove('collapsed');
    }
    updateOptUI();
}

function toggleFullScreen() {
    state.viewOpts.autoExpand = !state.viewOpts.autoExpand;
    applyAutoExpandState();
}

function closeDiffView() {
    if (diffPanel) diffPanel.classList.add('hidden');
    // Ensure Tree is visible when Panel is closed, regardless of AutoExpand preference
    if (treeContainer) treeContainer.classList.remove('collapsed');
    // NOTE: We do NOT change state.viewOpts.autoExpand. 
    // It remains as a preference for the next File Open.
}

if (expandDiffBtn) expandDiffBtn.addEventListener('click', toggleFullScreen);
if (closeDiffBtn) closeDiffBtn.addEventListener('click', closeDiffView);

// Advanced Options
const optDefault = document.getElementById('opt-default');
const optAutoExpand = document.getElementById('opt-auto-expand');
const optExternalTool = document.getElementById('opt-external-tool');

function updateOptUI() {
    if (optDefault) optDefault.classList.toggle('active', !state.viewOpts.autoExpand && !state.viewOpts.useExternal);
    if (optAutoExpand) optAutoExpand.classList.toggle('active', state.viewOpts.autoExpand);
    if (optExternalTool) optExternalTool.classList.toggle('active', state.viewOpts.useExternal);
}

if (optDefault) {
    optDefault.addEventListener('click', () => {
        state.viewOpts.autoExpand = false;
        state.viewOpts.useExternal = false;
        applyAutoExpandState(); // Update DOM
        updateOptUI();
        Toast.info("View: Default");
    });
}
if (optAutoExpand) {
    optAutoExpand.addEventListener('click', () => {
        // Toggle Auto Expand vs Default
        // If External is on, turn it off? Or allow mixed? 
        // User implied "3 icons", likely mutually exclusive or at least distinct modes.
        // Let's make them mutually exclusive for simplicity: Default | Auto-Expand | External
        const startState = state.viewOpts.autoExpand;
        state.viewOpts.autoExpand = !startState;
        if (state.viewOpts.autoExpand) state.viewOpts.useExternal = false;

        applyAutoExpandState(); // Update DOM immediately
        Toast.info(`View: ${state.viewOpts.autoExpand ? 'Auto-Expand' : 'Default'}`);
    });
}
if (optExternalTool) {
    optExternalTool.addEventListener('click', () => {
        const startState = state.viewOpts.useExternal;
        state.viewOpts.useExternal = !startState;
        if (state.viewOpts.useExternal) state.viewOpts.autoExpand = false;

        applyAutoExpandState(); // Update DOM (will collapse if expanded)
        updateOptUI(); // This is called inside applyAutoExpandState too? No, separated now.
        // Wait, applyAutoExpandState calls updateOptUI inside it?
        // Let's check applyAutoExpandState definition.
        // It calls updateOptUI(). So calling it twice is redundant but harmless.
        // Step 2733 definition calls updateOptUI().
        // So I can remove explicit updateOptUI() calls here if applyAutoExpandState handles it.
        // But let's keep it safe or remove it.
        // I'll keep it simple: applyAutoExpandState() updates UI.

        Toast.info(`View: ${state.viewOpts.useExternal ? 'External Tool' : 'Default'}`);
    });
}

document.addEventListener('keydown', (e) => {
    // Ignore input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    if (e.key === 'Escape') {
        const treeContainer = document.querySelector('.tree-container');
        if (treeContainer && treeContainer.classList.contains('collapsed')) {
            toggleFullScreen();
        }
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
        // Prevent default scrolling for arrows/space (handled in folderView)
        // Delegate to folderView
        folderView.handleKeyNavigation(e);
    }
});

// About Modal - Unified via Modal Class
const aboutBtn = document.getElementById('about-btn');
if (aboutBtn) {
    aboutBtn.addEventListener('click', () => {
        new Modal({
            title: 'About',
            width: '400px',
            content: `
                <div style="text-align: center; color: var(--text-secondary); display:flex; flex-direction:column; gap:1rem; align-items:center; padding:1rem;">
                    <p style="font-size: 1.1rem; font-weight: 600; color:var(--text-primary);">J-Folder Merge</p>
                    <div>
                        <p>By: Juitem JoonWoo Kim</p>
                        <p>Mail: <a href="mailto:juitem@gmail.com" style="color: var(--primary-color);">juitem@gmail.com</a></p>
                        <p>Repo: <a href="https://github.com/juitem/JFolderMerge" target="_blank" style="color: var(--primary-color);">github.com/juitem/JFolderMerge</a></p>
                    </div>
                </div>
            `,
            buttons: [
                { text: 'Close', onClick: (e, m) => m.close() }
            ]
        }).open();
    });
}

