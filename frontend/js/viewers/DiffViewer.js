
import { state } from '../state.js';
import * as api from '../api.js';
import { EventBus, EVENTS } from '../events.js';

export class DiffViewer {
    constructor() {
        this.name = "DiffViewer";
        // Cache DOM elements if possible, or query on render
        // We assume the container passed to render is where we work, 
        // BUT current CSS structure relies on specific IDs (#diff-panel, #diff-content, etc.)
        // For refactoring, we will try to respect the container, but might reuse existing global IDs if we don't rewrite HTML yet.
        // Actually, we should probably generate the UI inside the container.
        // For now, to keep it compatible with existing CSS, we might need to inject the specific HTML structure.
    }

    canHandle(filename) {
        // Fallback for everything else (text)
        return true;
    }

    async render(container, leftPath, rightPath, itemPath) {
        // Update State (Global state dependency)
        // Ensure paths are full paths if needed, or store logic-specific paths
        let fullLeft = leftPath;
        let fullRight = rightPath;

        if (itemPath) {
            fullLeft = leftPath + (leftPath.endsWith('/') ? '' : '/') + itemPath;
            fullRight = rightPath + (rightPath.endsWith('/') ? '' : '/') + itemPath;
        }

        state.currentLeftPathGlobal = fullLeft;
        state.currentRightPathGlobal = fullRight;
        state.currentDiffPaths = { leftRoot: leftPath, rightRoot: rightPath, relPath: itemPath };

        // 1. Setup Container HTML (matches existing structure)
        container.innerHTML = `
            <div id="diff-content" class="diff-content hidden"></div>
            <div id="diff-split" class="diff-split-view hidden">
                <div id="diff-left" class="split-pane left"></div>
                <div id="diff-right" class="split-pane right"></div>
            </div>
            <!-- Loading indicator overlay or standard text -->
        `;

        const diffContent = container.querySelector('#diff-content');
        const diffSplit = container.querySelector('#diff-split');
        const diffLeft = container.querySelector('#diff-left');
        const diffRight = container.querySelector('#diff-right');



        // Show Loading
        if (state.currentDiffMode === 'unified') {
            diffContent.textContent = 'Loading...';
            diffContent.classList.remove('hidden');
        } else {
            diffLeft.textContent = 'Loading...';
            diffRight.textContent = 'Loading...';
            diffSplit.classList.remove('hidden');
        }

        // Fetch Content for Copy/Merge Ops (needed for mergeLine)
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

        // Fetch Diff
        await this.refresh(diffContent, diffSplit, diffLeft, diffRight);
    }

    async refresh(diffContent, diffSplit, diffLeft, diffRight) {
        const fullLeft = state.currentLeftPathGlobal;
        const fullRight = state.currentRightPathGlobal;
        const mode = state.currentDiffMode;

        // Re-query if references lost? Using passed args.

        try {
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

            // Render Unified
            if (mode === 'unified' || mode === 'both') {
                diffContent.classList.remove('hidden');
                this.renderDiffLines(diffContent, unifiedData.diff);
            } else {
                diffContent.classList.add('hidden');
            }

            // Render Split
            if (mode === 'side-by-side' || mode === 'both') {
                diffSplit.classList.remove('hidden');
                this.renderSplitDiff(diffLeft, diffRight, splitData.left_rows, splitData.right_rows);
            } else {
                diffSplit.classList.add('hidden');
            }

            // Check Identical (Merge logic)
            if ((mode === 'side-by-side' || mode === 'both') && splitData) {
                const isIdentical = splitData.left_rows.every(r => r.type === 'same' || r.type === 'empty') &&
                    splitData.right_rows.every(r => r.type === 'same' || r.type === 'empty');

                if (isIdentical && state.currentDiffPaths.relPath) {
                    EventBus.emit(EVENTS.FILE_MERGED, { path: state.currentDiffPaths.relPath, status: 'same' });
                }
            }

            this.applyFilters(diffContent, diffLeft, diffRight);

        } catch (e) {
            diffContent.textContent = "Error: " + e.message;
            diffLeft.textContent = "Error";
            diffRight.textContent = "Error";
        }
    }

