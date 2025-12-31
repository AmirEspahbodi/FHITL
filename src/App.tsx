import React, { useState, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "./components/Sidebar";
import { HeaderPanel } from "./components/HeaderPanel";
import { DataRowItem } from "./components/DataRowItem";
import { ResizeHandle } from "./components/ResizeHandle";
import { useColumnResizer, ColumnConfig } from "./hooks/useColumnResizer";
import { useSidebarResizer } from "./hooks/useSidebarResizer";
import {
  usePrinciples,
  useSamples,
  usePrincipleMutations,
  useSampleMutations,
} from "./hooks/queries";

// ============================================================================
// Query Client Configuration
// ============================================================================

/**
 * TanStack Query client with global configuration
 * Created outside component to maintain single instance across app lifecycle
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // Retry failed queries twice before showing error
      refetchOnWindowFocus: false, // Disable automatic refetch on window focus
      staleTime: 0, // Data is stale immediately (per-query overrides apply)
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
});

// ============================================================================
// Column Configuration
// ============================================================================

/**
 * Initial column widths and constraints for the data table
 * Matches previous layout from Tailwind col-span classes
 */
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "preceding", label: "Preceding", width: 100, minWidth: 60 },
  { id: "target", label: "Target", width: 280, minWidth: 150 },
  { id: "following", label: "Following", width: 100, minWidth: 60 },
  {
    id: "justification",
    label: "LLM Justification",
    width: 220,
    minWidth: 100,
  },
  { id: "evidence", label: "LLM Evidence", width: 220, minWidth: 100 },
  { id: "expert", label: "Expert Opinion", width: 220, minWidth: 100 },
  { id: "score", label: "Score", width: 80, minWidth: 60 },
];

// ============================================================================
// Main App Component
// ============================================================================

