# Architecture Design Visuals (v7)

Documents visualizing the core structure and flow of the v7 architecture.

---

## 1. Class Diagram (Module Structure)
Shows the separation of concerns and dependency relationships between modules.

```mermaid
classDiagram
    class Orchestrator {
        +activeFile: string
        +projectConfig: Config
        +openFile(node)
        +batchAction(paths, type)
        +updateNodeStatus(path, status)
    }

    class CommandRegistry {
        -commands: Map
        +register(id, fn)
        +execute(id, args)
    }

    class ContextService {
        +activeContext: string
        +set(context)
        +get() 
    }

    class TreeModule {
        +visibleNodes: Node[]
        +focusedPath: string
        +moveFocus(delta)
        +toggleExpand(path)
    }

    class FileViewModule {
        +diffBlocks: Block[]
        +loadDiff(path)
        +mergeBlock(id)
    }

    class StatsService {
        +calculateGlobal()
        +calculateFolder(path)
    }

    class MutationService {
        +applyPatch(path, patch)
        +saveFile(path, content)
    }

    Orchestrator --> TreeModule : Controls
    Orchestrator --> FileViewModule : Controls
    Orchestrator --> StatsService : Uses
    Orchestrator --> MutationService : Uses
    
    CommandRegistry <-- TreeModule : Registers
    CommandRegistry <-- FileViewModule : Registers
    
    UI_Input --> CommandRegistry : Dispatches
    CommandRegistry ..> ContextService : Checks
```

---

## 2. Sequence Diagram (Command Flow)
Shows how keyboard input is abstracted and leads to actual actions.

```mermaid
sequenceDiagram
    participant U as User
    participant I as InputService
    participant C as ContextService
    participant R as CommandRegistry
    participant T as TreeModule
    participant O as Orchestrator
    participant V as FileViewer

    U->>I: KeyDown (v)
    I->>C: Get Active Context?
    C-->>I: "any"
    I->>O: Cycle Layout Mode (Folder -> Split -> File)
    O->>O: Decision: Does File exist? (Update Visibility)
    O-->>U: UI Update (Panel Layout Changed)

    U->>I: KeyDown (ArrowDown) in AgentView
    I->>V: navigateBlock(next, smart/block)
    V->>V: Reset FocusZone to 'content'
    V->>V: Calculate Next Hunk (Skip unchanged/gaps)
    V-->>U: Focus + Sync Scroll

    U->>I: KeyDown (ArrowLeft/Right) in AgentView
    I->>V: navigateZone(left/right)
    V->>V: Linear Scale: [Accept] <-> [Content] <-> [Revert] (Sticky Ends)
    V-->>U: UI Update (Synchronized Icon Pair Highlight)

    U->>I: KeyDown (Enter) in AgentView
    I->>V: applyMerge(currentZone)
    V->>V: Check: Is focus on 'Accept' or 'Revert'?
    V->>V: Execute Merge + Restore Focus to Container
    V-->>U: UI Update (Refreshed Content + Regained Focus)
```

---

## 3. Flowchart: File Opening Decision Logic
Policy decision flow of the `Orchestrator` for handling folders and files separately.

```mermaid
graph TD
    Start([Command: cmd.open]) --> GetNode[Get Focused Node]
    GetNode --> IsFile{Is it a File?}
    
    IsFile -- Yes --> LoadFile[Load Diff Data]
    LoadFile --> ShowViewer[Show File Viewer]
    ShowViewer --> FocusViewer[Set Context: 'viewer']
    
    IsFile -- No --> ToggleFolder[Toggle Expand State]
    ToggleFolder --> KeepFocus[Keep Context: 'tree']
    
    FocusViewer --> End([Done])
    KeepFocus --> End
```

---

## 4. State Machine: Viewer Lifecycle
Defines internal state transitions of the viewer and corresponding UI policies.

