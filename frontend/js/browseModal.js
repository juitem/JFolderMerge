import * as api from './api.js?v=31';
import { Modal } from './modal.js?v=2';

let currentBrowseTarget = null;
let currentOnSelect = null;
let currentRestriction = null;
let currentModalPath = "";
let currentBrowseMode = 'directory'; // 'directory' or 'file'

// Store UI references for the active modal
let activeModal = null;
let pathInput = null;
let listContainer = null;

export function initBrowseModal() {
    // Legacy init not needed for modal creation, 
    // but listeners on main page buttons are handled in main.js
    // We can keep this empty or remove it.
    // main.js calls it. Let's keep it empty to avoid breaking main.js immediately.
}

export async function openBrowseModal(initialPath, options = {}) {
    currentBrowseTarget = options.target || null;
    currentOnSelect = options.onSelect || null;
    currentBrowseMode = options.mode || 'directory';
    currentRestriction = options.restrictTo || null;
    const title = options.title || 'Select Folder';
    const submitLabel = options.submitLabel || (currentBrowseMode === 'file' ? 'Select File' : 'Select Folder');

    // Create Content DOM
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.flex = '1'; // Fill modal body
    container.style.minHeight = '0'; // Allow shrinking for scroll
    container.style.gap = '10px';

    // Navigation Bar
    const navBar = document.createElement('div');
    navBar.style.display = 'flex';
    navBar.style.gap = '8px';
    navBar.style.flexShrink = '0'; // Don't shrink header

    const upBtn = document.createElement('button');
    upBtn.className = 'icon-btn';
    upBtn.textContent = '↑';
    upBtn.onclick = goUp;

    pathInput = document.createElement('input');
    pathInput.type = 'text';
    pathInput.readOnly = true;
    pathInput.style.flex = '1';
    pathInput.style.background = 'rgba(0,0,0,0.2)';
    pathInput.style.border = '1px solid var(--border-color)';
    pathInput.style.borderRadius = '4px';
    pathInput.style.padding = '4px 8px';
    pathInput.style.color = 'var(--text-secondary)';

    navBar.appendChild(upBtn);
    navBar.appendChild(pathInput);
    container.appendChild(navBar);

    // List Container
    listContainer = document.createElement('div');
    listContainer.className = 'folder-list';
    listContainer.style.flex = '1';
    listContainer.style.minHeight = '0'; // Crucial for scrolling inside flex
    listContainer.style.overflowY = 'auto'; // Explicitly ensure scroll
    listContainer.style.border = '1px solid var(--border-color)';
    listContainer.style.borderRadius = '6px';
    container.appendChild(listContainer);

    // Create Modal
    activeModal = new Modal({
        title: title,
        content: container,
        width: '600px',
        buttons: [
            {
                text: 'Cancel',
                class: 'secondary-btn',
                onClick: (e, modal) => modal.close()
            },
            {
                text: submitLabel,
                class: 'primary-btn',
                onClick: onConfirm
            }
        ],
        onClose: () => {
            activeModal = null;
        }
    });

    activeModal.open();
    loadBrowsePath(initialPath);
}

function onConfirm() {
    if (activeModal) {
        if (currentOnSelect) {
            currentOnSelect(currentModalPath);
        } else if (currentBrowseTarget) {
            currentBrowseTarget.value = currentModalPath;
        }
        activeModal.close();
    }
}

function goUp() {
    // Calculate parent
    // We need parent from API or calculate from string.
    // API listDirs returns parent. We need to store it.
    // Let's rely on data-parent attribute logic or simple string manipulation if data not stored.
    // Better: store currentParent in var.
    if (!activeModal) return;

    const parentPath = pathInput.getAttribute('data-parent');
    if (!parentPath) return;

    if (currentRestriction) {
        // Restriction check
        if (currentModalPath === currentRestriction || currentModalPath.replace(/\/$/, '') === currentRestriction.replace(/\/$/, '')) {
            return;
        }
        if (parentPath.length < currentRestriction.length) return;
    }
    loadBrowsePath(parentPath);
}

async function loadBrowsePath(path) {
    try {
        console.log("Loading path:", path, "Mode:", currentBrowseMode);
        const data = await api.listDirs(path, currentBrowseMode === 'file');
        console.log("Received data:", data);
        currentModalPath = data.current;

        if (pathInput) {
            pathInput.value = data.current;
            pathInput.setAttribute('data-parent', data.parent);
        }

        renderBrowseList(data);
    } catch (e) {
        console.error("Browse Error", e);
        // Fallback to home if failed and path was not empty
        if (path) {
            console.log("Falling back to default path...");
            loadBrowsePath('');
        }
    }
}

function renderBrowseList(data) {
    if (!listContainer) {
        console.error("List container missing!");
        return;
    }
    listContainer.innerHTML = '';
    console.log(`Rendering ${data.dirs.length} dirs, ${data.files ? data.files.length : 0} files.`);

    const createItem = (name, type) => {
        const div = document.createElement('div');
        div.className = 'folder-item';

        let icon = '';
        if (type === 'directory') {
            icon = '<span class="file-icon" style="display:inline-flex; vertical-align:middle; margin-right:4px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span>';
        } else {
            icon = '<span class="file-icon" style="display:inline-flex; vertical-align:middle; margin-right:4px; color:#888;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg></span>';
        }

        div.innerHTML = icon + ' ' + name;

        div.addEventListener('click', () => {
            menuSelect(div, data, name);
        });

        div.addEventListener('dblclick', () => {
            if (type === 'directory') {
                const newPath = data.current + (data.current.endsWith('/') ? '' : '/') + name;
                loadBrowsePath(newPath);
            } else if (currentBrowseMode === 'file') {
                menuSelect(div, data, name); // Ensure selection
                onConfirm(); // Confirm
            }
        });

        listContainer.appendChild(div);
    };

    data.dirs.forEach(dir => createItem(dir, 'directory'));
    if (data.files) {
        data.files.forEach(file => createItem(file, 'file'));
    }
}

function menuSelect(div, data, name) {
    if (!listContainer) return;
    listContainer.querySelectorAll('.folder-item').forEach(i => i.classList.remove('selected'));
    div.classList.add('selected');
    const newPath = data.current + (data.current.endsWith('/') ? '' : '/') + name;
    currentModalPath = newPath;
    if (pathInput) pathInput.value = currentModalPath;
}
