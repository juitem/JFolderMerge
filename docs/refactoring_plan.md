# Refactoring Plan: Improving Maintainability

The current codebase has grown organically. While modular (ES Modules), the dependencies between modules (e.g., `diffView` importing `folderView`) and the large rendering functions (`buildDualNode`, `refreshDiffView`) make maintenance harder.

Here is a proposal to refactor the frontend for better scalability and maintainability.

## 1. Event-Driven Architecture (Event Bus)
**Problem**: Logic is tightly coupled. `diffView.js` directly calls `folderView.updateFileStatus()`. `main.js` contains many event listeners glued together.
**Solution**: Introduce a lightweight **Event Bus**.
- Modules **emit** events (e.g., `FILE_MERGED`, `FILTER_CHANGED`, `FOLDER_SELECTED`).
- Modules **subscribe** to events they care about.
- **Benefit**: `diffView.js` doesn't need to know `folderView.js` exists. It just emits `FILE_MERGED`.

```javascript
// events.js (New)
export const EventBus = {
### 1. Event-Driven Architecture [DONE]
- **Goal**: Decouple `folderView.js`, `diffView.js`, and `main.js`.
- **Action**: Implement `EventBus` class.
  - Events: `FILE_SELECTED`, `COMPARISON_STARTED`, `VIEW_MODE_CHANGED`.
- **Status**: Implemented `events.js` and wired up `FILE_MERGED` events.

### 2. Component-Based UI [PENDING]state management.
**Solution**: Encapsulate logic in Classes.
- `FolderTree` class: Handles DOM generation, state (expanded nodes), and filtering internally.
- `DiffViewer` class: Handles diff rendering, line mapping, and merge logic.

```javascript
// FolderTree.js
export class FolderTree {
    constructor(containerLeft, containerRight) { ... }
    render(data) { ... }
    filter(criteria) { ... }
}
```

## 3. Dedicated State Management
**Problem**: `state.js` is a passive object. Changes to state (e.g., `state.folderFilters.added = false`) don't automatically trigger UI updates; we have to manually call `applyFilters()`.
**Solution**: Reactive State or Proxy.
- Wrap `state` in a **Proxy** or use a simple Store pattern.
- When a value changes, automatically emit an event or trigger a render.

## 4. CSS Organization (Variables & Components)
**Problem**: `style.css` is becoming monolithic properly (~900 lines).
**Solution**:
- Group CSS by Component in comments (already partially done).
- Consistent BEM-like naming (e.g., `.tree__item`, `.tree__row`).

---

## Recommended First Step: Event Bus & Decoupling
This yields the highest ROI by breaking circular dependencies and cleaning up `main.js`.

### Plan
1.  Create `frontend/js/events.js`.
2.  Refactor `diffView.js` to Emit `FILE_MERGED` instead of calling `folderView`.
3.  Refactor `folderView.js` to Listen for `FILE_MERGED`.
4.  Refactor `main.js` to coordinate Search/Filter inputs via Events.