```mermaid
stateDiagram-v2
    [*] --> Idle: Initial
    Idle --> Loading: cmd.open(Path)
    Loading --> Viewing: API Success
    Loading --> Error: API Failure
    
    Viewing --> Saving: cmd.merge / cmd.save
    Saving --> Viewing: Save Success
    Saving --> Error: Save Failure
    
    Viewing --> Loading: cmd.nav.next (Different File)
    Error --> Loading: cmd.retry
    Viewing --> Idle: cmd.close
    Error --> Idle: cmd.close
```

---

## 5. Detailed Logic: Optimistic Update with Rollback
Logic to hide network delay and provide immediate feedback, with safe recovery on failure.

```mermaid
graph TD
    Trigger[Action: Merge Item] --> LocalUpdate[UI: Set Status to 'same' immediately]
    LocalUpdate --> APICall[Async API Call: mergeFile]
    
    APICall -- Success --> Finalize[Log Success & Keep UI]
    APICall -- Failure --> ShowError[Show Alert: 'Merge Failed']
    ShowError --> Rollback[UI: Revert Status to 'modified']
    Rollback --> LogError[Infrastructure: Log Error & StackTrace]
```

---

## 6. UI Component: Toolbar & Settings Menu Structure

The toolbar consists of three main settings menus to achieve efficient space allocation and logical grouping.

| Menu Category | Key Features & Controls |
| :--- | :--- |
| **App Settings** | Global layout control, panel layout switching, tree width locking, full screen, auto-scroll, **Pane Widths** (numeric input per Split/Unified/Flat). |
| **Folder Options** | Folder tree specific filtering (A/M/R/S), Selection Box exposure mode (Hide/Smart/Show icons), Status Display Mode (TAG/TEXT/BOTH). |
| **File Options** | Viewer specific settings (Line numbers, Word wrap), Merge mode (Unit/Group), Filtering changes per line. |

**Design Principles**:
- **Persistence**: Pane Width is independently saved and restored for each `folderViewMode`.
- **Iconic UX**: Uses icon-based Segmented Controls instead of text switches to save space and increase visual recognition.
- **Robust Toggling**: Ensures one-click operation by applying clear defaults even in the initial state where settings are not defined.

---

## 7. Data Schema: Core Types (Conceptual v7)
Data structures internal to v7, reinforcing the existing `types.ts`.

| Type Name | Property | Description |
| :--- | :--- | :--- |
| **WorkspaceState** | `activeFile` | Currently focused file path (nullable). |
| | `selectionSet` | IDs of multi-selected paths (Set&lt;string&gt;). |
| | `isBusy` | Global loading state (during batch operations, etc.). |
| **EnhancedNode** | `id` | Unique ID based on full path. |
| | `visible` | Visibility based on filtering results. |
| | `meta` | Cache for statistical information like `{ added: n, removed: m }`. |
| **Command** | `id` | Unique identifier for the command (e.g., `tree.expand`). |
| | `handler` | Function to be executed. |
| | `enabled` | Function to determine if it's executable in the current context. |

---

## 8. Batch Action Error Handling Strategy
Handling logic when an error occurs while processing hundreds of files.

1.  **Atomic Attempt**: Try to handle as a transaction on the backend whenever possible.
2.  **Partial Success Tracking**: Collect only the list of failed files and separately inform the user (e.g., "M out of N failed").
3.  **UI Sync**: Keep successful items and rollback only failed items to their original state so the user can retry.

---

## 9. Flowchart: Batch Action Flow
Flow for performing batch processing on multiple files and updating the UI optimally.

```mermaid
graph LR
    Select[Select All Status: Added] --> Gather[Gather Paths]
    Gather --> Confirm{Show Confirm?}
    Confirm -- Yes --> Process[FileMutationService.applyAll]
    Confirm -- No --> Cancel([Cancel Action])
    
    Process --> UpdateUI[Optimistic UI: Set 'same']
    UpdateUI --> Sync[Background API Sync]
    Sync --> RefreshStats[StatsService.recalculate]
    RefreshStats --> End([Batch Complete])
```
