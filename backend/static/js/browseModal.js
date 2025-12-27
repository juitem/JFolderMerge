import * as api from './api.js';

let modal;
let modalPathInput;
let currentBrowseTarget = null;
let currentModalPath = "";
let folderList;

export function initBrowseModal() {
    modal = document.getElementById('browse-modal');
    modalPathInput = document.getElementById('modal-path-input');
    folderList = document.getElementById('folder-list');

    // Attach listeners to browse buttons
    document.querySelectorAll('.browse-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentBrowseTarget = document.getElementById(btn.dataset.target);
            // Default to empty or some path if empty
            openBrowseModal(currentBrowseTarget.value);
        });
    });

    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    const selectBtn = document.getElementById('select-folder-btn');
    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            if (currentBrowseTarget) {
                currentBrowseTarget.value = currentModalPath;
            }
            modal.classList.add('hidden');
        });
    }

    const navUpBtn = document.getElementById('nav-up');
    if (navUpBtn) {
        navUpBtn.addEventListener('click', () => {
            const parent = modalPathInput.getAttribute('data-parent');
            loadBrowsePath(parent);
        });
    }
}

async function openBrowseModal(initialPath) {
    if (modal) modal.classList.remove('hidden');
    loadBrowsePath(initialPath);
}

async function loadBrowsePath(path) {
    try {
        const data = await api.listDirs(path);
        currentModalPath = data.current;
        if (modalPathInput) {
            modalPathInput.value = data.current;
            modalPathInput.setAttribute('data-parent', data.parent);
        }

        renderBrowseList(data);
    } catch (e) {
        console.error(e);
    }
}

function renderBrowseList(data) {
    if (!folderList) return;
    folderList.innerHTML = '';

    data.dirs.forEach(dir => {
        const div = document.createElement('div');
        div.className = 'folder-item';
        // Folder Icon
        const icon = '<span class="file-icon" style="display:inline-flex; vertical-align:middle; margin-right:4px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></span>';
        div.innerHTML = icon + ' ' + dir;

        div.addEventListener('click', () => {
            document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('selected'));
            div.classList.add('selected');
            const newPath = data.current + (data.current.endsWith('/') ? '' : '/') + dir;
            currentModalPath = newPath;
            if (modalPathInput) modalPathInput.value = currentModalPath;
        });

        div.addEventListener('dblclick', () => {
            const newPath = data.current + (data.current.endsWith('/') ? '' : '/') + dir;
            loadBrowsePath(newPath);
        });

        folderList.appendChild(div);
    });
}
