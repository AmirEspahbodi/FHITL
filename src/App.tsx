import React, { useState, useMemo, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "./components/Sidebar";
import { HeaderPanel } from "./components/HeaderPanel";
import { DataRowItem } from "./components/DataRowItem";
import { ResizeHandle } from "./components/ResizeHandle";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminDashboard } from "./components/AdminDashboard"; // Import AdminDashboard
import { useColumnResizer, ColumnConfig } from "./hooks/useColumnResizer";
import { useSidebarResizer } from "./hooks/useSidebarResizer";
import { useAuth } from "./hooks/useAuth";
import { AuthProvider } from "./contexts/AuthContext";
import { setAuthToken, setAuthLogoutCallback } from "./api/client";
import {
  usePrinciples,
  useSamples,
  usePrincipleMutations,
  useSampleMutations,
} from "./hooks/queries";

// ============================================================================
// Query Client Configuration
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ============================================================================
// Column Configuration
// ============================================================================

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "preceding", label: "Preceding", width: 200, minWidth: 60 },
  { id: "target", label: "Target", width: 300, minWidth: 150 },
  { id: "following", label: "Following", width: 200, minWidth: 60 },
  {
    id: "justification",
    label: "LLM Justification",
    width: 280,
    minWidth: 100,
  },
  { id: "evidence", label: "LLM Evidence", width: 300, minWidth: 100 },
  { id: "expert", label: "Expert Opinion", width: 150, minWidth: 100 },
  { id: "score", label: "Score", width: 80, minWidth: 60 },
];

// ============================================================================
// Main App Component (Normal User Dashboard)
// ============================================================================

