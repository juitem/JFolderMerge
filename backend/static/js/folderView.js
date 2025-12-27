import { state } from './state.js';
import * as api from './api.js';
import { showDiff, refreshDiffView } from './diffView.js';

const treeLeft = document.getElementById('tree-left');
const treeRight = document.getElementById('tree-right');
const folderList = document.getElementById('folder-list'); // For browse modal
const modalPathInput = document.getElementById('modal-path-input');

// Filtering
export function applyFilters() {
    const filterTree = (container) => {
        if (!container) return false;
        let hasVisible = false;
        const items = Array.from(container.children).filter(c => c.classList.contains('tree-item'));

        items.forEach(item => {
            const childrenContainer = item.querySelector('.tree-children');
            let childVisible = false;
            if (childrenContainer) {
                childVisible = filterTree(childrenContainer);
            }
            const status = item.dataset.status || 'same'; // e.g. 'same'
            // state.folderFilters keys match status strings 'added', 'removed', 'modified', 'same'
            const isFilterActive = state.folderFilters[status] !== false;

            // Show if self matches filter OR if has visible children
            // This ensures that a folder (status='same') remains visible if it contains modified children
            if (isFilterActive || childVisible) {
                item.classList.remove('hidden-by-filter');
                hasVisible = true;
            } else {
                item.classList.add('hidden-by-filter');
            }
        });
        return hasVisible;
    };

    filterTree(document.getElementById('tree-left'));
    filterTree(document.getElementById('tree-right'));
}

export function renderTree(data) {
    treeLeft.innerHTML = '';
    treeRight.innerHTML = '';
    buildDualNode(data, treeLeft, treeRight);
    applyFilters(); // Apply initial filters
}

function buildDualNode(node, leftParent, rightParent) {
    const status = node.status;
    const leftContainer = document.createElement('div');
    leftContainer.className = 'tree-item';
    leftContainer.dataset.status = status;

    const rightContainer = document.createElement('div');
    rightContainer.className = 'tree-item';
    rightContainer.dataset.status = status;

    const leftRow = document.createElement('div');
    const rightRow = document.createElement('div');

    const createRowContent = (row, isRight) => {
        row.className = 'tree-row';
        if (node.type === 'directory') {
            const chevron = document.createElement('span');
            chevron.className = 'chevron expanded';
            // SVG Chevron (Chevron Right)
            chevron.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
            chevron.style.display = 'flex'; // Align SVG
            row.appendChild(chevron);
            return chevron;
        } else {
            const spacer = document.createElement('span');
            spacer.style.width = '16px';
            spacer.style.display = 'inline-flex'; // Align with SVG
            row.appendChild(spacer);
            row.addEventListener('click', () => {
                document.querySelectorAll('.tree-row').forEach(r => r.classList.remove('selected'));
                if (leftRow.classList.contains('tree-row')) leftRow.classList.add('selected');
                if (rightRow.classList.contains('tree-row')) rightRow.classList.add('selected');

                const leftRoot = document.getElementById('left-path').value;
                const rightRoot = document.getElementById('right-path').value;
                showDiff(leftRoot, rightRoot, node.path);
            });
            return null;
        }
    };

    const createSpacer = (row) => {
        row.className = 'tree-row spacer';
    };

    let leftChevron = null;
    let rightChevron = null;

    if (status === 'added') {
        createSpacer(leftRow);
        rightChevron = createRowContent(rightRow, true);
        appendNameAndStatus(rightRow, node, true);
        appendMergeActions(rightRow, node, true);
    } else if (status === 'removed') {
        leftChevron = createRowContent(leftRow, false);
        createSpacer(rightRow);
        appendNameAndStatus(leftRow, node, false);
        appendMergeActions(leftRow, node, false);
    } else {
        leftChevron = createRowContent(leftRow, false);
        rightChevron = createRowContent(rightRow, true);
        appendNameAndStatus(leftRow, node, false);
        appendNameAndStatus(rightRow, node, true);
        if (status === 'modified') {
            appendMergeActions(leftRow, node, false);
            appendMergeActions(rightRow, node, true);
        }
    }

    leftContainer.appendChild(leftRow);
    rightContainer.appendChild(rightRow);
    leftParent.appendChild(leftContainer);
    rightParent.appendChild(rightContainer);

    if (node.type === 'directory') {
        const leftChildren = document.createElement('div');
        leftChildren.className = 'tree-children visible';
        leftContainer.appendChild(leftChildren);

        const rightChildren = document.createElement('div');
        rightChildren.className = 'tree-children visible';
        rightContainer.appendChild(rightChildren);

        const toggle = (e) => {
            e.stopPropagation();
            const isVisible = leftChildren.classList.contains('visible');
            if (isVisible) {
                leftChildren.classList.remove('visible');
                rightChildren.classList.remove('visible');
                if (leftChevron) leftChevron.classList.remove('expanded');
                if (rightChevron) rightChevron.classList.remove('expanded');
            } else {
                leftChildren.classList.add('visible');
                rightChildren.classList.add('visible');
                if (leftChevron) leftChevron.classList.add('expanded');
                if (rightChevron) rightChevron.classList.add('expanded');
            }
        };

        if (status !== 'added') leftRow.addEventListener('click', toggle);
        if (status !== 'removed') rightRow.addEventListener('click', toggle);

        if (node.children) {
            node.children.forEach(child => buildDualNode(child, leftChildren, rightChildren));
        }
    }
}

