import { state } from './state.js';
import * as api from './api.js?v=2';
import { showDiff, refreshDiffView } from './diffView.js';

const treeLeft = document.getElementById('tree-left');
const treeRight = document.getElementById('tree-right');


// Filtering
// Filtering logic with Search support (Recursive)
export function applyFilters() {
    const searchQuery = state.searchQuery ? state.searchQuery.toLowerCase() : "";

    const filterTree = (container) => {
        if (!container) return false;
        let hasVisible = false;
        const items = Array.from(container.children).filter(c => c.classList.contains('tree-item'));

        items.forEach(item => {
            const childrenContainer = item.querySelector('.tree-children');
            let childVisible = false;

            // Recurse first
            if (childrenContainer) {
                childVisible = filterTree(childrenContainer);
            }

            // Check self matches
            const nameSpan = item.querySelector('.item-name');
            const name = nameSpan ? nameSpan.textContent.toLowerCase() : "";
            const matchesSearch = !searchQuery || name.includes(searchQuery);

            const status = item.dataset.status || 'same';
            const isStatusActive = state.folderFilters[status] !== false;

            // Visibility Logic:
            // If Search is Active: Show if (Name Matches OR Child Visible)
            // If Search is Inactive: Show if (Status Active OR Child Visible)

            // Visibility Logic:
            // Search acts as an additional filter (AND logic) on top of Status Filter.

            // 1. Does it match the Search Criteria? (Name match)
            // If no query, everything matches search.
            const matchesName = !searchQuery || name.includes(searchQuery);

            // 2. Does it match the Status Filter?
            // (Only applies to the item itself, not necessarily simply inheriting from children logic, 
            // though folders usually show if children are visible regardless of their own status)
            // But if it's a file (no children), both must be true.

            let isVisible = false;

            if (childrenContainer) { // Directory
                // Show if it has visible children (content match)
                // OR if the directory itself matches search AND status (name match on folder)
                // Usually for folder trees, we show the folder if any child is visible.
                // We also show the folder if the folder name *itself* matches search (and status is allowed),
                // even if no children match? 
                // Let's stick to: Show if ChildVisible OR (MatchesName AND StatusActive)
                isVisible = childVisible || (matchesName && isStatusActive && searchQuery !== "");
                // Note: if searchQuery is empty, matchesName is true. 
                // Then isVisible = childVisible || isStatusActive.
                // But if child is NOT visible (empty folder) and isStatusActive is true, should we show?
                // Standard logic: Show if StatusActive. 
                // So: ( !searchQuery && isStatusActive ) || ( searchQuery && matchesName && isStatusActive ) || childVisible

                if (!childVisible) {
                    isVisible = matchesName && isStatusActive;
                }
            } else { // File
                isVisible = matchesName && isStatusActive;
            }

            if (isVisible) {
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
    leftContainer.dataset.path = node.path; // Store path for lookup

    const rightContainer = document.createElement('div');
    rightContainer.className = 'tree-item';
    rightContainer.dataset.status = status;
    rightContainer.dataset.path = node.path; // Store path for lookup


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
        if (status === 'modified' || status === 'same') {
            // Now allow actions for same (delete)
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
    // Determine visibility of actions
    // We want to allow delete on ALL items if they exist on this side.

    // Status Logic:
    // 'same': Exists on both. No Copy. Can Delete.
    // 'modified': Exists on both. Copy. Can Delete.
    // 'added': Exists on Right. Left is Spacer.
    // 'removed': Exists on Left. Right is Spacer.

    // If we are calling this function, 'row' is a valid content row (not spacer), 
    // EXCEPT if buildDualNode calls it for a spacer? 
    // Check buildDualNode:
    // added -> left: Spacer, right: Content. Calls (right, node, true).
    // removed -> left: Content, right: Spacer. Calls (left, node, false).
    // modified/same -> Both Content. Calls both.

    // So if we are here, the item EXISTS on this side.
    const actions = document.createElement('div');
    actions.className = 'merge-actions';

    const leftInput = document.getElementById('left-path');
    const rightInput = document.getElementById('right-path');
    const fullLeft = leftInput.value + '/' + node.path;
    const fullRight = rightInput.value + '/' + node.path;

    const status = node.status;

    // --- COPY BUTTONS ---
    // Only if there is a 'counterpart' or we want to 'restore'/copy to other side.
    // same: No copy needed.
    // modified: Copy (Overwrite)
    // added (Right): Copy to Left.
    // removed (Left): Copy to Right.

    if (status === 'removed' && !isRightSide) {
        // Left side item. Copy to Right.
        const btn = document.createElement('button');
        btn.className = 'merge-btn';
        btn.innerHTML = 'Copy <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
        btn.onclick = (e) => { e.stopPropagation(); api.copyItem(fullLeft, fullRight, node.type === 'directory').then(() => { document.getElementById('compare-btn').click(); refreshDiffView(); }); };
        actions.appendChild(btn);
    }
    else if (status === 'added' && isRightSide) {
        // Right side item. Copy to Left.
        const btn = document.createElement('button');
        btn.className = 'merge-btn';
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Copy';
        btn.onclick = (e) => { e.stopPropagation(); api.copyItem(fullRight, fullLeft, node.type === 'directory').then(() => { document.getElementById('compare-btn').click(); refreshDiffView(); }); };
        actions.appendChild(btn);
    }
    else if (status === 'modified') {
        const btn = document.createElement('button');
        btn.className = 'merge-btn';
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

    // --- DELETE BUTTON ---
    // Always available if item exists (which it does if we are here)
    const delBtn = document.createElement('button');
    delBtn.className = 'merge-btn delete-btn';
    delBtn.title = isRightSide ? "Delete Right" : "Delete Left";
    delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    delBtn.style.marginLeft = '4px';
    delBtn.style.color = '#ef5350';
    delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete ${isRightSide ? 'Right' : 'Left'} item: ${node.name}?`)) {
            const target = isRightSide ? fullRight : fullLeft;
            console.log("Attempting to delete:", target);
            api.deleteItem(target).then(() => {
                document.getElementById('compare-btn').click();
                refreshDiffView();
            }).catch(e => alert("Delete failed: " + e.message));
        }
    };
    actions.appendChild(delBtn);

    row.appendChild(actions);
}

export function updateFileStatus(relPath, newStatus) {
    const items = document.querySelectorAll(`.tree-item[data-path="${relPath}"]`);
    items.forEach(item => {
        item.dataset.status = newStatus;

        // Update Status Dot/Label if exists
        const row = item.querySelector('.tree-row');
        if (row) {
            const statusSpan = row.querySelector('.item-status');
            if (statusSpan) {
                if (newStatus === 'same') {
                    statusSpan.remove(); // Remove status label for same
                } else {
                    statusSpan.className = `item-status ${newStatus}`;
                    statusSpan.textContent = newStatus;
                }
            } else if (newStatus !== 'same') {
                // Create if missing but needed (unlikely case for merge same->mod, usually mod->same)
            }
        }
    });
    // Re-apply filters to hide/show based on new status
    applyFilters();
}


