# Verification Plan: File Deletion & Modularization

## Objective
Verify that the new "Delete" functionality and "About Modal" work correctly after code modularization.

## Verified Items
- [x] **Backend API**: `POST /api/delete` works correctly via `curl`.
    - Tested creating and deleting `test/A/delete_me.txt`.
- [x] **Modal Logic**: About Modal opens correctly (fixed HTML issue).
- [x] **Project Structure**: Frontend code moved to `frontend/`.

## Proposed Changes [DONE]

### Directory Comparison & History
#### [MODIFY] [main.py](file:///Users/juitem/Docker/ContainerFolder/FolderComp/backend/main.py)
- Refactor comparison logic to support History saving.
- Add `/api/history` endpoints.

#### [NEW] [settings/history.json](file:///Users/juitem/Docker/ContainerFolder/FolderComp/settings/history.json)
- Store JSON array of `{left, right, timestamp}`.

### Frontend Enhancements [DONE]
#### [MODIFY] [index.html](file:///Users/juitem/Docker/ContainerFolder/FolderComp/frontend/index.html)
- Add History buttons to input groups.
- Add View Option toggles to toolbar.

#### [MODIFY] [main.js](file:///Users/juitem/Docker/ContainerFolder/FolderComp/frontend/js/main.js)
- Wire up View Options (Auto-Expand, External).
- Wire up History modals.

## Refactoring Phase (Current)
Improving maintainability and UX as requested.

### Unified Modal System
- **Goal**: dynamic creation of modals.
- **New Files**: `frontend/js/modal.js`.
- **Changes**:
    - `browseModal.js`: Adapt to new class.
    - `index.html`: Remove `<div id="browse-modal">` and `about-modal`.

### Toast Notifications
- **Goal**: Non-blocking feedback.
- **New Files**: `frontend/js/toast.js`.
- **Changes**:
    - `style.css`: Add toast animations.
    - `main.js`: Replace alerts.

### Configuration Manager
- **Goal**: Centralize settings.
- **New Structure**: `settings/config.json`, `settings/ignore_folders/`, `settings/ignore_files/`.
- **Changes**:
    - Backend: Serve `config.json` via API.
    - Frontend: Fetch config and use paths dynamically.

## Verification
- Check if Browse Import opens the new location.

## Refactoring: CSS Variables
- **Goal**: Standardize design tokens.
- **Changes**:
    - `style.css`: define comprehensive `:root` variables. Replace hardcodes.

## Feature: File Search
- **Goal**: Filter tree by name.
- **UI**: Input in toolbar.
- **Logic**: update `applyFilters` in `folderView.js` to check filename inclusion.
- **Interaction**: Real-time filtering.

## Feature: Keyboard Navigation
- **Goal**: Navigate visible tree using keyboard.
- **Logic**:
    - Flatten visible items list via `querySelectorAll`.
    - Track `selectedIndex`.
    - `ArrowDown/Up`: Update selection.
    - `ArrowLeft/Right`/`Enter`: Toggle folder or Trigger Diff.
