# Module Specifications & State Definition (v6)

이 리팩토링의 핵심은 각 모듈이 관리하는 데이터(State)와 제공하는 행위(Functions)를 명확히 분리하여 충돌을 방지하는 것입니다.

## 1. Folder View Module (Tree)

| Category | Item Name | Description | Test Status |
| :--- | :--- | :--- | :--- |
| **State** | `treeData` | 정적 트리 구조 (FileNode). | Unit Tested |
| | `visibleNodes` | 필터 및 확장 상태가 적용된 평탄화(Flat)된 리스트. | Unit Tested |
| | `expandedPaths` | 현재 펼쳐져 있는 폴더 경로들의 Set. | Unit Tested |
| | `focusedPath` | 키보드 커서 위치 (Primary Focus, `Derived State`로 -1 방지). | Unit Tested |
| | `selectedPaths` | 다중 선택된 경로들의 Set (Batch 작업용). | Unit Tested |
| | `folderStats` | 각 폴더 노드별 하위 Added/Removed/Modified 요약 (Memoized). | Unit Tested |
| **Functions** | `moveFocus(delta)` | 위/아래 방향 이동 (Wrap-around 지원). | Unit Tested |
| | `toggleExpand(path)` | 폴더 열기/닫기 (스페이스/화살표). | Unit Tested |
| | `navToParent()` | 현재 노드의 부모로 점프 (좌측 화살표). | Unit Tested |
| | `selectNextStatus(status)` | 특정 상태(A/M/R) 노드를 찾아 자동 확장 및 이동. (단축키: `a`, `r`, `c`) | Unit Tested |
| | `selectPrevStatus(status)` | 이전 상태(A/M/R) 노드를 찾아 자동 확장 및 이동. (단축키: `Shift + a, r, c`) | Unit Tested |
| | `quickMerge(path)` | 포커스된 노드에 대해 즉시 머지 실행 (해당하는 경우). | Planned |
| | `scrollToPath()` | Virtuoso imperative scroll로 특정 노드 노출. | Component Test |
| | `toggleHidden(path)` | 특정 파일/폴더 숨기기 (단축키: `Ctrl+H`, `Alt+H`). | Unit Tested |
| | `toggleShowHidden()` | 숨겨진 파일들의 노출 여부 토글 (단축키: `h`). | Unit Tested |

## 2. File View Module (Viewer)

| Category | Item Name | Description | Test Status |
| :--- | :--- | :--- | :--- |
| **State** | `selectedFile` | 현재 열려 있는 원본 파일 정보. | Unit Tested |
| | `diffBlocks` | 계산된 차이점 블록 리스트 및 각각의 머지 상태. | Unit Tested |
| | `activeIndex` | 현재 에디터 내에서 포커스된 차이점 블록의 인덱스. | Unit Tested |
| | `focusZone` | 블록 내 세부 포커스 위치 (`content`, `accept`, `revert`). | Unit Tested |
| | `mergeMode` | 현재 머지 단위 설정 (`group`, `unit`). | Unit Tested |
| | `isDirty` | 저장되지 않은 머지 변경사항이 있는지 여부. | Component Test |
| **Functions** | `loadDiff(node)` | 트리에서 선택된 노드에 대해 Diff 데이터 로드 및 렌더링. | Component Test |
| | `applyMerge(dir)` | 현재 포커스된 블록에 대해 머지 실행 (L->R, R->L). | Unit Tested |
| | `scrollIntoBlock(i)` | 특정 차이점 블록으로 수직 스크롤 이동. | Visual Verified |
| | `applyQuickMerge()` | `Accept` 존에서 `Enter` 시 즉시 `Accept` (L <- R) 실행. `Content` 존에서는 동작하지 않음. | Unit Tested |
| | `navigateZone(dir)` | `ArrowLeft/Right`로 `Accept` <-> `Content` <-> `Revert` 선형 이동 (Sticky). | Unit Tested |
| | `resetFocus()` | `Esc` 시 아이콘 선택에서 `Content` 존으로 복귀 (Soft Exit). | Unit Tested |
| | `saveChanges()` | 변경 사항을 서버에 기록하고 트리 상태 업데이트 트리거. | E2E Tested |

## 3. Input & Command Module

| Category | Item Name | Description | Test Status |
| :--- | :--- | :--- | :--- |
| **State** | `commandMap` | 커맨드 ID와 실제 구현 함수 간의 매핑 테이블. | Unit Tested |
| | `keybindings` | 키 조합(예: `Enter`)과 커맨드 ID 매핑. | Unit Tested |
| | `activeContext` | 현재 활성화된 입력 범위 (예: `tree`, `viewer`, `modal`). | Unit Tested |
| **Functions** | `registerCommand(id, fn)` | 모듈이 자신의 기능을 시스템에 주입(Injection). | Unit Tested |
| | `handleKeyDown(e)` | 이벤트를 가로채서 **Command ID**로 변환. (Interaction Policy 참조) | Unit Tested |
| | `setContext(name)` | 포커스 이동 시 유효한 단축키 범위를 전환. | Unit Tested |

