# Feature Restoration Plan

## Goal Description
Restore critical functionality missing in the React frontend compared to the legacy version:
1.  **Line Merging**: Ability to copy/delete individual lines in Diff View.
2.  **Keyboard Navigation**: Arrow key navigation in the file tree.
3.  **Toolbar Controls**: Diff filters, File search, and Exclude patterns.
4.  **Header Actions**: Save Settings and About Modal.

## User Review Required
None. These are standard features present in the legacy app.

## Proposed Changes

### 1. Line-Level Merging (`DiffViewer.tsx`)
-   Implement `handleLineMerge` function within `DiffViewer`.
-   Logic:
    -   Receive `sourceText`, `targetSide`, `targetLineIndex` (1-based), and `type` (insert/replace/delete).
    -   Fetch current content of the *target* file (we might need to store raw lines in state or re-fetch).
    -   Splice the array of lines (Insert: `splice(idx, 0, txt)`; Replace: `splice(idx, 1, txt)`; Delete: `splice(idx, 1)`).
    -   Call `api.saveFile(targetPath, newContent)`.
    -   Refetch Diff to update UI.
-   Update `DiffRow` component to render buttons passing correct indices.

### 2. Keyboard Navigation (`FolderTree.tsx`)
-   Add global `keydown` listener (or scoped to Tree container) in `App.tsx` or `FolderTree.tsx`.
-   Track `focusedNodePath` in state.
-   Handle keys:
    -   `ArrowDown` / `ArrowUp`: Move focus to next/prev visible node (need a flattened list of visible nodes).
    -   `ArrowRight`: Expand directory.
    -   `ArrowLeft`: Collapse directory.
    -   `Enter`: Select file (open Diff).

### 3. Toolbar Restoration (`App.tsx`)
-   **Diff Filters**:
    -   Bind `config.diffFilters` checkboxes to state updates.
    -   Pass `diffFilters` props to `DiffViewer` (already exists, just need UI).
-   **Search**:
    -   Add `<input>` for search query.
    -   Implement filtering logic in `FolderTree` (or filter data before passing). 
    -   *Logic*: Show node if name matches OR child matches.
-   **Excludes**:
    -   Add UI for "Exclude Folders" and "Exclude Files" (Compact inputs).
    -   Bind to `config.savedExcludes`.
    -   Note: Changing these requires re-running `compareFolders`.

### 4. Header Actions (`App.tsx` / `components`)
-   **Save Settings**: Implement `api.saveConfig` call with current state (filters, excludes).
-   **About Modal**: Create simple `AboutModal.tsx` and wire to Header button.

### 5. UI Polish
-   **Fullscreen Diff**: Toggle CSS class `expanded` on `DiffViewer` container.
-   **Close Diff**: Button to plain `input` or clear `selectedNode`.

## Verification Plan
1.  **Manual Test**: Open Diff, copy a line L->R, verify file update.
2.  **Manual Test**: Delete a line, verify.
3.  **Manual Test**: Click Tree, use Arrow Keys to move and Enter to select.
4.  **Manual Test**: Type in Search, verify tree filters.
5.  **Manual Test**: Change Filters, verify Diff View updates.
