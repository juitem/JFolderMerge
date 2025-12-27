import { state } from './state.js';
import * as api from './api.js';
import * as folderView from './folderView.js?v=6';
import * as diffView from './diffView.js';
import { initBrowseModal } from './browseModal.js';

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
(async () => {
    initBrowseModal();
    const config = await api.fetchConfig();
    if (config) {
        if (config.left) leftInput.value = config.left;
        if (config.right) rightInput.value = config.right;
    }
})();

// Compare Button
compareBtn.addEventListener('click', async () => {
    const leftPath = leftInput.value;
    const rightPath = rightInput.value;
    const excludeFolders = document.getElementById('exclude-folders').value
        .split(',').map(s => s.trim()).filter(s => s);
    const excludeFiles = document.getElementById('exclude-files').value
        .split(',').map(s => s.trim()).filter(s => s);

    if (!leftPath || !rightPath) {
        alert("Please enter both paths.");
        return;
    }

    compareBtn.textContent = 'Comparing...';
    compareBtn.disabled = true;

    try {
        const data = await api.compareFolders(leftPath, rightPath, excludeFiles, excludeFolders);
        folderView.renderTree(data);
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        compareBtn.textContent = 'Compare';
        compareBtn.disabled = false;
    }
});
// Filters
const folderFilterChecks = {
    added: document.getElementById('folder-show-added'),
    removed: document.getElementById('folder-show-removed'),
    modified: document.getElementById('folder-show-modified'),
    same: document.getElementById('folder-show-same')
};

Object.keys(folderFilterChecks).forEach(key => {
    folderFilterChecks[key].addEventListener('change', (e) => {
        state.folderFilters[key] = e.target.checked;
        folderView.applyFilters();
    });
});

const diffFilterChecks = {
    added: document.getElementById('diff-show-added'),
    removed: document.getElementById('diff-show-removed'),
    modified: document.getElementById('diff-show-modified'),
    same: document.getElementById('diff-show-same')
};

Object.keys(diffFilterChecks).forEach(key => {
    diffFilterChecks[key].addEventListener('change', (e) => {
        state.diffFilters[key] = e.target.checked;
        diffView.applyFilters();
    });
});

// View Toggles
function updateViewMode(mode) {
    if (state.currentDiffMode === mode) return;
    state.currentDiffMode = mode;

    // Update Active State
    if (viewUnifiedBtn) viewUnifiedBtn.classList.toggle('active', mode === 'unified');
    if (viewSplitBtn) viewSplitBtn.classList.toggle('active', mode === 'side-by-side');
    if (viewBothBtn) viewBothBtn.classList.toggle('active', mode === 'both');

    // Refresh Diff if active
    if (state.currentDiffPaths.leftRoot) {
        diffView.refreshDiffView();
    }
}

if (viewUnifiedBtn) viewUnifiedBtn.addEventListener('click', () => updateViewMode('unified'));
if (viewSplitBtn) viewSplitBtn.addEventListener('click', () => updateViewMode('side-by-side'));
if (viewBothBtn) viewBothBtn.addEventListener('click', () => updateViewMode('both'));


// Window Controls
if (expandDiffBtn) {
    expandDiffBtn.addEventListener('click', diffView.toggleFullScreen);
}

if (closeDiffBtn) {
    closeDiffBtn.addEventListener('click', () => {
        diffView.closeDiffView();
    });
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const treeContainer = document.querySelector('.tree-container');
        if (treeContainer && treeContainer.classList.contains('collapsed')) {
            diffView.toggleFullScreen();
        }
    }
});

// About Modal
const aboutModal = document.getElementById('about-modal');
const aboutBtn = document.getElementById('about-btn');
const closeAboutBtn = document.querySelector('.close-modal-about');

if (aboutBtn && aboutModal) {
    aboutBtn.addEventListener('click', () => {
        aboutModal.classList.remove('hidden');
    });

    if (closeAboutBtn) {
        closeAboutBtn.addEventListener('click', () => {
            aboutModal.classList.add('hidden');
        });
    }

    // Close on click outside
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            aboutModal.classList.add('hidden');
        }
    });
}
