# Refactor v4 Walkthrough

## Overview
This refactoring phase focused on structural improvements to the frontend codebase to enhance maintainability and separate concerns. The primary areas addressed were the `FolderTree` component architecture and the monolithic `useAppLogic` hook.

## 1. Folder Tree Decomposition
The `FolderTree.tsx` file was previously a large component handling recursion, rendering, and logic. It has been decomposed into:

*   **`FolderTree.tsx`**: A lightweight wrapper component. It acts as the public API for the Folder Tree, handling:
    *   State selection wiring.
    *   Keyboard navigation (Ref-based).
    *   Initialization of the `useTreeNavigation` hook.
*   **`TreeColumn.tsx`**: Handles the list rendering logic. It takes a list of nodes and renders them index-by-index. This separates the "list" aspect from the "node" aspect.
*   **`TreeNode.tsx`**: Represents a single file or folder row. It handles:
    *   Indentation.
    *   Icon display (Folder/File).
    *   Click handlers (Selection/Expansion).
    *   Integration of `TreeRowActions`.
*   **`TreeRowActions.tsx`**: Encapsulates the specific action buttons (Trash Left, Merge Left->Right, Merge Right->Left, Trash Right). It ensures consistent layout even when buttons are hidden.

## 2. useAppLogic Hook Decomposition
The `useAppLogic.ts` hook (480+ lines) was responsible for too many responsibilities (View state, Modal state, Config, File System coordination). It has been split into:

*   **`useModalLogic.ts`**: Centralized manager for all modal states:
    *   **Confirm/Alert**: Generic confirmation dialogs.
    *   **Browse**: Folder/File browsing dialogs.
    *   **History**: History selection dialogs.
*   **`useViewState.ts`**: Manages pure UI state variables:
    *   **Panel Widths**: Persistence and adjustment of split-pane widths.
    *   **View Modes**: Split vs Unified, Diff Modes.
    *   **Filters**: Search query and Exclude patterns (View-level).
*   **`useAppLogic.ts`**: Now acts as an **Orchestrator**. It:
    *   Imports `useModalLogic`, `useViewState`, and `useTreeData`.
    *   Manages the "Session State" (Current Left/Right Paths).
    *   Coordinates interactions (e.g., "On Merge Click" -> "Show Confirm Modal" -> "Call FileSystem API").

## 3. Strict Type Imports
We enforced `import type` for TypeScript interfaces to comply with `verbatimModuleSyntax`, ensuring better tree-shaking and cleaner compilation.

## Summary of Benefits
*   **Reduced Complexity**: Individual files are now smaller and focused on a single responsibility.
*   **Testability**: Hooks like `useModalLogic` can be tested in isolation.
*   **Maintainability**: Adding a new view mode or modal doesn't require editing the core logic file.
