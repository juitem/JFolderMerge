# Application Flow Chart

This flowchart illustrates the high-level control flow and user interactions within the J-Folder Merge React Application.

```mermaid
flowchart TD
    Start([User Start]) --> LoadConfig[Load Configuration]
    LoadConfig -->|Fetch /api/config| API_Config{Config Exists?}
    API_Config -- Yes --> SetState[Set App State\n(Filters, Excludes)]
    API_Config -- No --> DefaultState[Set Default State]
    
    SetState & DefaultState --> RenderUI[Render Main UI]
    
    RenderUI --> InputPaths[User Inputs/Browses Paths]
    InputPaths -->|Click Compare| CallCompare[Call /api/compare]
    
    CallCompare --> BackendComp[Backend: Scan & Compare Folders]
    BackendComp -->|Return TreeData| UpdateTree[Update Folder Tree]
    
    UpdateTree --> Interaction{User Action}
    
    Interaction -->|Select File| FetchDiff[Fetch Diff Data\n/api/diff]
    FetchDiff --> RenderDiff[Render Diff View\n(Unified/Side/Combined)]
    
    Interaction -->|Toggle Filters| UpdateLocal[Update Filter State]
    UpdateLocal --> ReRender[Re-render Tree/Diff]
    
    Interaction -->|Tree Merge (Folder/File)| ConfirmModal{Confirm Modal}
    ConfirmModal -- Cancel --> Interaction
    ConfirmModal -- Confirm --> CallCopy[Call /api/copy]
    CallCopy --> BackendCopy[Backend: Recursively Copy & Create Dirs]
    BackendCopy --> CallCompare
    
    Interaction -->|Line Merge (Diff)| CalcNewContent[Calculate New Content]
    CalcNewContent --> CallSave[Call /api/save-file]
    CallSave --> BackendSave[Backend: Save File]
    BackendSave --> FetchDiff
    
    Interaction -->|Save Settings| CallSaveConfig[Call /api/config]
    CallSaveConfig --> ShowToast[Show Success Alert]
    
    ReRender --> Interaction
    RenderDiff --> Interaction
```
