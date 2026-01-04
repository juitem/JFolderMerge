# Architecture Optimization Plan (v7)

Summary of points for more efficient improvement in the **v7 architecture**, rather than just moving existing source code functions.

---

## 1. Dismantling the 'God Hook' (useAppLogic -> Domain Services)
*   **Current Problem**: `useAppLogic.ts` manages settings, file operations, statistics calculation, and modal states all at once. (Approximately 300 lines)
*   **Direction for Improvement**:
    *   **FileActionService**: Separate pure logic such as `deleteFile`, `mergeFile`, etc. (Remove UI hook dependencies)
    *   **StatsEngine**: Separate the logic for calculating A/M/R statistics based on tree data into a separate worker or memoized service to reduce main thread burden.
    *   **NavigationStore**: Manage the current focus state (`focusedPath`) in a dedicated store rather than the global orchestrator to handle it independently from tree rendering.

## 2. Integrating Redundant File Manipulation Logic (DiffViewer -> Mutation Engine)
*   **Current Problem**: `handleLineMerge` and `handleAgentMerge` perform the "Read File -> Split Lines -> Modify -> Join Again -> Save" process independently.
*   **Direction for Improvement**: 
    *   Apply the **Command Pattern** to integrate into a single `ApplyPatchCommand`.
    *   Consolidate block-level, line-level, and file-level modifications through a single engine to reduce the possibility of bugs.

## 3. Declarative Navigation (Switch Case -> Command Map)
*   **Current Problem**: The `switch(e.key)` statement in `FolderTree.tsx`, which reaches 70 lines, requires modifying the component every time a new hotkey is added.
*   **Direction for Improvement**:
    *   The **Input Service** abstracts key inputs into commands (e.g., `cmd.nav.down`).
    *   Components ensure flexibility by registering only what to do when that command arrives.

## 4. State Propagation Optimization (Prop Drilling -> Context Bus)
*   **Current Problem**: Functions like `onMerge` and `onDelete` are passed down through 4 steps: `App -> FolderTree -> VirtualTreeList -> TreeNode`.
*   **Direction for Improvement**:
    *   Use **Scoped Context**: `TreeNode` directly calls commands through a context that wraps the entire tree area. Prevent unnecessary re-rendering of intermediate components.

## 5. Intent-based Action Locking
*   **Current Problem**: Desired merges may occur due to accidental Enter key presses.
*   **Direction for Improvement**: 
    *   **Deterministic Interaction**: Lock the Enter key so it doesn't work in the main text (Content) state.
    *   Fundamentally block human error by executing merge only when the user explicitly selects 'Accept' or 'Revert' intent via `ArrowLeft/Right`.

## 6. Visual Stability of Action Buttons (Action Stability)
*   Utilize CSS Flexbox/Grid to fix the layout so that the X-coordinate of buttons doesn't change even if text length increases. (Increase Repetitive Action efficiency)

## 7. Test-Driven Evolution
*   **Current Problem**: Relying on manual testing makes it difficult to detect side effects during functional changes.
*   **Direction for Improvement**:
    *   **Unit Test First**: Write unit tests using Jest/Vitest first when creating new services to verify compatibility with existing functions.
    *   **Action Logging**: Log every command execution to allow post-analysis of why the viewer didn't open under specific conditions.

---

## 8. Conclusion: "Maintain Functionality, Innovate Structure"
Target **Evolution** rather than simple migration. Once these improvements are applied, the code will be shorter, response speed will be faster, and adding new features will be much easier.