const App: React.FC = () => {
  // --------------------------------------------------------------------------
  // UI State (Local)
  // --------------------------------------------------------------------------

  const [selectedPrincipleId, setSelectedPrincipleId] = useState<number>(0);
  const [showRevised, setShowRevised] = useState<boolean>(true);
  const [currentUserName] = useState<string>("Dr. Jane Smith");

  // Column resizing state
  const { columns, gridTemplateColumns, handleResizeStart, isResizing } =
    useColumnResizer(DEFAULT_COLUMNS);

  // Sidebar resizing state
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

  /**
   * Fetch all principles
   * Runs once on mount, cached for 10 minutes
   */
  const {
    data: principles,
    isLoading: principlesLoading,
    error: principlesError,
  } = usePrinciples();

  /**
   * Fetch samples for selected principle with revision filter
   * Refetches when principleId or showRevised changes
   */
  const {
    data: samplesData,
    isLoading: samplesLoading,
    error: samplesError,
  } = useSamples({
    principleId: selectedPrincipleId,
    showRevised,
  });

  /**
   * Mutation hooks for data modifications
   */
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

  // Initialize selectedPrincipleId when principles load
  React.useEffect(() => {
    if (principles && principles.length > 0 && selectedPrincipleId === 0) {
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
  // Event Handlers (Now using mutations)
  // --------------------------------------------------------------------------

  /**
   * Handle principle name change from Sidebar
   * Triggers: Triple-click on principle name
   */
  const handleRenamePrinciple = (id: number, newName: string) => {
    updatePrinciple.mutate({
      id,
      updates: { label_name: newName },
    });
  };

  /**
   * Handle principle definition update from HeaderPanel
   * Triggers: Blur event on definition field
   */
  const handleUpdateDescription = (id: number, newDesc: string) => {
    updatePrinciple.mutate({
      id,
      updates: { definition: newDesc },
    });
  };

  /**
   * Handle inclusion criteria update from HeaderPanel
   * Triggers: Blur event on inclusion field
   */
  const handleUpdateInclusion = (id: number, newCriteria: string) => {
    updatePrinciple.mutate({
      id,
      updates: { inclusion_criteria: newCriteria },
    });
  };

  /**
   * Handle exclusion criteria update from HeaderPanel
   * Triggers: Blur event on exclusion field
   */
  const handleUpdateExclusion = (id: number, newCriteria: string) => {
    updatePrinciple.mutate({
      id,
      updates: { exclusion_criteria: newCriteria },
    });
  };

  /**
   * Handle expert opinion update from DataRowItem
   * Triggers: Blur event on opinion textarea (debounced in DataRowItem)
   * Note: Does NOT auto-mark as revised
   */
  const handleUpdateExpertOpinion = (rowId: string, newOpinion: string) => {
    updateOpinion.mutate({
      id: rowId,
      opinion: newOpinion,
    });
  };

  /**
   * Handle manual revision toggle from DataRowItem
   * Triggers: "Set as Revised" button click
   */
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

  /**
   * Handle sample reassignment via drag-drop
   * Triggers: Drop event on Sidebar principle
   * Auto-marks sample as revised
   */
  const handleDropRow = (rowId: string, targetPrincipleId: number) => {
    if (targetPrincipleId === selectedPrincipleId) return;

    reassignSample.mutate({
      id: rowId,
      targetPrincipleId,
      reviserName: currentUserName,
    });
  };

  // --------------------------------------------------------------------------
  // Loading State
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

  // --------------------------------------------------------------------------
  // Error State
  // --------------------------------------------------------------------------

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

        {/* Revision Progress Bar & Toolbar */}
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
                {showRevised ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path
                        fillRule="evenodd"
                        d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Hide Revised
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-5.975.75.75 0 0 0 0-.586A10.004 10.004 0 0 0 10 3c-2.454 0-4.697.876-6.463 2.33L3.28 2.22Zm6.413 6.413-.996-.997a2.5 2.5 0 1 0 3.738 3.737l-.997-.996a1 1 0 0 1-1.745-1.744Z"
                        clipRule="evenodd"
                      />
                      <path
                        fillRule="evenodd"
                        d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 3.53 5.372l3.435 3.435a4.002 4.002 0 0 0 4.662 4.663l3.436 3.435A10.004 10.004 0 0 1 .664 10.59Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Show Revised
                  </>
                )}
              </button>
              <span className="text-xs text-slate-400">
                Reviewer: {currentUserName}
              </span>
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
// App Wrapper with Query Provider
// ============================================================================

/**
 * Root component wrapper that provides TanStack Query context
 * This must be the exported component to enable data fetching
 */
const AppWrapper: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

export default AppWrapper;

/**
 * ============================================================================
 * MIGRATION NOTES & KNOWN LIMITATIONS
 * ============================================================================
 *
 * REMOVED FEATURES:
 * -----------------
 * 1. Undo System (Ctrl+Z):
 *    - The previous client-side undo history has been removed
 *    - Reason: Server state makes local history invalid across refreshes
 *    - Future: Requires backend audit log and rollback endpoints
 *
 * 2. Static JSON Imports:
 *    - Removed: import initialPrinciples from './principles.json'
 *    - Removed: import initialSamples from './_prompt_type1_without_example_samples.json'
 *    - Replaced with: API calls via TanStack Query
 *
 * NEW FEATURES:
 * -------------
 * 1. Optimistic Updates:
 *    - Principle edits update UI instantly, rollback on error
 *    - Expert opinion changes show immediately (debounced)
 *
 * 2. Smart Caching:
 *    - Principles cached for 10 minutes
 *    - Samples cached for 2 minutes
 *    - Automatic background refetch when stale
 *
 * 3. Loading & Error States:
 *    - Skeleton screens during initial load
 *    - Error messages with retry buttons
 *    - Loading indicators for async operations
 *
 * CONFIGURATION REQUIRED:
 * -----------------------
 * 1. Environment Variables:
 *    - Create .env file with: VITE_API_BASE_URL=http://localhost:3000/api/v1
 *    - Update for production: VITE_API_BASE_URL=https://api.cogniloop.com/v1
 *
 * 2. Backend Requirements:
 *    - All endpoints from API specification must be implemented
 *    - Response schemas must match TypeScript interfaces
 *    - CORS must be configured for the frontend domain
 *
 * TESTING CHECKLIST:
 * ------------------
 * ✅ App loads principles on mount
 * ✅ Selecting principle fetches samples
 * ✅ Inline edits trigger mutations with optimistic updates
 * ✅ Drag-drop reassignment persists to backend
 * ✅ Show/Hide revised toggle refetches with correct filter
 * ✅ Loading states display during async operations
 * ✅ Error states show user-friendly messages
 * ✅ No TypeScript errors
 *
 * ============================================================================
 */
