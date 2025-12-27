import { state } from './state.js';
import * as api from './api.js?v=2';

// DOM Elements (We will grab them fresh or cache them if they are static)
const diffPanel = document.getElementById('diff-panel');
const diffContent = document.getElementById('diff-content');
const diffSplit = document.getElementById('diff-split');
const diffLeft = document.getElementById('diff-left');
const diffRight = document.getElementById('diff-right');
const diffFilename = document.getElementById('diff-filename');

// View Buttons (will be updated by main.js, but we export update functions)
const viewUnifiedBtn = document.getElementById('view-unified-btn'); // Will be replaced/updated
const viewSplitBtn = document.getElementById('view-split-btn'); // Will be replaced/updated

export async function showDiff(leftPath, rightPath, itemPath) {
    if (!leftPath || !rightPath) return;

    let fullLeft = leftPath;
    let fullRight = rightPath;

    if (itemPath) {
        fullLeft = leftPath + (leftPath.endsWith('/') ? '' : '/') + itemPath;
        fullRight = rightPath + (rightPath.endsWith('/') ? '' : '/') + itemPath;
    }

    state.currentLeftPathGlobal = fullLeft;
    state.currentRightPathGlobal = fullRight;
    state.currentDiffPaths = { leftRoot: leftPath, rightRoot: rightPath, relPath: itemPath };

    diffFilename.textContent = itemPath || "Custom Comparison";
    diffPanel.classList.remove('hidden');

    // Show Loading
    if (state.currentDiffMode === 'unified') {
        diffContent.innerHTML = 'Loading...';
        diffContent.classList.remove('hidden');
        diffSplit.classList.add('hidden');
    } else if (state.currentDiffMode === 'side-by-side') {
        diffLeft.innerHTML = 'Loading...';
        diffRight.innerHTML = 'Loading...';
        diffContent.classList.add('hidden');
        diffSplit.classList.remove('hidden');
    } else if (state.currentDiffMode === 'both') {
        diffContent.innerHTML = 'Loading...';
        diffLeft.innerHTML = '';
        diffRight.innerHTML = '';
        diffContent.classList.remove('hidden');
        diffSplit.classList.remove('hidden');
    }

    // 1. Fetch File Contents for Merging
    try {
        const [lData, rData] = await Promise.all([
            api.fetchFileContent(fullLeft),
            api.fetchFileContent(fullRight)
        ]);

        state.currentLeftLines = lData ? lData.content.split(/\r?\n/) : [];
        state.currentRightLines = rData ? rData.content.split(/\r?\n/) : [];
    } catch (e) {
        console.error("Failed to load content lines", e);
    }

    // 2. Fetch & Render Diff
    await refreshDiffView();
}

export async function refreshDiffView() {
    const { leftRoot, rightRoot, relPath } = state.currentDiffPaths;
    const fullLeft = state.currentLeftPathGlobal;
    const fullRight = state.currentRightPathGlobal;
    const mode = state.currentDiffMode;

    try {
        // For 'both', we need 'side-by-side' data (rows) AND 'unified' data (lines).
        // Since backend API takes one mode, we might need 2 calls if we want 'both' correctly.
        // OR we just assume 'side-by-side' is the primary and we don't show unified in 'both' yet?
        // User asked for "unified, side-by-side, unified and side-by-side".
        // So we need both.

        let unifiedData = null;
        let splitData = null;

        const promises = [];

        if (mode === 'unified' || mode === 'both') {
            promises.push(api.fetchDiff(fullLeft, fullRight, 'unified').then(d => unifiedData = d));
        }

        if (mode === 'side-by-side' || mode === 'both') {
            promises.push(api.fetchDiff(fullLeft, fullRight, 'side-by-side').then(d => splitData = d));
        }

        await Promise.all(promises);

        // Render
        if (mode === 'unified' || mode === 'both') {
            diffContent.classList.remove('hidden');
            renderDiffLines(unifiedData.diff);
        } else {
            diffContent.classList.add('hidden');
        }

        if (mode === 'side-by-side' || mode === 'both') {
            diffSplit.classList.remove('hidden');
            renderSplitDiff(splitData.left_rows, splitData.right_rows);
        } else {
            diffSplit.classList.add('hidden');
        }

        // Apply Filters immediately after render
        applyFilters();

    } catch (e) {
        diffContent.textContent = "Error: " + e.message;
        diffLeft.textContent = "Error";
        diffRight.textContent = "Error";
    }
}

