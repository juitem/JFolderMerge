# Application Flowchart (v4)

```mermaid
flowchart TD
    Start([App Start]) --> ConfigLoad[Load Config]
    ConfigLoad --> |Success| InitHooks[Initialize useAppLogic]
    
    subgraph HookInitialization [Hook Orchestration]
        InitHooks --> InitViewState[Init useViewState]
        InitHooks --> InitModal[Init useModalLogic]
        InitHooks --> InitTreeData[Init useTreeData]
    end

    InitHooks --> RenderUI[Render App UI]
    RenderUI --> WaitForInput{User Input?}

    WaitForInput --> |Select Paths| SetPaths[Update lPath/rPath]
    SetPaths --> WaitForInput

    WaitForInput --> |Click Compare| CompareAction[onCompare()]
    
    CompareAction --> |Delegation| TreeDataCompare[useTreeData.compare()]
    TreeDataCompare --> |API Call| BackendCompare[GET /compare]
    BackendCompare --> |Response| UpdateData[Update treeData]
    
    UpdateData --> ReRender[Re-Render FolderTree]
    
    ReRender --> |Props| TreeCol[TreeColumn]
    TreeCol --> |Recursive| TreeNode[TreeNode]
```