const App: React.FC = () => {
  // --------------------------------------------------------------------------
  // Authentication Integration
  // --------------------------------------------------------------------------

  const { token, logout, user } = useAuth();

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    setAuthLogoutCallback(logout);
    return () => setAuthLogoutCallback(() => {});
  }, [logout]);

  // --------------------------------------------------------------------------
  // UI State (Local)
  // --------------------------------------------------------------------------

  const [selectedPrincipleId, setSelectedPrincipleId] = useState<string>("");
  const [showRevised, setShowRevised] = useState<boolean>(true);

  // REMOVED: isUsersModalOpen state

  const currentUserName = user?.username || "Unknown User";

  const { columns, gridTemplateColumns, handleResizeStart, isResizing } =
    useColumnResizer(DEFAULT_COLUMNS);

  const {
    sidebarWidth,
    isResizing: isSidebarResizing,
    isCollapsed,
    handleResizeStart: handleSidebarResizeStart,
    handleDoubleClick: handleSidebarDoubleClick,
  } = useSidebarResizer({
    defaultWidth: 256,
    minWidth: 180,
    maxWidth: 480,
    collapsedWidth: 60,
  });

  // --------------------------------------------------------------------------
  // Server State (TanStack Query)
  // --------------------------------------------------------------------------

  const {
    data: principles,
    isLoading: principlesLoading,
    error: principlesError,
  } = usePrinciples();

  const {
    data: samplesData,
    isLoading: samplesLoading,
    error: samplesError,
  } = useSamples({
    principleId: selectedPrincipleId,
    showRevised,
  });

  const { updatePrinciple } = usePrincipleMutations();
  const { updateOpinion, toggleRevision, reassignSample } =
    useSampleMutations();

  // --------------------------------------------------------------------------
  // Derived State
  // --------------------------------------------------------------------------

  const selectedPrinciple = useMemo(
    () =>
      principles?.find((p) => p.id === selectedPrincipleId) || principles?.[0],
    [principles, selectedPrincipleId],
  );

  React.useEffect(() => {
    if (principles && principles.length > 0 && selectedPrincipleId === "") {
      setSelectedPrincipleId(principles[0].id);
    }
  }, [principles, selectedPrincipleId]);

  const samples = samplesData?.samples || [];
  const revisionStats = samplesData?.stats || {
    total: 0,
    revised: 0,
    percentage: 0,
  };

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  const handleRenamePrinciple = (id: string, newName: string) => {
    updatePrinciple.mutate({
      id,
      updates: { label_name: newName },
    });
  };

  const handleUpdateDescription = (id: string, newDesc: string) => {
    updatePrinciple.mutate({
      id,
      updates: { definition: newDesc },
    });
  };

  const handleUpdateInclusion = (id: string, newCriteria: string) => {
    updatePrinciple.mutate({
      id,
      updates: { inclusion_criteria: newCriteria },
    });
  };

  const handleUpdateExclusion = (id: string, newCriteria: string) => {
    updatePrinciple.mutate({
      id,
      updates: { exclusion_criteria: newCriteria },
    });
  };

  const handleUpdateExpertOpinion = (rowId: string, newOpinion: string) => {
    updateOpinion.mutate({
      id: rowId,
      opinion: newOpinion,
    });
  };

  const handleToggleRevision = (
    rowId: string,
    isRevised: boolean,
    reviserName: string,
  ) => {
    toggleRevision.mutate({
      id: rowId,
      isRevised,
      reviserName,
    });
  };

  const handleDropRow = (rowId: string, targetPrincipleId: string) => {
    if (targetPrincipleId === selectedPrincipleId) return;

    reassignSample.mutate({
      id: rowId,
      targetPrincipleId,
      reviserName: currentUserName,
    });
  };

  // --------------------------------------------------------------------------
  // Loading & Error States
  // --------------------------------------------------------------------------

  if (principlesLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg font-medium">
            Loading principles...
          </p>
        </div>
      </div>
    );
  }

  if (principlesError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Error Loading Data
          </h2>
          <p className="text-slate-600 mb-6">
            {principlesError.message || "Failed to load principles"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-lg"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!principles || principles.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="text-slate-400 text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            No Principles Found
          </h2>
          <p className="text-slate-600">
            No annotation principles are configured. Please contact your
            administrator.
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Main Render
  // --------------------------------------------------------------------------

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden text-slate-800 font-sans">
      {/* REMOVED: UserListModal Component */}

      <Sidebar
        principles={principles}
        selectedId={selectedPrincipleId}
        onSelect={setSelectedPrincipleId}
        onRename={handleRenamePrinciple}
        onDropRow={handleDropRow}
        width={sidebarWidth}
        isCollapsed={isCollapsed}
        isResizing={isSidebarResizing}
        onResizeStart={handleSidebarResizeStart}
        onDoubleClick={handleSidebarDoubleClick}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-white shadow-xl shadow-slate-200/50 m-2 ml-0 rounded-l-2xl overflow-hidden border border-slate-200">
        {selectedPrinciple && (
          <HeaderPanel
            principle={selectedPrinciple}
            onUpdateDescription={handleUpdateDescription}
            onUpdateInclusion={handleUpdateInclusion}
            onUpdateExclusion={handleUpdateExclusion}
          />
        )}

        {revisionStats.total > 0 && (
          <div className="px-8 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">
                Review Progress:
              </span>
              <div className="flex items-center gap-2">
                <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500 ease-out"
                    style={{ width: `${revisionStats.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-600">
                  {revisionStats.revised}/{revisionStats.total}
                </span>
                <span className="text-xs text-slate-500">
                  ({revisionStats.percentage}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowRevised(!showRevised)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                  ${
                    showRevised
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm border border-transparent"
                      : "bg-white text-slate-500 border border-slate-300 hover:bg-slate-50 hover:text-slate-700 shadow-sm"
                  }
                `}
              >
                {showRevised ? "Hide Revised" : "Show Revised"}
              </button>

              <div className="flex items-center gap-2">
                {/* REMOVED: Users Button */}

                <span className="text-xs text-slate-500">Logged in as:</span>
                <span className="text-xs font-medium text-slate-700">
                  {currentUserName}
                </span>
                <button
                  onClick={logout}
                  className="ml-2 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  title="Logout"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Samples Table */}
        <div className="flex-1 overflow-y-auto bg-white overflow-x-auto relative">
          {samplesLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading samples...</p>
              </div>
            </div>
          )}

          {samplesError && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center text-red-600">
                <p className="mb-2">Error loading samples</p>
                <p className="text-sm text-slate-500">{samplesError.message}</p>
              </div>
            </div>
          )}

          {!samplesLoading && !samplesError && (
            <>
              {/* Table Header */}
              <div
                className="grid px-4 py-3 bg-slate-50 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-sm bg-opacity-90 min-w-max"
                style={{ gridTemplateColumns }}
              >
                {columns.map((col, index) => (
                  <div
                    key={col.id}
                    className="relative flex items-center px-4 h-full"
                  >
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate select-none">
                      {col.label}
                    </span>
                    <ResizeHandle
                      isResizing={isResizing}
                      onMouseDown={(e) => handleResizeStart(index, e.clientX)}
                    />
                  </div>
                ))}
              </div>

              {/* Table Body */}
              <div className="pb-20 min-w-max">
                {samples.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic">
                    {showRevised
                      ? "No data annotations assigned to this principle."
                      : "No pending annotations. All samples revised!"}
                  </div>
                ) : (
                  samples.map((row) => (
                    <DataRowItem
                      key={row.id}
                      row={row}
                      onUpdateExpertOpinion={handleUpdateExpertOpinion}
                      onToggleRevision={handleToggleRevision}
                      currentUserName={currentUserName}
                      gridTemplateColumns={gridTemplateColumns}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

// ============================================================================
// Layout / Role Routing Logic
// ============================================================================

const MainContent: React.FC = () => {
  const { user } = useAuth();

  // If user is explicitly a superuser, show Admin Dashboard
  if (user?.user_type === "superuser") {
    return <AdminDashboard />;
  }

  // Otherwise (normal user), show standard App
  return <App />;
};

// ============================================================================
// App Wrapper
// ============================================================================

const AppWrapper: React.FC = () => {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ProtectedRoute>
          <MainContent />
        </ProtectedRoute>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default AppWrapper;
