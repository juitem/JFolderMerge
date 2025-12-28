# Tasks

- [x] Analyze `frontend` (Legacy) for interactive elements
    - [ ] List HTML/JS files
    - [x] **UI Layout Refinements** <!-- id: 5 -->
    - [x] Move "Compare" button to Toolbar <!-- id: 6 -->
    - [x] Reposition Path Controls below Toolbar <!-- id: 7 -->
    - [x] Remove textual labels (Folder, View, etc.) and replace with Icons <!-- id: 8 -->
    - [x] Implement "Combined View" (Unified + Side-by-Side) <!-- id: 9 -->
    - [x] Remove "Eye" icon and finalize Toolbar spacing <!-- id: 10 -->

- [x] **Backend & Functional Improvements** <!-- id: 11 -->
    - [x] Verify and Fix Merge functionality (Folder/File/Line) <!-- id: 12 -->
    - [x] **Critical**: Fix Backend `api/copy` and `api/save-file` to auto-create parent directories <!-- id: 13 -->
    - [x] **UX**: Replace native `alert/confirm` with Custom Dark Theme Modal <!-- id: 14 -->
    - [x] **UX**: Add Keyboard support (Enter/Esc) to Modals <!-- id: 15 -->
    - [x] **UX**: Remove confirmation popup for Line-level merges (instant action) <!-- id: 16 -->

- [x] **Documentation & Cleanup** <!-- id: 17 -->
    - [x] Sync documentation to `docs/react` <!-- id: 18 -->
    - [ ] Create Flow Chart and Sequence Diagrams <!-- id: 19 -->
- [x] Analyze `frontend-react` (Current) for interactive elements
    - [ ] List Component files
    - [ ] Identify implemented features
- [/] Compare and Document
    - [x] Create a document listing all legacy interactive elements
    - [x] Mark missing items in React version
- [x] Implement Missing Features
    - [x] `DiffViewer`: Implement Line-level Merging (Copy/Delete)
    - [x] `FolderTree`: Add Keyboard Navigation
    - [x] `App`: Restore Toolbar (Diff Filters, Search, Excludes)
    - [x] `App`: Restore Header Actions (Save Settings, About)
    - [x] `App`: Add UI Polish (Fullscreen, Close Diff)