function renderDiffLines(lines) {
    diffContent.innerHTML = '';
    if (!lines || lines.length === 0) {
        diffContent.textContent = "Files are identical.";
        return;
    }

    lines.forEach(line => {
        const div = document.createElement('div');
        div.className = 'diff-line';
        div.textContent = line;

        if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
            div.className += ' header';
        } else if (line.startsWith('+')) {
            div.className += ' added';
        } else if (line.startsWith('-')) {
            div.className += ' removed';
        }
        diffContent.appendChild(div);
    });
}

function renderSplitDiff(leftRows, rightRows) {
    if (!leftRows || !rightRows) return;

    diffLeft.innerHTML = '';
    diffRight.innerHTML = '';

    for (let i = 0; i < leftRows.length; i++) {
        const rowL = leftRows[i];
        const rowR = rightRows[i];

        const divL = createDiffRow(rowL, 'left', i, rowR, rightRows);
        const divR = createDiffRow(rowR, 'right', i, rowL, leftRows);

        diffLeft.appendChild(divL);
        diffRight.appendChild(divR);
    }
}

function createDiffRow(row, side, index, otherRow, targetRowsArray) {
    const div = document.createElement('div');
    div.className = `diff-line ${row.type}`;

    const contentSpan = document.createElement('span');
    contentSpan.className = 'diff-text';

    if (Array.isArray(row.text)) {
        row.text.forEach(seg => {
            const span = document.createElement('span');
            span.textContent = seg.text;
            if (seg.type !== 'same') {
                span.className = `diff-span-${seg.type}`;
            }
            contentSpan.appendChild(span);
        });
    } else {
        contentSpan.textContent = row.text || " ";
    }
    div.appendChild(contentSpan);

    // Merge Actions
    // Allow merge on Modified, Added, Removed.
    // AND allow merge on 'empty' (Spacer) if the other side has content (Added/Removed pairs).
    // Pushing 'empty' to 'content' means DELETING the content line.

    // Check if we should show button:
    // 1. Classic active types: modified, added, removed.
    // 2. Empty type, BUT only if otherRow has a valid line to overwrite/delete.

    let canMerge = false;
    if (row.type === 'modified' || row.type === 'added' || row.type === 'removed') {
        canMerge = true;
    } else if (row.type === 'empty' && otherRow && otherRow.line) {
        canMerge = true;
    }

    if (canMerge) {
        const btn = document.createElement('button');
        btn.className = 'merge-btn';
        btn.textContent = side === 'left' ? '→' : '←';

        if (row.type === 'empty') {
            btn.title = side === 'left' ? 'Delete Right Line' : 'Delete Left Line';
            btn.classList.add('delete-action'); // Optional: Style it differently?
        } else {
            btn.title = side === 'left' ? 'Copy to Right' : 'Copy to Left';
        }

        btn.onclick = (e) => {
            e.stopPropagation();
            mergeLine(side, index, row, otherRow, targetRowsArray);
        };
        div.prepend(btn);
    }
    return div;
}