    renderDiffLines(container, lines) {
        container.innerHTML = '';
        if (!lines || lines.length === 0) {
            container.textContent = "Files are identical.";
            return;
        }
        lines.forEach(line => {
            const div = document.createElement('div');
            div.className = 'diff-line';
            div.textContent = line;
            if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) div.className += ' header';
            else if (line.startsWith('+')) div.className += ' added';
            else if (line.startsWith('-')) div.className += ' removed';
            container.appendChild(div);
        });
    }

    renderSplitDiff(leftContainer, rightContainer, leftRows, rightRows) {
        if (!leftRows || !rightRows) return;
        leftContainer.innerHTML = '';
        rightContainer.innerHTML = '';

        for (let i = 0; i < leftRows.length; i++) {
            const rowL = leftRows[i];
            const rowR = rightRows[i];

            // Pass references to re-render access
            // Warning: mergeLine needs to call refresh(). DiffViewer instance reference needed.
            // internal helper bind needed.
            const divL = this.createDiffRow(rowL, 'left', i, rowR, rightRows, () => this.refresh(document.getElementById('diff-content'), document.getElementById('diff-split'), leftContainer, rightContainer));
            const divR = this.createDiffRow(rowR, 'right', i, rowL, leftRows, () => this.refresh(document.getElementById('diff-content'), document.getElementById('diff-split'), leftContainer, rightContainer));

            leftContainer.appendChild(divL);
            rightContainer.appendChild(divR);
        }
    }

    createDiffRow(row, side, index, otherRow, targetRowsArray, refreshCallback) {
        const div = document.createElement('div');
        div.className = `diff-line ${row.type}`;

        const contentSpan = document.createElement('span');
        contentSpan.className = 'diff-text';

        if (Array.isArray(row.text)) {
            row.text.forEach(seg => {
                const span = document.createElement('span');
                span.textContent = seg.text;
                if (seg.type !== 'same') span.className = `diff-span-${seg.type}`;
                contentSpan.appendChild(span);
            });
        } else {
            contentSpan.textContent = row.text || " ";
        }
        div.appendChild(contentSpan);

        // Merge Logic
        let canMerge = false;
        if (['modified', 'added', 'removed'].includes(row.type)) canMerge = true;
        else if (row.type === 'empty' && otherRow && otherRow.line) canMerge = true;

        if (canMerge) {
            const btn = document.createElement('button');
            btn.className = 'merge-btn' + (row.type === 'empty' ? ' delete-action' : '');
            btn.textContent = side === 'left' ? '→' : '←';
            btn.onclick = (e) => {
                e.stopPropagation();
                this.mergeLine(side, index, row, otherRow, targetRowsArray, refreshCallback);
            };
            div.prepend(btn);
        }
        return div;
    }

    async mergeLine(sourceSide, viewIndex, sourceRow, targetRow, targetRowsArray, refreshCallback) {
        const targetPath = sourceSide === 'left' ? state.currentRightPathGlobal : state.currentLeftPathGlobal;
        let targetLines = sourceSide === 'left' ? state.currentRightLines : state.currentLeftLines;

        let sourceText = "";
        if (Array.isArray(sourceRow.text)) {
            sourceText = sourceRow.text.map(s => s.text).join('');
        } else {
            sourceText = sourceRow.text || "";
        }

        if (!targetRow.line) { // Insert
            let insertIndex = 0;
            for (let i = viewIndex - 1; i >= 0; i--) {
                if (targetRowsArray[i].line) {
                    insertIndex = targetRowsArray[i].line;
                    break;
                }
            }
            targetLines.splice(insertIndex, 0, sourceText);
        } else { // Replace/Delete
            const arrayIndex = targetRow.line - 1;
            if (sourceRow.type === 'empty') targetLines.splice(arrayIndex, 1);
            else targetLines[arrayIndex] = sourceText;
        }

        await api.saveFile(targetPath, targetLines.join('\n'));
        if (refreshCallback) refreshCallback();
    }

    applyFilters(diffContent, diffLeft, diffRight) {
        // Same Logic as before but scoped to passed elements
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

        // Side-by-side
        if (diffLeft && diffRight) {
            const leftChildren = diffLeft.children;
            const rightChildren = diffRight.children;
            for (let i = 0; i < leftChildren.length; i++) {
                const lDiv = leftChildren[i];
                const rDiv = rightChildren[i];
                if (!lDiv || !rDiv) continue;

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
    }
}
