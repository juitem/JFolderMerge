# Frontend Interaction Audit

This document lists all interactive elements (selectable, clickable, input-able) found in the legacy `frontend` and their implementation status in the new `frontend-react`.

## Summary of Missing Features
- **Critical**: Line-level merging in Diff View (Copy/Delete lines) is unimplemented.
- **navigation**: Keyboard navigation (Arrow keys) for the file tree is missing.
- **Tooling**: File Search, Exclude Filters, and External Tool integration are missing.
- **UI/UX**: Full-screen diff toggle, global diff filters, and "About"/"Save" actions are missing or inactive.

## Detailed Interaction List

### 1. Header Area
| Element | Legacy Behavior | React Status | Notes |
| :--- | :--- | :--- | :--- |
| **Title** | Static Text | Present | Beta Badge added. |
| **Save Settings Btn** | Saves current filters/paths/view-opts to backend. | ❌ **Inactive** | Button exists but has no `onClick` handler. |
| **About Btn** | Opens About Modal with author info. | ❌ **Inactive** | Button exists but has no `onClick` handler. |

### 2. Controls / Inputs
| Element | Legacy Behavior | React Status | Notes |
| :--- | :--- | :--- | :--- |
| **Left Path Input** | Text input for path. | ✅ Implemented | |
| **Left History Btn** | Opens History Modal for Left path. | ✅ Implemented | |
| **Left Browse Btn** | Opens Browse Modal for Directory selection. | ✅ Implemented | |
| **Right Path Input** | Text input for path. | ✅ Implemented | |
| **Right History Btn** | Opens History Modal for Right path. | ✅ Implemented | |
| **Right Browse Btn** | Opens Browse Modal for Directory selection. | ✅ Implemented | |
| **Swap Paths** | (Not present) | ✅ **New Feature** | Button to swap left/right paths. |
| **Compare Btn** | Triggers comparison (API call). | ✅ Implemented | |

### 3. Toolbar - Filters & Search
| Element | Legacy Behavior | React Status | Notes |
| :--- | :--- | :--- | :--- |
| **Folder Filters** | Checkboxes (Added, Removed, Modified, Same). updates Tree visibility. | ✅ Implemented | |
| **Diff Filters** | Checkboxes (Added, Removed, Modified, Same). updates Diff View visibility. | ❌ **Missing** | Underlying logic exists in components, but **UI Interface** is missing from App Toolbar. |
| **View Toggles** | Buttons: Unified / Side-by-Side / Both. | ⚠️ **Partial** | Moved to `DiffViewer` component toolbar (local state). "Both" mode missing. |
| **Adv. Options** | Default / Auto-Expand / External Tool. | ❌ **Missing** | "External Tool" logic completely missing. Auto-expand missing. |
| **File Search** | Text input filters Tree items by name. | ❌ **Missing** | |
| **Exclude Folders** | Input for comma-sep patterns + Import Button. | ❌ **Missing** | |
| **Exclude Files** | Input for comma-sep patterns + Import Button. | ❌ **Missing** | |

### 4. Main View - Tree
| Element | Legacy Behavior | React Status | Notes |
| :--- | :--- | :--- | :--- |
| **Tree Item Click** | Selects file (opens diff). | ✅ Implemented | |
| **Directory Click** | Toggles expansion. | ✅ Implemented | |
| **Double Click** | (Files) Confirm/Open? (Dirs) Toggle. | ❌ **Missing** | Only single click handled. |
| **Key Navigation** | Arrow Up/Down/Left/Right/Enter/Space to navigate tree. | ❌ **Missing** | |
| **Merge Actions** | Buttons on tree items (Copy L→R, R→L, Delete, Overwrite). | ✅ Implemented | |

### 5. Main View - Diff Panel
| Element | Legacy Behavior | React Status | Notes |
| :--- | :--- | :--- | :--- |
| **Panel Visibility** | Shows when file selected. Hidden on close. | ✅ Implemented | |
| **Full Screen** | Toggle button (Expand/Compress). | ❌ **Missing** | |
| **Close Button** | Closes diff panel. | ❌ **Missing** | React always shows panel if file selected (or empty state). No explicit "Close" to clear selection. |
| **Line Actions** | Buttons on Diff Lines (Copy Line, Delete Line). | ❌ **Missing** | Logic is `alert("Coming soon")`. |
| **Raw View** | (Not present) | ✅ **New Feature** | Added Raw content view mode. |

### 6. Modals
| Element | Legacy Behavior | React Status | Notes |
| :--- | :--- | :--- | :--- |
| **Browse Modal** | Navigate folders, Select. | ✅ Implemented | |
| **History Modal** | List recent paths, Select. | ✅ Implemented | |
| **About Modal** | Shows info. | ❌ **Missing** | |

## Action Plan Recommendations
1.  **High Priority**: Implement Line-level merging in `DiffViewer`.
2.  **High Priority**: Add Keyboard Navigation to `FolderTree`.
3.  **Medium Priority**: Restore Toolbar features: Diff Filters, Search, Excludes.
4.  **Medium Priority**: Wire up Header buttons (Save, About).
5.  **Low Priority**: Restore External Tool integration and detailed View Options if needed.