async function mergeLine(sourceSide, viewIndex, sourceRow, targetRow, targetRowsArray) {
    const targetPath = sourceSide === 'left' ? state.currentRightPathGlobal : state.currentLeftPathGlobal;
    let targetLines = sourceSide === 'left' ? state.currentRightLines : state.currentLeftLines;

    let sourceText = "";
    if (Array.isArray(sourceRow.text)) {
        sourceText = sourceRow.text.map(s => s.text).join('');
    } else {
        sourceText = sourceRow.text || "";
    }

    if (!targetRow.line) { // Spacer / Empty -> Insert
        // Source has content, Target is empty. Insert Source into Target.
        // Find split position.
        let insertIndex = 0;
        // Search backwards for a line number
        let found = false;
        for (let i = viewIndex - 1; i >= 0; i--) {
            if (targetRowsArray[i].line) {
                insertIndex = targetRowsArray[i].line; // Insert AFTER this line
                found = true;
                break;
            }
        }
        // If found, insertIndex is the line number (1-based). So array index is insertIndex.
        // If not found (top of file), insertIndex is 0.

        targetLines.splice(insertIndex, 0, sourceText);

    } else { // Replace or Delete
        const arrayIndex = targetRow.line - 1;

        if (sourceRow.type === 'empty') {
            // Source is empty -> Delete Target Line
            targetLines.splice(arrayIndex, 1);
        } else {
            // Source has content -> Replace Target Line
            targetLines[arrayIndex] = sourceText;
        }
    }

    await api.saveFile(targetPath, targetLines.join('\n'));
    await refreshDiffView(); // Re-fetch and render
}

// Filtering logic for Diff View
export function applyFilters() {
    // Unified View
    const unifiedLines = diffContent.querySelectorAll('.diff-line');
    unifiedLines.forEach(line => {
        let type = 'same';
        if (line.classList.contains('added')) type = 'added';
        else if (line.classList.contains('removed')) type = 'removed';
        else if (line.classList.contains('header')) type = 'same';

        const shouldShow = state.diffFilters[type] !== false;
        if (shouldShow) line.classList.remove('hidden-by-filter');
        else line.classList.add('hidden-by-filter');
    });

    // Side-by-Side View
    const leftChildren = diffLeft.children;
    const rightChildren = diffRight.children;

    for (let i = 0; i < leftChildren.length; i++) {
        const lDiv = leftChildren[i];
        const rDiv = rightChildren[i];
        if (!lDiv || !rDiv) continue;

        // Determine type based on dominant change
        let type = 'same';
        if (lDiv.classList.contains('modified')) type = 'modified';
        else if (lDiv.classList.contains('removed')) type = 'removed';
        else if (rDiv.classList.contains('added')) type = 'added';

        const shouldShow = state.diffFilters[type] !== false;

        if (shouldShow) {
            lDiv.classList.remove('hidden-by-filter');
            rDiv.classList.remove('hidden-by-filter');
        } else {
            lDiv.classList.add('hidden-by-filter');
            rDiv.classList.add('hidden-by-filter');
        }
    }
}

export function closeDiffView() {
    const diffPanel = document.getElementById('diff-panel');
    const treeContainer = document.querySelector('.tree-container');

    // If in full screen (expanded), exit full screen mode first to restore tree view
    if (diffPanel.classList.contains('expanded')) {
        toggleFullScreen();
    }

    // Hide the diff panel
    diffPanel.classList.add('hidden');
}

export function toggleFullScreen() {
    // This expects Document structure to support .tree-container.collapsed
    const treeContainer = document.querySelector('.tree-container');
    const isCollapsed = treeContainer.classList.toggle('collapsed');
    document.getElementById('diff-panel').classList.toggle('expanded');

    const expandBtn = document.getElementById('expand-diff');
    if (expandBtn) {
        // Expand icon: ⤢ (Open), ⤡ (Close)
        // SVGs:
        const expandIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
        const compressIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;

        expandBtn.innerHTML = isCollapsed ? compressIcon : expandIcon;
        expandBtn.title = isCollapsed ? 'Exit Full Screen (ESC)' : 'Toggle Full Screen (ESC)';
    }
}
