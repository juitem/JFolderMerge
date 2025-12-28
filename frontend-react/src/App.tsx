import { useAppLogic } from './hooks/useAppLogic';
import { MainLayout } from './components/Layout/MainLayout';
import { Workspace } from './components/Workspace/Workspace';
import { AppModals } from './components/Modals/AppModals';

function App() {
  console.log("App.tsx: Render Start");
  const logic = useAppLogic();
  console.log("App.tsx: Hook finished", logic);

  if (logic.configError) return <div className="error-banner center-screen">{logic.configError}</div>;
  if (!logic.config && logic.configLoading) return <div className="loading center-screen">Loading Config...</div>;

  const combinedError = logic.configError || logic.compareError;

  return (
    <>
      <MainLayout
        // Header
        onSaveSettings={logic.handleSaveSettings}
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
      >
        <Workspace
          treeData={logic.treeData}
          config={logic.config}
          onSelectNode={logic.setSelectedNode}
          onMerge={logic.handleMerge}
          onDelete={logic.handleDelete}
          searchQuery={logic.searchQuery}
          selectedNode={logic.selectedNode}
          leftPath={logic.leftPath}
          rightPath={logic.rightPath}
          diffMode={logic.diffMode}
          setDiffMode={logic.setDiffMode}
          isExpanded={logic.isExpanded}
          setIsExpanded={logic.setIsExpanded}
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
