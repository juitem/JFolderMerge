const leftInput = document.getElementById('left-path');
const rightInput = document.getElementById('right-path');
const compareBtn = document.getElementById('compare-btn');
const treeRoot = document.getElementById('tree-root');
const diffPanel = document.getElementById('diff-panel');
const diffContent = document.getElementById('diff-content');
const diffFilename = document.getElementById('diff-filename');
const closeDiffBtn = document.getElementById('close-diff');

// Filters
const filterChecks = {
    added: document.getElementById('show-added'),
    removed: document.getElementById('show-removed'),
    modified: document.getElementById('show-modified'),
    same: document.getElementById('show-same')
};

Object.values(filterChecks).forEach(cb => {
    cb.addEventListener('change', () => {
        applyFilters();
    });
});

// Browse Modal Elements
const modal = document.getElementById('browse-modal');
const modalPathInput = document.getElementById('modal-path-input');
const folderList = document.getElementById('folder-list');
const navUpBtn = document.getElementById('nav-up');
const selectFolderBtn = document.getElementById('select-folder-btn');
const closeModalBtn = document.querySelector('.close-modal');
let currentBrowseTarget = null;
let currentBrowsePath = "";

document.querySelectorAll('.browse-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentBrowseTarget = document.getElementById(btn.dataset.target);
        openBrowseModal(currentBrowseTarget.value);
    });
});

closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
selectFolderBtn.addEventListener('click', () => {
    if (currentBrowseTarget) {
        currentBrowseTarget.value = currentBrowsePath;
    }
    modal.classList.add('hidden');
});
navUpBtn.addEventListener('click', async () => {
    // Basic parent logic from current path
    // We rely on backend response mostly, but here we can try to guess or just reload parent
    // The backend `list-dirs` returns parent.
    await loadBrowsePath(modalPathInput.getAttribute('data-parent'));
});

async function openBrowseModal(initialPath) {
    modal.classList.remove('hidden');
    await loadBrowsePath(initialPath);
}

async function loadBrowsePath(path) {
    folderList.innerHTML = 'Loading...';
    try {
        const response = await fetch('/api/list-dirs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path })
        });

        if (!response.ok) {
            folderList.textContent = "Error loading path";
            // Maybe fallback to home if path invalid
            if (path !== "") {
                const retry = await fetch('/api/list-dirs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: "" })
                });
                if (retry.ok) {
                    const data = await retry.json();
                    renderBrowseList(data);
                }
            }
            return;
        }

        const data = await response.json();
        renderBrowseList(data);
    } catch (e) {
        folderList.textContent = "Error: " + e.message;
    }
}

function renderBrowseList(data) {
    folderList.innerHTML = '';
    currentBrowsePath = data.current;
    modalPathInput.value = data.current;
    modalPathInput.setAttribute('data-parent', data.parent);

    data.dirs.forEach(dir => {
        const div = document.createElement('div');
        div.className = 'folder-item';
        div.innerHTML = '<span class="file-icon">📁</span> ' + dir;
        div.addEventListener('click', () => {
            // Select functionality? Or navigate?
            // Single click selects? Double click enters?
            // Let's do click to select visual, dblclick to enter
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('selected'));
            div.classList.add('selected');
            currentBrowsePath = data.current + (data.current.endsWith('/') ? '' : '/') + dir;
            modalPathInput.value = currentBrowsePath;
        });
        div.addEventListener('dblclick', () => {
            loadBrowsePath(data.current + (data.current.endsWith('/') ? '' : '/') + dir);
        });
        folderList.appendChild(div);
    });
}

function applyFilters() {
    const root = document.getElementById('tree-root');
    // We need to re-traverse or hide/show specific elements.
    // CSS based filtering might be tricky for tree structure (hiding parent if all children hidden).
    // Simple approach: Toggle classes on the root or use data attributes.
    // A better way: Iterate all .tree-item and check status.
    // But status is on children too.
    // Let's just add a class to the body or main container reflecting allowed statuses?
    // No, individual items have statuses.
    // Let's implement recursive filter.
    // Actually, simplest is to just re-scan the DOM? No, status is in data?
    // We have status classes on `.item-status`.
    // But whole row needs to hide.

    // Better strategy: Add clases to the container `allow-added allow-removed ...`
    // And CSS: `.tree-container.allow-added .tree-item:has(> .tree-row .item-status.added) { display: block }` 
    // :has is modern but maybe not checking status of *children* recursively.

    // Let's do JS traversal relative to visible nodes.
    // Or just Hide items that match unchecked status.

    document.querySelectorAll('.tree-row').forEach(row => {
        const statusSpan = row.querySelector('.item-status');
        let status = 'same';
        if (statusSpan) {
            status = statusSpan.textContent;
        }

        const shouldShow = filterChecks[status].checked;
        const container = row.parentElement; // .tree-item

        // If it's a directory, we should show it if *any* descendant is shown? 
        // This is complex for pure JS filtering on DOM.
        // For now, let's just toggling the leaf nodes and see if it feels okay.
        // Araxis style: usually you filter what you see.

        // If we hide a file, it's hidden.
        // If we hide a directory ?? 
        // If a directory status is "same" but contains modified files, we want to see it?
        // Our 'status' logic for dirs was simple in backend.
        // Let's just hide based on the immediate status for now.

        if (shouldShow) {
            container.classList.remove('hidden-by-filter');
        } else {
            container.classList.add('hidden-by-filter');
        }
    });

    // CSS for hidden-by-filter
    // We need to inject this style or add to style.css
    // I'll add a style block dynamically or rely on style.css update if I missed it.
    // I missed it in style.css. I will add it via JS.
}