### Interaction Policy (Mapping)
*   **Triggers**: `Enter`, `Double Click` -> `cmd.open`
*   **Triggers**: `Space` -> `cmd.toggle` (Folder) 또는 `cmd.preview` (File)
*   **Triggers**: `Arrow Keys` -> `cmd.nav`
*   **Triggers**: `a`, `r`, `c` -> `cmd.nav.nextStatus` (added, removed, modified)
*   **Triggers**: `Shift + a`, `r`, `c` -> `cmd.nav.prevStatus`
*   **Triggers**: `h` -> `cmd.tree.toggleShowHidden`
*   **Triggers**: `Ctrl+H` / `Alt+H` -> `cmd.tree.hideCurrentPath`
*   **Triggers**: `Esc` (Viewer) -> `cmd.viewer.resetFocus` -> `cmd.viewer.close` (Double Esc)

## 4. App Service (Orchestrator)

| Category | Item Name | Description | Test Status |
| :--- | :--- | :--- | :--- |
| **State** | `projectConfig` | 필터, 제외 파일/폴더 목록, 레이아웃 모드. | Context Test |
| | `globalStats` | 프로젝트 전체의 A/M/R 합계. | Unit Tested |
| | `historyItems` | 최근 비교한 경로 쌍 리스트. | Service Test |
| **Services** | `FileMutationService`| 파일 읽기/수정/저장 로직 통합 관리 (DRY 원칙). | Unit Tested |
| | `StatsService` | 트리 데이터를 기반으로 통계를 실시간 자동 계산. | Unit Tested |
| **Functions** | `runCompare()` | 좌/우 경로에 대해 전체 재검사 및 트리 구성. | Integration Test |
| | `openBrowse(target)` | 폴더 브라우저 모달 열기 (Left/Right/Excludes). | Manual Verified |
| | `updateNodeStatus()` | 뷰어의 변경을 트리 노드와 부모 통계에 즉각 반영. | Unit Tested |

## 5. Layout Module (Resizer)

| Category | Item Name | Description |
| :--- | :--- | :--- |
| **State** | `sidebarWidth` | 폴더 트리 영역의 현재 너비 (px 또는 %). |
| | `isResizing` | 사용자가 경계선을 드래그 중인지 여부. |
| | `layoutMode` | 전체 레이아웃 형태 (Sidebar View, Full Screen 등). |
| **Functions** | `updateWidth(newWidth)`| 드래그 또는 액션에 의해 트리 너비 변경 및 유지. |
| | `switchLayout(mode)` | **'v'** 키를 통한 Folder/Split/File 레이아웃 순환 전환. | Unit Tested |
| | `resetLayout()` | 레이아웃 설정을 기본값으로 복구. |
| | `persistLayout()` | 변경된 너비를 로컬 스토리지 등에 저장하여 재접속 시 유지. |

## 6. Infrastructure Module (Logger & Diagnostics)

| Category | Item Name | Description |
| :--- | :--- | :--- |
| **State** | `logHistory` | 런타임 중에 발생한 주요 이벤트 및 에러 기록 리스트. |
| | `debugLevel` | 로그 상세도 설정 (Info, Debug, Error). |
| **Functions** | `logCommand(cmd)` | 실행된 커맨드와 인자 정보를 기록. |
| | `exportLogs()` | 디버깅을 위해 현재 로그를 파일/텍스트로 추출. |
| | `verifyModule(id)`| 각 모듈의 상태가 정상 범위인지 자가 진단(Sanity Check). |

---

## 7. Module Interaction Map (Data Flow)

1.  **Opening Flow**: `Tree Module` (Select Action) -> `Orchestrator` -> `App State: activeFile = node.path` -> `File View` (Load Data).
2.  **Closing Flow**: `File View` (Esc/Close Action) -> `Orchestrator` -> `App State: activeFile = null` -> `Tree Module` (Restore focus to `selectedFile`. If missing due to filter, move to `Next Logical Item`).
3.  **Status Update Flow**: `File View` (Save/Merge) -> `Orchestrator.updateNodeStatus(path, 'same')` -> `Tree Module` (Update internal `treeData`).
4.  **File Operation Flow**: `Tree/Viewer Module` (Delete/Merge Action) -> `Orchestrator` -> `API Call` -> `Success` -> `Orchestrator.updateNodeStatus`.
5.  **Layout Resize Flow**: `User Drag` -> `Layout Module.updateWidth()` -> `Global State: sidebarWidth` -> `Tree & Viewer Modules` (Resize Components).
6.  **Keyboard Flow**: `User Input` -> `Input Service` (Context Check) -> `Command Registry` -> `Active Module` (Execute Function).
6.  **Update Flow**: `File View` (Merge) -> `Orchestrator` -> `Tree Module` (State: Refresh node status).
