import { useAppLogic } from './hooks/useAppLogic';
import { MainLayout } from './components/Layout/MainLayout';
import { Workspace } from './components/Workspace/Workspace';
import { AppModals } from './components/Modals/AppModals';

function App() {
  const logic = useAppLogic();

  if (logic.configError) return <div className="error-banner center-screen">{logic.configError}</div>;
  if (!logic.config && logic.configLoading) return <div className="loading center-screen">Loading Config...</div>;

  const combinedError = logic.configError || logic.compareError;

  // Help Shortcut (?) moved to useAppLogic.ts

  return (
    <>
      <MainLayout
        // Header
        onSaveSettings={logic.handleSaveSettings}
        onResetSettings={logic.handleResetSettings}
        onOpenAbout={() => logic.setAboutOpen(true)}
        onOpenHelp={() => logic.setHelpOpen(true)}
        // Toolbar
        searchQuery={logic.searchQuery}
        setSearchQuery={logic.setSearchQuery}
        excludeFolders={logic.excludeFolders}
        setExcludeFolders={logic.setExcludeFolders}
        excludeFiles={logic.excludeFiles}
        setExcludeFiles={logic.setExcludeFiles}
        onBrowse={logic.openBrowse}
        onCompare={logic.onCompare}
        compareLoading={logic.compareLoading}
        diffMode={logic.diffMode}
        setDiffMode={logic.setDiffMode}
        // Path Controls
        leftPath={logic.leftPath}
        setLeftPath={logic.setLeftPath}
        rightPath={logic.rightPath}
        setRightPath={logic.setRightPath}
        onHistory={(side) => logic.setHistoryState({ isOpen: true, side })}
        onSwap={logic.handleSwap}
        // Error
        // Error
        error={combinedError}
        // File
        selectedFilePath={logic.selectedNode?.path}
        onToggleFileView={() => logic.setIsExpanded(!logic.isExpanded)}
        isLocked={logic.isLocked}
        setIsLocked={logic.setIsLocked}
        onAdjustWidth={logic.handleAdjustWidth}
        layoutMode={logic.layoutMode}
        setLayoutMode={logic.setLayoutMode}

        // Stats (Line stats remain in Toolbar for now)
        fileLineStats={logic.fileLineStats}
      >
        <Workspace
          treeData={logic.treeData}
          config={logic.config}
          onSelectNode={logic.setSelectedNode}
          onMerge={logic.handleMerge}
          onDelete={logic.handleDelete}
          searchQuery={logic.searchQuery}
          setSearchQuery={logic.setSearchQuery}
          selectedNode={logic.selectedNode}
          leftPath={logic.leftPath}
          rightPath={logic.rightPath}
          diffMode={logic.diffMode}
          setDiffMode={logic.setDiffMode}
          isExpanded={logic.isExpanded}
          setIsExpanded={logic.setIsExpanded}
          isLocked={logic.isLocked}
          setIsLocked={logic.setIsLocked}
          layoutMode={logic.layoutMode}
          leftPanelWidth={logic.leftPanelWidth}

          excludeFolders={logic.excludeFolders}
          setExcludeFolders={logic.setExcludeFolders}
          excludeFiles={logic.excludeFiles}
          setExcludeFiles={logic.setExcludeFiles}

          onBrowse={logic.openBrowse}
          onReload={logic.handleReload}
          onStatsUpdate={logic.updateFileLineStats}
          selectionSet={logic.selectionSet}
          onToggleSelection={logic.toggleSelection}
          onToggleBatchSelection={logic.toggleSelectionBatch}
          hiddenPaths={logic.hiddenPaths}
          toggleHiddenPath={logic.toggleHiddenPath}
          showHidden={logic.showHidden}
          toggleShowHidden={logic.toggleShowHidden}

          // Confirmation
          onShowConfirm={logic.showConfirm}

          // Stats & Selection for StatusBar
          globalStats={logic.globalStats}
          currentFolderStats={logic.currentFolderStats}
          fileLineStats={logic.fileLineStats}
          selectionCount={logic.selectionSet.size}
          onSelectByStatus={logic.selectByStatus}
          onClearSelection={logic.clearSelection}
          onExecuteBatchMerge={logic.executeBatchMerge}
          onExecuteBatchDelete={logic.executeBatchDelete}
        />
      </MainLayout>

      <AppModals
        config={logic.config}
        browseState={logic.browseState}
        setBrowseState={logic.setBrowseState}
        onBrowseSelect={logic.handleBrowseSelect}
        leftPath={logic.leftPath}
        rightPath={logic.rightPath}
        historyState={logic.historyState}
        setHistoryState={logic.setHistoryState}
        onHistorySelect={logic.handleHistorySelect}
        confirmState={logic.confirmState}
        setConfirmState={logic.setConfirmState}
        aboutOpen={logic.aboutOpen}
        setAboutOpen={logic.setAboutOpen}
        helpOpen={logic.helpOpen}
        setHelpOpen={logic.setHelpOpen}
      />
    </>
  );
}

export default App;
