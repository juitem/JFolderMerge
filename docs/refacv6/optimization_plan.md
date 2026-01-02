# Architecture Optimization Plan (v6)

현재 소스 코드의 기능을 단순히 옮기는 것이 아니라, **v6 아키텍처에서 더 효율적으로 개선할 지점들**을 정리했습니다.

---

## 1. 'God Hook' 해체 (useAppLogic -> Domain Services)
*   **현재 문제**: `useAppLogic.ts`가 설정, 파일 작업, 통계 계산, 모달 상태를 모두 관리합니다. (약 300라인)
*   **개선 방향**:
    *   **FileActionService**: `deleteFile`, `mergeFile` 등 순수 로직 분리. (UI hook 의존성 제거)
    *   **StatsEngine**: 트리 데이터를 기반으로 A/M/R 통계를 계산하는 로직을 별도 Worker나 Memoized Service로 분리하여 메인 스레드 부담 감소.
    *   **NavigationStore**: 현재의 포커스 상태(`focusedPath`)를 전역 오케스트레이터가 아닌 전용 Store에서 관리하여 트리 렌더링과 독립적으로 처리.

## 2. 중복된 파일 조작 로직 통합 (DiffViewer -> Mutation Engine)
*   **현재 문제**: `handleLineMerge`와 `handleAgentMerge`가 "파일 읽기 -> 줄 나누기 -> 수정 -> 다시 합치기 -> 저장" 과정을 각각 독립적으로 수행합니다.
*   **개선 방향**: 
    *   **Command Pattern**을 적용하여 `ApplyPatchCommand` 하나로 통합.
    *   블록 단위, 라인 단위, 파일 단위 수정이 모두 하나의 엔진을 거치도록 하여 버그 발생 가능성 감소.

## 3. 선언적 네비게이션 (Switch Case -> Command Map)
*   **현재 문제**: `FolderTree.tsx`의 70라인에 달하는 `switch(e.key)` 문은 새로운 단축키를 추가할 때마다 컴포넌트를 수정해야 합니다.
*   **개선 방향**:
    *   **Input Service**가 키 입력을 추상화된 커맨드(예: `cmd.nav.down`)로 변환.
    *   컴포넌트는 해당 커맨드가 도착했을 때 무엇을 할지만 등록(Register)하여 유연성 확보.

## 4. 상태 전파 최적화 (Prop Drilling -> Context Bus)
*   **현재 문제**: `onMerge`, `onDelete` 함수가 `App -> FolderTree -> VirtualTreeList -> TreeNode`까지 4단계를 타고 내려갑니다.
*   **개선 방향**:
    *   **Scoped Context** 사용: 트리 영역 전체를 감싸는 Context를 통해 `TreeNode`가 직접 명령을 호출. 중간 컴포넌트들의 불필요한 리렌더링 방지.

## 5. 불필요한 트리 전체 리로드 제거
*   **현재 문제**: 파일 하나만 머지해도 `handleReload`를 통해 서버에서 전체 트리 데이터를 다시 가져옵니다.
*   **개선 방향**:
    *   **Optimistic UI Update**: 서버 응답을 기다리지 않고 로컬 트리 상태를 즉시 `'same'`으로 변경.
    *   서버와는 백그라운드에서 동기화하여 대기 시간 0(Zero Latency) 목표.

    *   텍스트가 길어지더라도 버튼의 X좌표는 변하지 않도록 CSS Flexbox/Grid를 활용해 레이아웃을 고정합니다.

## 7. 테스트 주도 진화 (Test-Driven Evolution)
*   **현재 문제**: 수동 테스트에 의존하여 기능 변경 시 부작용(Side Effect)을 감지하기 어렵습니다.
*   **개선 방향**:
    *   **Unit Test First**: 새로운 서비스를 만들 때 Jest/Vitest를 이용한 단위 테스트를 먼저 작성하여 기존 기능과의 호환성 검증.
    *   **Action Logging**: 모든 커맨드 실행을 로깅하여, 특정 조건에서 왜 뷰어가 열리지 않았는지 등을 사후 분석 가능하게 구성.

---

## 6. 결론: "기능은 유지하되, 구조는 혁신"
단순 이식(Migration)이 아닌 **진화(Evolution)**를 목표로 합니다. 위 개선안들이 적용되면 코드는 더 짧아지고, 반응 속도는 더 빨라지며, 새로운 기능을 추가하기는 훨씬 쉬워질 것입니다.
