# Functional Requirements: Folder View & File View (v7)

## 1. Folder View (Tree Navigation)

### User Perspective
*   **Predictable Navigation**: Keyboard shortcuts (`ArrowUp/Down`, `Tab`) should always move focus to the expected next item. **Wrap-around** must be supported (jumping from the first item to the last and vice-versa).
*   **Visual Feedback**: The currently focused/selected item must be clearly highlighted. Focus indicators should disappear when clicking elsewhere.
*   **Stability**: The tree should not collapse or scroll randomly when files are merged or status updates occur.
*   **Root Integrity**: The project root should stay visible and expanded to provide context, while children can be toggled.
*   **Granular Discovery**: Ability to jump specifically to the **Next Added** or **Next Removed** file, bypassing modified files if needed.
*   **Batch Efficiency**: Support for selecting all files of a certain type (e.g., **Select All Added**) and performing a bulk Merge or Delete action in one go.
*   **Action Stability**: Action icons (Merge Left/Right, Delete Left/Right) must be **horizontally aligned** across all rows. This allows the user to perform repetitive actions by moving only vertically, not laterally.
*   **Quick Actions**: Keyboard-first access to merging (`Ctrl+ArrowRight`), deletion, and jumping to **First/Last Change** without losing place in the tree.
*   **Visibility Control**: One-click toggle for hiding/showing hidden files (`H`) and individual action icons for a cleaner UI.

### Developer Perspective
*   **Decoupled Logic**: Navigation logic (hooks) must be separated from rendering (components) to allow for virtualization (Virtuoso) and testing.
*   **State Recovery**: The system must gracefully handle "stale focus" (e.g., when a focused file is deleted or filtered out after a merge). Fallback to the nearest neighbor (Next/Prev) to maintain navigation flow.
*   **Command Pattern**: Key events should be mapped to abstract commands (e.g., `focus.next`) rather than direct state mutations.
*   **Performance**: Virtualized rendering is mandatory for large projects to ensure 60fps scrolling and instant focus updates.
*   **Testability**: Every core service (Orchestrator, Navigation, Mutation) must have **Unit Tests** ensuring functional parity during refactoring.
*   **Observability**: Implement a **Structured Logger** that captures Command execution and State transitions for easier debugging of complex interaction bugs.

---

## 2. File View (Diff Viewer)

### User Perspective
*   **Seamless Transition**: Moving from Folder View to File View (via `Enter` or `Space`) should be instant and preserve the "Merge State".
*   **Focus Management**: After selecting a file, the focus should ideally move to the first change/diff block within the file.
*   **Merge Control**: Keyboard shortcuts for accepting/reverting changes must be consistent. **Enter** on a block only works when an action (Accept/Revert) is explicitly selected via `ArrowLeft/Right`. This prevents accidental merges.
*   **Directional Consistency**: Action icons must follow a clear "Data Flow" logic. **Green (`←`)** for Accept (L) and **Red (`→`)** for Revert/Restore (R). Selecting a direction highlights the corresponding icon pair on both blocks in the group.
*   **Linear Focus Scale**: Navigation within a block is linear: `[Accept] <-> [Content] <-> [Revert]`. `ArrowLeft/Right` keys move focus along this scale and stay at the ends (Sticky).
*   **Soft-Exit Focus**: Pressing **Esc** should first reset focus from individual icons to the broad block (Content) before fully exiting to the folder tree.
*   **Consistency**: The "All changes merged!" state must be accurately reflected both in the viewer and the folder tree status icons ('M' -> 'Same').

### Developer Perspective
*   **Viewer Adapters**: Support different viewer types (Unified, Side-by-Side) using a common interface to simplify integration.
*   **Deferred Save**: Changes made in the UI should be buffered and saved in a way that doesn't trigger expensive tree re-scans on every keystroke.
*   **Coordinate Sync**: Scrolling or clicking a diff block should synchronize the internal "active change index" to allow for `Next Change` navigation.

---

## 3. Conflict Analysis & Resolution

| Potential Conflict | Description | Resolution Strategy |
| :--- | :--- | :--- |
| **Global vs Scoped Keys** | Using `ArrowDown` for both tree navigation and diff scrolling. | **Context Manager**: High-priority focus tracking to determine which module handles the event. |
| **Mouse vs Keyboard** | Mouse hover and Keyboard focus fighting for visual attention. | **Visual Layering**: Keyboard focus (Primary, Outlined) vs Mouse Hover (Secondary, Background-only). Mouse interaction does NOT move keyboard focus unless clicked. |
| **State Sync Lag** | Folder tree status updating slowly after a deep file merge. | **Reactive Filtering**: Status update in `treeData` triggers automatic re-filtering of `visibleNodes`. Node disappears instantly if it no longer matches 'changes-only' filter. |
| **Focus Stealing** | Closing a modal or diff viewer returning focus to the wrong element. | **Focus Stack**: Maintain a stack of previously focused elements to restore navigation state accurately. |
| **Virtualization Jumps** | Focus moving to a node that isn't yet rendered by Virtuoso. | **Imperative Scroll**: Synchronize the `focusedPath` state with Virtuoso's `scrollToIndex` hook. |

---

## 4. Design Guidelines for v7
1.  **Don't start coding until the "Command Map" is defined.**
2.  **Every key event must be traceable to a specific Focus Context.**
3.  **The Folder Tree is the "Anchor"; its state must be the most resilient part of the app.**
