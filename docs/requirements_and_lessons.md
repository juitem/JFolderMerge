# Project Requirements & Lessons Learned

## 1. Project Overview
**Folder Comparison Tool** is a lightweight, web-based utility for comparing two directory structures and merging file content line-by-line. It is built to be cross-platform (macOS/Linux) and self-contained.

### Technology Stack
-   **Backend**: Python (FastAPI, Uvicorn)
-   **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3
-   **Runtime**: Python 3.x, Bash (for startup)

---

## 2. Functional Requirements

### 2.1. Basic Folder Comparison
-   **Input**: Users must supply two absolute folder paths (Left & Right).
-   **Structure View**: A hierarchical tree view showing files and directories.
-   **Status Indication**:
    -   <span style="color:#10b981">**Added**</span>: Exists only in Right folder.
    -   <span style="color:#ef4444">**Removed**</span>: Exists only in Left folder.
    -   <span style="color:#f59e0b">**Modified**</span>: Exists in both but content differs.
    -   <span style="color:#94a3b8">**Same**</span>: Content is identical.
-   **Filtering**: Users can toggle visibility of Added, Removed, Modified, and Same items.
-   **Exclusions**: Support for excluding specific file/folder patterns (e.g., `.git`, `__pycache__`).

### 2.2. File Diff & Merging
-   **Diff View Modes**:
    1.  **Unified**: Standard patch-style diff.
    2.  **Side-by-Side**: Split pane view with left/right alignment.
    3.  **Both**: Simultaneous display of both views.
-   **Line-Level Merging**:
    -   **Copy to Right (`→`)**: Overwrite right line with left content.
    -   **Copy to Left (`←`)**: Overwrite left line with right content.
    -   **Insertions**: Merging into a missing line (spacer) should insert the text correctly.
-   **Auto-Save**: Merging actions trigger an immediate atomic save to disk (`/api/save-file`).
-   **Auto-Refresh**: Usage of merge buttons instantly refreshes the diff view to reflect changes.

### 2.3. UI/UX
-   **Dark Mode**: Default sleek dark theme with glassmorphism effects.
-   **Full Screen**: Diff panel can be toggled to fullscreen (ESC to exit).
-   **Responsive Layout**: Side-by-Side view must share width equally; window controls must be accessible.

---

## 3. Lessons Learned (Pitfalls to Avoid)

If rebuilding this application, pay special attention to these areas where mistakes were made during development:

### 3.1. Frontend Architecture (Modules vs Scripts)
-   **Mistake**: Initially used a single `<script src="script.js">`. When refactoring to `<script type="module">`, forgot to update `index.html`.
-   **Impact**: Browser returned 404 for the old script, breaking the app.
-   **Fix**: Always verify entry point references in HTML when refactoring JS files.
-   **Lesson**: `type="module"` scripts are **deferred** by default. Do not wrap initialization code in `DOMContentLoaded` inside a module, or it might miss the event. Run initialization immediately or await top-level promises.

### 3.2. Configuration & State Management
-   **Mistake**: Typo in variable name (`conststatus` instead of `const status`).
-   **Impact**: Runtime error breaking the UI rendering.
-   **Lesson**: Use a linter or pay close attention to variable declarations. Vanilla JS formatting doesn't catch this at compile time.

### 3.3. Cross-Platform Compatibility (Shell Scripts)
-   **Mistake**: Used `realpath` in `run.sh` to resolve paths.
-   **Impact**: macOS default `realpath` behaves differently or may be missing compared to Linux (coreutils). Failed to pass correct paths.
-   **Fix**: Used Python one-liner (`python3 -c "import os; print(os.path.abspath('...'))"`) which is reliable on all systems with Python installed.

### 3.4. Dynamic CSS Handling
-   **Mistake**: JS logic applied a class `.hidden-by-filter` which was not defined in `style.css`.
-   **Impact**: Filters logic executed correctly in JS, but UI didn't change (items stayed visible).
-   **Lesson**: When adding conditional styling in JS, ensure the corresponding CSS utility classes are defined first.

### 3.5. Application Caching
-   **Mistake**: Browser cached the old `script.js` or `index.html` aggressively.
-   **Impact**: Changes didn't appear to apply even after server restart.
-   **Fix**: Hard refresh (Cmd+Shift+R) is essential during frontend development.

### 3.6. Argument Parsing
-   **Mistake**: Python `argparse` at global module scope conflicts when run via `uvicorn` (which passes its own args).
-   **Fix**: Use `parser.parse_known_args()` to safely ignore external arguments or parse strict arguments only inside the `if __name__ == "__main__":` block.
