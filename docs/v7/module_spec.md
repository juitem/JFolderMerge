# Module Specifications & State Definition (v7)

The core of this refactoring is to clearly separate the data (State) managed by each module and the behaviors (Functions) provided to prevent conflicts.

## 1. Folder View Module (Tree)

| Category | Item Name | Description | Test Status |
| :--- | :--- | :--- | :--- |
| **State** | `treeData` | Static tree structure (FileNode). | Unit Tested |
| | `visibleNodes` | Flattened list with filters and expansion state applied. | Unit Tested |
| | `expandedPaths` | Set of currently expanded folder paths. | Unit Tested |
| | `focusedPath` | Keyboard cursor position (Primary Focus, prevents -1 with `Derived State`). | Unit Tested |
| | `selectedPaths` | Set of multi-selected paths (for batch operations). | Unit Tested |
| | `folderStats` | Summary of Added/Removed/Modified children for each folder node (Memoized). | Unit Tested |
| **Functions** | `moveFocus(delta)` | Move up/down (supports wrap-around). | Unit Tested |
| | `toggleExpand(path)` | Open/close folder (Space/Arrows). | Unit Tested |
| | `navToParent()` | Jump to the parent of the current node (Left arrow). | Unit Tested |
| | `selectNextStatus(status)` | Find, auto-expand, and move to a node with a specific status (A/M/R). (Hotkeys: `a`, `r`, `c`) | Unit Tested |
| | `selectPrevStatus(status)` | Find, auto-expand, and move to the previous node with a specific status (A/M/R). (Hotkeys: `Shift + a, r, c`) | Unit Tested |
| | `quickMerge(path)` | Immediately execute merge on the focused node (if applicable). | Planned |
| | `scrollToPath()` | Explicitly expose a specific node using Virtuoso imperative scroll. | Component Test |
| | `toggleHidden(path)` | Hide specific files/folders (Hotkeys: `Ctrl+H`, `Alt+H`). | Unit Tested |
| | `toggleShowHidden()` | Toggle visibility of hidden files (Hotkey: `h`). | Unit Tested |
| | `handleContextMenu(e, node)` | Display context menu and set state on right-click. | Manual Verified |
| | `executeContextAction(action)` | Execute menu actions (Merge, Delete, Open External). | Manual Verified |

## 2. File View Module (Viewer)

| Category | Item Name | Description | Test Status |
| :--- | :--- | :--- | :--- |
| **State** | `selectedFile` | Information of the currently open original file. | Unit Tested |
| | `diffBlocks` | List of calculated difference blocks and their respective merge status. | Unit Tested |
| | `activeIndex` | Index of the currently focused difference block in the editor. | Unit Tested |
| | `focusZone` | Detailed focus position within a block (`content`, `accept`, `revert`). | Unit Tested |
| | `mergeMode` | Current merge unit setting (`group`, `unit`). | Unit Tested |
| | `isDirty` | Whether there are unsaved merge changes. | Component Test |
| **Functions** | `loadDiff(node)` | Load and render Diff data for the selected node from the tree. | Component Test |
| | `applyMerge(dir)` | Execute merge on the currently focused block (L->R, R->L). | Unit Tested |
| | `scrollIntoBlock(i)` | Vertical scroll movement to a specific difference block. | Visual Verified |
| | `applyQuickMerge()` | Immediately execute `Accept` (L <- R) on `Enter` in the `Accept` zone. Doesn't work in `Content` zone. | Unit Tested |
| | `navigateZone(dir)` | Linear movement between `Accept` <-> `Content` <-> `Revert` using `ArrowLeft/Right` (Sticky). | Unit Tested |
| | `resetFocus()` | Return to `Content` zone from icon selection on `Esc` (Soft Exit). | Unit Tested |
| | `saveChanges()` | Record changes to server and trigger tree state update. | E2E Tested |
| | `toggleEditMode()` | Switch between read-only and edit mode in Single View. | Manual Verified |
| | `updateContent(text)` | Modify file content in edit mode (supports Undo/Redo). | Manual Verified |

## 3. Input & Command Module

| Category | Item Name | Description | Test Status |
| :--- | :--- | :--- | :--- |
| **State** | `commandMap` | Mapping table between command IDs and actual implementation functions. | Unit Tested |
| | `keybindings` | Mapping between key combinations (e.g., `Enter`) and command IDs. | Unit Tested |
| | `activeContext` | Currently active input scope (e.g., `tree`, `viewer`, `modal`). | Unit Tested |
| **Functions** | `registerCommand(id, fn)` | Modules inject their own functionality into the system (Injection). | Unit Tested |
| | `handleKeyDown(e)` | Intercept events and convert them to **Command IDs**. (See Interaction Policy) | Unit Tested |
| | `setContext(name)` | Switch valid hotkey scope during focus movement. | Unit Tested |

