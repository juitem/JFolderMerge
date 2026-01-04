# Key Event Handling Architecture

This document outlines the structure of keyboard event handling in the React frontend application.

## 1. Global Event Listening (`useKeyLogger`)

The application uses a custom hook `useKeyLogger` to monitor global key events for logging and debugging purposes. This hook attempts to log significant key presses but generally does not *capture* or *stop* propagation of events unless configured to do so for specific debugging scenarios.

## 2. Global Shortcuts (`KeybindingService`)

The `KeybindingService` (singleton) registers global event listeners on the `window` object. 

- **Purpose**: Handles application-wide shortcuts that should work regardless of which component is focused (unless stopped by a specific input).
- **Key Bindings**:
    - `Tab`: Toggles focus between the **Folder Tree** and the **Editor/Diff View**. 
    - Note: The service intelligently checks `document.activeElement` to determine the context.

## 3. Component-Level Event Handling

Specific components handle key events when they have focus.

### A. Folder Tree (`FolderTree.tsx`)
- **Container**: The outer `div` of the tree has `tabIndex={0}`, making it focusable.
- **Event Handler**: `onKeyDown` is attached to this container.
- **Keys Handled**:
    - `ArrowUp` / `ArrowDown`: Navigates the selection focus up and down the file list.
    - `ArrowLeft`: Collapses a folder or moves to parent.
    - `ArrowRight`: Expands a folder or moves to first child.
    - `Enter` / `Space`: Opens (Selects) the currently focused file.
- **Focus Management**:
    - **Crucial**: Clicking a file item (`TreeNode`) programmatically calls `containerRef.current.focus()` via the wrapped `onSelect` handler. This ensures that clicking an item immediately transfers keyboard focus to the tree container, allowing subsequent arrow key navigation.

### B. Workspace / Layout (`Workspace.tsx`)
- **Global Shortcuts**:
    - `Cmd+S` / `Ctrl+S`: Listens for save commands on the `window` object to trigger the `save()` method of the currently active editor adapter.
- **Input Fields**:
    - Search and Filter inputs have their own `onKeyDown` handlers (e.g., stopping propagation or handling `Enter`).

### C. Agent View / Diff View
- **Focus**: When the `Tab` key is pressed, the `LayoutService` focuses the `.right-panel` or `.agent-view-container`.
- **Internal Handling**: The editor or diff viewer (e.g., Monaco Editor or custom diff view) manages its own internal key events (like typing, commands) once focused.

## 4. Event Flow & Troubleshooting

### Why Keyboard Navigation might fail
1.  **Focus Loss**: If the `FolderTree` container loses focus (e.g., clicking a button in the toolbar that doesn't return focus), key events will go to the `body` or the button, bypassing the Tree's `onKeyDown` handler.
2.  **Fix**: We explicitly call `folderTreeRef.current?.focus()` after clicking toolbar buttons (Next/Prev/Close) and after clicking tree items to ensure the container reclaims focus.

### Visual Feedback
- **Selected**: The currently *open* file is displayed with a **Blue Background** (`.selected` class).
- **Focused**: The current *keyboard cursor* position is displayed with a **Blue Outline** (`.focused-row` class). 
- These are distinct states: you can move the cursor (outline) without changing the open file (background) until you press `Enter`.

## 5. View-Specific Shortcuts

### A. Folder View
| Shortcut | Target | Action |
| :--- | :--- | :--- |
| **↑ / ↓** | Selection | Move Cursor |
| **← / →** | Folder | Collapse / Expand |
| **Space** | File | Toggle Preview (Open/Close) |
| **Enter** | File | Open & Focus File View |
| **Ctrl + ←** | File | **Merge Right -> Left** (Accept/Copy) |
| **Ctrl + →** | File | **Merge Left -> Right** (Revert/Restore) |

### B. File View (Agent View)
| Shortcut | Target | Action |
| :--- | :--- | :--- |
| **↑ / ↓** | Block | Move Focused Block |
| **Shift + ←** | Block | **Merge Block Right -> Left** (Single Block Only) |
| **Shift + →** | Block | **Merge Block Left -> Right** (Single Block Only) |
| **Alt + ←** | Pair | **Smart Merge Right -> Left** (Replaces Pair) |
| **Alt + →** | Pair | **Smart Merge Left -> Right** (Replaces Pair) |
| **Esc** | View | Return Focus to Folder Tree |


