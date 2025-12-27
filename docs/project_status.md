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

### Sequence Diagram: Compare & View Flow
```mermaid
sequenceDiagram
    actor User
    participant UI as frontend (main.js)
    participant FV as FolderView
    participant API as API Layer
    participant BE as Backend (main.py)
    participant EXT as External Tool

    User->>UI: Click "Compare"
    UI->>API: POST /api/compare (left, right)
    API->>BE: Run Comparison
    BE-->>API: JSON (diff_summary, structure)
    API-->>UI: Result Data
    UI->>FV: Render Folder Tree
    
    User->>FV: Click File Node
    FV->>FV: Check State (ViewOpts)
    
    alt External Tool Enabled
        FV->>API: POST /api/open-external
        API->>BE: subprocess.Popen(tool)
        BE->>EXT: Launch Application
    else Internal View
        FV->>API: GET /api/diff
        API->>BE: Calculate Diff lines
        BE-->>API: Diff Data
        API-->>FV: Diff JSON
        FV->>UI: Show Diff Panel
        
        opt Auto-Expand Enabled
            FV->>UI: Toggle Fullscreen Class
        end
    end
```

### Flowchart: User Journey
```mermaid
flowchart TD
    Start([Start App]) --> InputPaths
    
    subgraph Path Selection
        InputPaths[Input Left/Right Paths]
        History[Select from History] --> InputPaths
        Browse[Browse Directory] --> InputPaths
    end
    
    InputPaths --> Compare{Click Compare}
    Compare -->|Validation| API_Call[Call /api/compare]
    API_Call --> RenderTree[Render Folder Structure]
    
    RenderTree --> SelectFile[Select File]
    
    SelectFile --> CheckMode{View Mode?}
    
    CheckMode -- External --> LaunchExt[Launch External Tool]
    CheckMode -- Internal --> FetchDiff[Fetch File Diff]
    
    FetchDiff --> RenderDiff[Render Split View]
    
    RenderDiff --> CheckExpand{Auto Expand?}
    CheckExpand -- Yes --> FullScreen[Full Screen Mode]
    CheckExpand -- No --> SplitScreen[Split Panel Mode]
```

## 4. Current File Structure
```
FolderComp/
├── backend/
│   ├── main.py        # FastAPI App & Endpoints
│   ├── models.py      # Pydantic Models (HistoryRequest, etc.)
│   └── differ.py      # (Planned) Diff Logic separation
├── frontend/
│   ├── index.html     # Main UI Layout
│   ├── style.css      # Dark Theme & Layout Styles
│   └── js/
│       ├── main.js       # Entry Point & UI Event Binding
│       ├── api.js        # API Client Wrapper
│       ├── state.js      # Global State Management
│       ├── events.js     # Event Bus (Pub/Sub)
│       ├── folderView.js # Tree Rendering Logic
│       ├── diffView.js   # Diff Rendering Logic
│       ├── modal.js      # Modal Component
│       └── toast.js      # Toast Notifications
└── settings/
    ├── history.json   # Recent Paths Storage
    └── config.json    # Application Config
```

## 5. Next Steps (Recommended)
1.  **Refactoring**: Continue moving logic to Class-based components (as per `refactoring_plan.md`).
2.  **Testing**: Add unit tests for backend `compare` logic and frontend `EventBus`.
3.  **UI Polish**: Further refine the unified button/input look if needed.