function appendNameAndStatus(row, node, isRight) {
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    const displayName = isRight ? (node.right_name || node.name) : (node.left_name || node.name);
    nameSpan.textContent = displayName;
    row.appendChild(nameSpan);

    if (node.status !== 'same') {
        const statusSpan = document.createElement('span');
        statusSpan.className = `item-status ${node.status}`;
        statusSpan.textContent = node.status;
        row.appendChild(statusSpan);
    }
}

function appendMergeActions(row, node, isRightSide) {
    if (node.status === 'same') return;
    const actions = document.createElement('div');
    actions.className = 'merge-actions';

    const leftInput = document.getElementById('left-path');
    const rightInput = document.getElementById('right-path');
    const fullLeft = leftInput.value + '/' + node.path;
    const fullRight = rightInput.value + '/' + node.path;

    if (node.status === 'removed') {
        const btn = document.createElement('button');
        btn.className = 'merge-btn';
        btn.innerHTML = 'Copy <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
        btn.onclick = (e) => { e.stopPropagation(); api.copyItem(fullLeft, fullRight, node.type === 'directory').then(() => { document.getElementById('compare-btn').click(); refreshDiffView(); }); };
        actions.appendChild(btn);
    } else if (node.status === 'added') {
        const btn = document.createElement('button');
        btn.className = 'merge-btn';
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Copy';
        btn.onclick = (e) => { e.stopPropagation(); api.copyItem(fullRight, fullLeft, node.type === 'directory').then(() => { document.getElementById('compare-btn').click(); refreshDiffView(); }); };
        actions.appendChild(btn);
    } else if (node.status === 'modified') {
        const btn = document.createElement('button');
        btn.className = 'merge-btn';
        // Left Arrow for Right Side (Copy to Left), Right Arrow for Left Side (Copy to Right)
        const leftArrow = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;
        const rightArrow = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;

        btn.innerHTML = isRightSide ? leftArrow : rightArrow;
        btn.title = isRightSide ? "Overwrite Left" : "Overwrite Right";
        btn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Overwrite ${isRightSide ? 'Left' : 'Right'}?`)) {
                if (isRightSide) api.copyItem(fullRight, fullLeft, node.type === 'directory').then(() => { document.getElementById('compare-btn').click(); refreshDiffView(); });
                else api.copyItem(fullLeft, fullRight, node.type === 'directory').then(() => { document.getElementById('compare-btn').click(); refreshDiffView(); });
            }
        };
        actions.appendChild(btn);
    }
    row.appendChild(actions);
}

// Browse List Rendering
export function renderBrowseList(data, callbackSelect, callbackOpen) {
    if (!folderList) return;
    folderList.innerHTML = '';

    // We assume backend returns { current, parent, dirs }
    // Update inputs handled by caller of this render usually? 
    // Or we handle input updates here?
    // Let's keep this simple: Render list options.

    data.dirs.forEach(dir => {
        const div = document.createElement('div');
        div.className = 'folder-item';
        div.innerHTML = '<span class="file-icon" style="display:inline-flex; vertical-align:middle; margin-right:4px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span> ' + dir;
        div.addEventListener('click', () => {
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('selected'));
            div.classList.add('selected');
            callbackSelect(dir);
        });
        div.addEventListener('dblclick', () => {
            callbackOpen(dir);
        });
        folderList.appendChild(div);
    });
}
