# Project Status & Handover Documentation

## 1. Project Overview
**Folder Comparison Tool (J-Folder Merge)** is a web-based application for comparing directory structures and file contents. It features a modern, dark-themed UI, split-view file comparison, and integration with external tools.

## 2. Key Implemented Features
### Backend (FastAPI)
- **Directory Comparison**: Recursive comparison using `filecmp` logic.
- **File Operations**: API endpoints for `copy`, `delete`, `save` (content update).
- **History Management**: Stores last 10 comparison paths in `settings/history.json`.
- **External Tooling**: Launches `meld`, `code`, or `opendiff` for selected files.
- **Static Serving**: Serves the frontend application.

### Frontend (Vanilla JS + Modules)
- **Event-Driven Architecture**: Uses `EventBus` to decouple `main.js`, `folderView.js`, and `diffView.js`.
- **UI Components**:
  - **Tree View**: Color-coded file status (Added, Removed, Modified).
  - **Split Diff View**: Side-by-side code comparison.
  - **Input Group**: Integrated Path Input + History + Browse buttons.
- **View Options**:
  - **Default**: Standard split view.
  - **Auto-Expand**: Automatically full-screens the diff view on file selection.
  - **External Tool**: Opens the selected file pair in an external application.
- **History**: Modals to select previously used Left/Right paths.

## 3. System Architecture

### Sequence Diagram: File Selection & Viewing Flow
```mermaid
sequenceDiagram
    autonumber
    
    actor User
    participant FV as FolderView (folderView.js)
    participant EB as EventBus (events.js)
    participant Main as Controller (main.js)
    participant VM as ViewerManager (ViewerManager.js)
    participant DV as DiffViewer (DiffViewer.js)
    participant API as API Client (api.js)
    participant BE as Backend (FastAPI)

    Note over User, FV: User interacts with the Folder Tree

    User->>FV: Click on File Node
    FV->>FV: Identify Paths (Left/Right)
    
    Note over FV, EB: Decoupled via EventBus
    FV->>EB: emit(EVENTS.FILE_SELECTED, {left, right, relPath})
    
    EB->>Main: Call Listener (async)
    
    activate Main
        Note right of Main: UI Synchronization
        Main->>Main: applyAutoExpandState()
        note right of Main: Toggles .expanded/.collapsed<br/>based on state.viewOpts
        
        Main->>Main: Update Header (Filename)
        
        Note right of Main: Viewer Selection
        Main->>VM: getViewerForFile(relPath)
        VM-->>Main: Return Viewer Instance (e.g., DiffViewer)
        
        Main->>DV: render(container, leftPath, rightPath, relPath)
        
        activate DV
            DV->>DV: Set state.currentDiffPaths
            
            par Data Fetching (Parallel)
                DV->>API: fetchFileContent(leftPath)
                API->>BE: GET /api/files (param: path)
                BE-->>API: File Content (string)
                API-->>DV: Left Content
                
                DV->>API: fetchFileContent(rightPath)
                API->>BE: GET /api/files
                BE-->>API: File Content
                API-->>DV: Right Content
                
                alt If Mode requires Diff Info
                    DV->>API: fetchDiff(left, right)
                    API->>BE: POST /api/compare/diff
                    BE-->>API: Diff JSON (lines, matches)
                    API-->>DV: Diff Data
                end
            end
            
            DV->>DV: refresh() -> Generate HTML
            DV-->>Main: Render Complete
        deactivate DV
        
        Main->>Main: Unhide Panel
    deactivate Main
```

### Flowchart: User Journey & System Logic
```mermaid
flowchart TD
    %% Nodes
    Start([Start Application])
    InputPaths[Input Left & Right Paths]
    CompareBtn{Click 'Compare'}
    
    subgraph Initialization
        Start --> InputPaths
        InputPaths --> CompareBtn
    end

    subgraph Comparison_Logic [Backend Comparison]
        CompareBtn -->|POST /api/compare| API_Compare[Run compare_folders]
        API_Compare -->|Result JSON| RenderTree[Render Folder Tree]
    end

    subgraph Interaction_Loop [Frontend Interaction]
        RenderTree --> UserAction{User Action}
        
        UserAction -- Expand Folder --> ToggleFolder[Toggle visibility]
        ToggleFolder --> UserAction
        
        UserAction -- Select File --> FileLogic[Emit FILE_SELECTED]
        
        subgraph File_Viewing [File View Logic]
            FileLogic --> UI_Sync[Sync UI State]
            UI_Sync --> AutoExpand{Auto-Expand?}
            
            AutoExpand -- Yes --> DOM_Expand[Add .expanded class\nCollapse Tree]
            AutoExpand -- No --> DOM_Normal[Normal Split View]
            
            DOM_Expand & DOM_Normal --> SelectViewer[ViewerManager.getViewer]
            
            SelectViewer -- Image --> ImageViewer[Render Image]
            SelectViewer -- Text --> DiffViewer[Render Text Diff]
            
            subgraph Diff_Process [Diff Rendering]
                DiffViewer --> FetchContent[Fetch Left/Right Content]
                FetchContent --> ComputeDiff[Compute/Fetch Diff Lines]
                ComputeDiff --> RenderHTML[Render Lines to DOM]
            end
        end
        
        RenderHTML --> ViewAction{View Action}
    end
    
    subgraph View_Actions [Toolbar & Merge]
        ViewAction -- Switch Mode --> ViewMode[Toggle Unified/Split]
        ViewMode --> ReTrigger[Re-emit FILE_SELECTED] --> FileLogic
        
        ViewAction -- Click Merge --> MergeLogic[Merge Content]
        MergeLogic --> API_Save[POST /api/save-file]
        API_Save --> Refresh[Refresh Tree & View]
        Refresh --> RenderTree
    end
```

## 4. Current File Structure
```
FolderComp/
├── backend/
│   ├── main.py        # FastAPI Entry Point
│   ├── models.py      # Pydantic Models
│   ├── core/
│   │   ├── comparator.py # Directory Logic
│   │   └── differ.py     # File Diff Logic
│   └── routers/       # (Prepared) Route Separation
├── frontend/
│   ├── index.html     
│   ├── style.css      
│   └── js/
│       ├── main.js       # Controller
│       ├── api.js        # API Client
│       ├── state.js      # Global Store
│       ├── events.js     # Event Bus
│       ├── folderView.js # Tree View Logic
│       ├── browseModal.js
│       └── viewers/      # Pluggable Viewers
│           ├── ViewerManager.js
│           ├── DiffViewer.js
│           └── ImageViewer.js
└── settings/
    ├── history.json
    └── config.json
```

## 5. Next Steps (Recommended)
1.  **Refactoring**: Continue moving logic to Class-based components (as per `refactoring_plan.md`).
2.  **Testing**: Add unit tests for backend `compare` logic and frontend `EventBus`.