### Interaction Policy (Mapping)
*   **Triggers**: `Enter`, `Double Click` -> `cmd.open`
*   **Triggers**: `Space` -> `cmd.toggle` (Folder) or `cmd.preview` (File)
*   **Triggers**: `Arrow Keys` -> `cmd.nav`
*   **Triggers**: `a`, `r`, `c` -> `cmd.nav.nextStatus` (added, removed, modified)
*   **Triggers**: `Shift + a`, `r`, `c` -> `cmd.nav.prevStatus`
*   **Triggers**: `h` -> `cmd.tree.toggleShowHidden`
*   **Triggers**: `Ctrl+H` / `Alt+H` -> `cmd.tree.hideCurrentPath`
*   **Triggers**: `Esc` (Viewer) -> `cmd.viewer.resetFocus` -> `cmd.viewer.close` (Double Esc)

## 4. App Service (Orchestrator)

| Category | Item Name | Description | Test Status |
| :--- | :--- | :--- | :--- |
| **State** | `projectConfig` | Global settings for filters, excluded files/folders, layout, and view options. | Context Test |
| | `viewOptions` | UI control options such as `showLineNumbers`, `wordWrap`, `statusDisplayMode`, `showSelectionCheckboxes`, `leftPanelWidth_*`, `confirmMerge`, `confirmDelete`, etc. | Unit Tested |
| | `globalStats` | Total A/M/R count for the entire project. | Unit Tested |
| | `historyItems` | List of recently compared path pairs. | Service Test |
| **Services** | `FileMutationService`| Integrated management of file read/modify/save logic (DRY principle). | Unit Tested |
| | `StatsService` | Real-time automatic calculation of statistics based on tree data. | Unit Tested |
| **Functions** | `setViewOption(key, val)` | Explicitly set individual view options. | Unit Tested |
| | `toggleFilter(status)` | Toggle folder filters (A/M/R/S). Defaults to `true` if undefined. | Unit Tested |
| | `runCompare()` | Complete re-scan and tree construction for left/right paths. | Integration Test |
| | `openBrowse(target)` | Open folder browser modal (Left/Right/Excludes). | Manual Verified |
| | `updateNodeStatus()` | Immediately reflect viewer changes in tree nodes and parent statistics. | Unit Tested |
| | `openExternal(path)` | Open file with system default program or configured editor. | Manual Verified |

## 5. Layout Module (Resizer)

| Category | Item Name | Description |
| :--- | :--- | :--- |
| **State** | `sidebarWidth` | Current width of the folder tree area (px or %). |
| | `isResizing` | Whether the user is dragging the boundary. |
| | `layoutMode` | Overall layout format (Sidebar View, Full Screen, etc.). |
| **Functions** | `updateWidth(newWidth)`| Change and maintain tree width via drag or action. |
| | `switchLayout(mode)` | Cycle through Folder/Split/File layouts via **'v'** key. | Unit Tested |
| | `resetLayout()` | Restore layout settings to defaults. |
| | `persistLayout()` | Save changed width by `folderViewMode` (`split`, `unified`, `flat`) to local storage or server. |

## 6. Infrastructure Module (Logger & Diagnostics)

| Category | Item Name | Description |
| :--- | :--- | :--- |
| **State** | `logHistory` | List of major events and error records that occurred during runtime. |
| | `debugLevel` | Log detail level setting (Info, Debug, Error). |
| **Functions** | `logCommand(cmd)` | Record executed command and argument information. |
| | `exportLogs()` | Extract current logs as file/text for debugging. |
| | `verifyModule(id)`| Self-diagnose if the status of each module is within normal range (Sanity Check). |

---

## 7. Module Interaction Map (Data Flow)

1.  **Opening Flow**: `Tree Module` (Select Action) -> `Orchestrator` -> `App State: activeFile = node.path` -> `File View` (Load Data).
2.  **Closing Flow**: `File View` (Esc/Close Action) -> `Orchestrator` -> `App State: activeFile = null` -> `Tree Module` (Restore focus to `selectedFile`. If missing due to filter, move to `Next Logical Item`).
3.  **Status Update Flow**: `File View` (Save/Merge) -> `Orchestrator.updateNodeStatus(path, 'same')` -> `Tree Module` (Update internal `treeData`).
4.  **File Operation Flow**: `Tree/Viewer Module` (Delete/Merge Action) -> `Orchestrator` -> `API Call` -> `Success` -> `Orchestrator.updateNodeStatus`.
5.  **Layout Resize Flow**: `User Drag` -> `Layout Module.updateWidth()` -> `Global State: sidebarWidth` -> `Tree & Viewer Modules` (Resize Components).
6.  **Keyboard Flow**: `User Input` -> `Input Service` (Context Check) -> `Command Registry` -> `Active Module` (Execute Function).
7.  **Update Flow**: `File View` (Merge) -> `Orchestrator` -> `Tree Module` (State: Refresh node status).
