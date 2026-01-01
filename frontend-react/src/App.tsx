import { useAppLogic } from './hooks/useAppLogic';
import { MainLayout } from './components/Layout/MainLayout';
import { Workspace } from './components/Workspace/Workspace';
import { AppModals } from './components/Modals/AppModals';

function App() {
  const logic = useAppLogic();

  if (logic.configError) return <div className="error-banner center-screen">{logic.configError}</div>;
  if (!logic.config && logic.configLoading) return <div className="loading center-screen">Loading Config...</div>;

  const combinedError = logic.configError || logic.compareError;

  return (
    <>
      <MainLayout
        // Header
        onSaveSettings={logic.handleSaveSettings}
        onResetSettings={logic.handleResetSettings}
        onOpenAbout={() => logic.setAboutOpen(true)}
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
        error={combinedError}
        // File
        selectedFilePath={logic.selectedNode?.path}
        onToggleFileView={() => logic.setIsExpanded(!logic.isExpanded)}
        isLocked={logic.isLocked}
        setIsLocked={logic.setIsLocked}
        onAdjustWidth={logic.handleAdjustWidth}

        // Stats
        globalStats={logic.globalStats}
        currentFolderStats={logic.currentFolderStats}
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
          leftPanelWidth={logic.leftPanelWidth}

          excludeFolders={logic.excludeFolders}
          setExcludeFolders={logic.setExcludeFolders}
          excludeFiles={logic.excludeFiles}
          setExcludeFiles={logic.setExcludeFiles}

          onBrowse={logic.openBrowse}
          onReload={logic.handleReload}
          onStatsUpdate={logic.updateFileLineStats}
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
      />
    </>
  );
}

export default App;