const style = document.createElement('style');
style.textContent = `.hidden-by-filter { display: none !important; }`;
document.head.appendChild(style);

compareBtn.addEventListener('click', async () => {
    const leftPath = leftInput.value;
    const rightPath = rightInput.value;

    // Get exclusions
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
        const response = await fetch('/api/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                left_path: leftPath,
                right_path: rightPath,
                exclude_files: excludeFiles,
                exclude_folders: excludeFolders
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Comparison failed");
        }

        const data = await response.json();
        renderTree(data);
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        compareBtn.textContent = 'Compare';
        compareBtn.disabled = false;
    }
});

function renderTree(data) {
    treeRoot.innerHTML = '';
    treeRoot.appendChild(createNodeElement(data));
}

function createNodeElement(node) {
    const container = document.createElement('div');
    container.className = 'tree-item';

    const row = document.createElement('div');
    row.className = 'tree-row';

    // Icon/Chevron
    if (node.type === 'directory') {
        const chevron = document.createElement('span');
        chevron.className = 'chevron expanded'; // Default expanded
        chevron.innerHTML = '▶';
        chevron.style.fontSize = '0.7em';
        row.appendChild(chevron);

        row.addEventListener('click', (e) => {
            // Check if click was on merge button
            if (e.target.closest('.merge-btn')) return;

            e.stopPropagation();
            const childrenContainer = container.querySelector('.tree-children');
            if (childrenContainer) {
                const isVisible = childrenContainer.classList.contains('visible');
                if (isVisible) {
                    childrenContainer.classList.remove('visible');
                    chevron.style.transform = 'rotate(0deg)';
                } else {
                    childrenContainer.classList.add('visible');
                    chevron.style.transform = 'rotate(90deg)';
                }
            }
        });
    } else {
        const spacer = document.createElement('span');
        spacer.style.width = '16px';
        row.appendChild(spacer);

        // File click
        row.addEventListener('click', () => {
            document.querySelectorAll('.tree-row').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
            if (node.status === 'modified') {
                showDiff(leftInput.value, rightInput.value, node.path);
            } else if (node.status === 'same') {
                // Optional: show content
                showDiff(leftInput.value, rightInput.value, node.path); // Show equality as diff
            }
        });
    }

    // Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = node.name;
    row.appendChild(nameSpan);

    // Status
    if (node.status !== 'same') {
        const statusSpan = document.createElement('span');
        statusSpan.className = `item-status ${node.status}`;
        statusSpan.textContent = node.status;
        row.appendChild(statusSpan);
    }

    // Merge Actions
    // Only show for modified/added/removed
    if (node.status !== 'same') {
        const actions = document.createElement('div');
        actions.className = 'merge-actions';

        const leftRoot = leftInput.value;
        const rightRoot = rightInput.value;
        const fullLeft = leftRoot + '/' + node.path;
        const fullRight = rightRoot + '/' + node.path;

        if (node.status === 'removed') {
            // Exists in Left, Missing in Right -> Copy L to R
            const btn = document.createElement('button');
            btn.className = 'merge-btn';
            btn.textContent = 'Copy →';
            btn.title = 'Copy to Right';
            btn.onclick = (e) => {
                e.stopPropagation();
                copyItem(fullLeft, fullRight, node.type === 'directory');
            };
            actions.appendChild(btn);
        } else if (node.status === 'added') {
            // Missing in Left, Exists in Right -> Copy R to L
            const btn = document.createElement('button');
            btn.className = 'merge-btn';
            btn.textContent = '← Copy';
            btn.title = 'Copy to Left';
            btn.onclick = (e) => {
                e.stopPropagation();
                copyItem(fullRight, fullLeft, node.type === 'directory');
            };
            actions.appendChild(btn);
        } else if (node.status === 'modified') {
            // Both exist. Overwrite?
            const toRight = document.createElement('button');
            toRight.className = 'merge-btn';
            toRight.textContent = '→';
            toRight.title = 'Overwrite Right';
            toRight.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Overwrite ${node.name} in Right?`))
                    copyItem(fullLeft, fullRight, node.type === 'directory');
            };

            const toLeft = document.createElement('button');
            toLeft.className = 'merge-btn';
            toLeft.textContent = '←';
            toLeft.title = 'Overwrite Left';
            toLeft.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Overwrite ${node.name} in Left?`))
                    copyItem(fullRight, fullLeft, node.type === 'directory');
            };

            actions.appendChild(toLeft);
            actions.appendChild(toRight);
        }

        row.appendChild(actions);
    }

    container.appendChild(row);

    // Children
    if (node.children) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children visible'; // Default visible
        node.children.forEach(child => {
            childrenContainer.appendChild(createNodeElement(child));
        });
        container.appendChild(childrenContainer);
    }

    return container;
}

async function showDiff(leftRoot, rightRoot, relPath) {
    diffPanel.classList.remove('hidden');
    diffFilename.textContent = relPath || "Root";
    diffContent.innerHTML = 'Loading...';

    try {
        const response = await fetch('/api/diff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                left_path: leftRoot + '/' + relPath,
                right_path: rightRoot + '/' + relPath
            })
        });

        const data = await response.json();
        renderDiffLines(data.diff);

    } catch (e) {
        diffContent.textContent = "Error loading diff: " + e.message;
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

async function copyItem(src, dest, isDir) {
    try {
        const response = await fetch('/api/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_path: src, dest_path: dest, is_dir: isDir })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Copy failed");
        }

        // Refresh comparison
        compareBtn.click();

    } catch (e) {
        alert("Copy Error: " + e.message);
    }
}

closeDiffBtn.addEventListener('click', () => {
    diffPanel.classList.add('hidden');
});
