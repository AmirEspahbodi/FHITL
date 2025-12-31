import React, { useState, useMemo, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { HeaderPanel } from "./components/HeaderPanel";
import { DataRowItem } from "./components/DataRowItem";
import { ResizeHandle } from "./components/ResizeHandle";
import { useColumnResizer, ColumnConfig } from "./hooks/useColumnResizer";
import { useSidebarResizer } from "./hooks/useSidebarResizer";
import initialPrinciples from "./principles.json";
import initialSamples from "./_prompt_type1_without_example_samples.json";
import { Principle, DataRow } from "./types";

// Initial Layout Definition (approximate pixels based on previous col-spans)
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

interface HistoryAction {
  rowId: string;
  fromPrincipleId: number;
  toPrincipleId: number;
  wasRevised: boolean;
  reviserName: string | null;
  revisionTimestamp?: string;
}

const MAX_HISTORY_SIZE = 50;

const App: React.FC = () => {
  // 1. Initialize Column State
  const { columns, gridTemplateColumns, handleResizeStart, isResizing } =
    useColumnResizer(DEFAULT_COLUMNS);

  // 2. Initialize Sidebar Resizer
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

  const [principles, setPrinciples] = useState<Principle[]>(initialPrinciples);
  const [data, setData] = useState<DataRow[]>(initialSamples);
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [selectedPrincipleId, setSelectedPrincipleId] = useState<number>(
    initialPrinciples[0]?.id || 0,
  );

  // Toggle State for Revised Rows
  const [showRevised, setShowRevised] = useState<boolean>(true);

  // Mock current user - in production, get from auth context
  const [currentUserName] = useState<string>("Dr. Jane Smith");

  const selectedPrinciple = useMemo(
    () => principles.find((p) => p.id === selectedPrincipleId) || principles[0],
    [principles, selectedPrincipleId],
  );

  // Get all rows for the current principle (for stats)
  const principleRows = useMemo(
    () => data.filter((row) => row.principle_id === selectedPrincipleId),
    [data, selectedPrincipleId],
  );

  // Get rows to display based on toggle state
  const visibleRows = useMemo(
    () => principleRows.filter((row) => (showRevised ? true : !row.isRevised)),
    [principleRows, showRevised],
  );

  // Statistics for revised rows (calculated from all rows in principle to stay accurate)
  const revisionStats = useMemo(() => {
    const total = principleRows.length;
    const revised = principleRows.filter((row) => row.isRevised).length;
    return {
      total,
      revised,
      percentage: total > 0 ? Math.round((revised / total) * 100) : 0,
    };
  }, [principleRows]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        !e.shiftKey
      ) {
        e.preventDefault();
        setHistory((currentHistory) => {
          if (currentHistory.length === 0) return currentHistory;
          const lastAction = currentHistory[currentHistory.length - 1];

          // Restore the row to its previous state
          setData((currentData) =>
            currentData.map((row) => {
              if (row.id === lastAction.rowId) {
                return {
                  ...row,
                  principle_id: lastAction.fromPrincipleId,
                  isRevised: lastAction.wasRevised,
                  reviserName: lastAction.reviserName,
                  revisionTimestamp: lastAction.revisionTimestamp,
                };
              }
              return row;
            }),
          );
          return currentHistory.slice(0, -1);
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleRenamePrinciple = (id: number, newName: string) => {
    setPrinciples((prev) =>
      prev.map((p) => (p.id === id ? { ...p, label_name: newName } : p)),
    );
  };

  const handleUpdateDescription = (id: number, newDesc: string) => {
    setPrinciples((prev) =>
      prev.map((p) => (p.id === id ? { ...p, definition: newDesc } : p)),
    );
  };

  const handleUpdateInclusion = (id: number, newCriteria: string) => {
    setPrinciples((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, inclusion_criteria: newCriteria } : p,
      ),
    );
  };

  const handleUpdateExclusion = (id: number, newCriteria: string) => {
    setPrinciples((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, exclusion_criteria: newCriteria } : p,
      ),
    );
  };

  // Updated: Auto-mark as revised when expert opinion changes
  const handleUpdateExpertOpinion = (rowId: string, newOpinion: string) => {
    setData((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            expert_opinion: newOpinion,
          };
        }
        return row;
      }),
    );
  };

  // Handler for manual revision toggle
  const handleToggleRevision = (
    rowId: string,
    isRevised: boolean,
    reviserName: string,
  ) => {
    setData((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            isRevised,
            reviserName: isRevised ? reviserName : null,
            revisionTimestamp: isRevised ? new Date().toISOString() : undefined,
          };
        }
        return row;
      }),
    );
  };

  // Updated: Auto-mark as revised when principle changes
  const handleDropRow = (rowId: string, targetPrincipleId: number) => {
    if (targetPrincipleId === selectedPrincipleId) return;

    const row = data.find((r) => r.id === rowId);

    if (row && row.principle_id !== targetPrincipleId) {
      // Save to history with current revision state
      setHistory((prev) => {
        const newAction: HistoryAction = {
          rowId,
          fromPrincipleId: row.principle_id,
          toPrincipleId: targetPrincipleId,
          wasRevised: row.isRevised,
          reviserName: row.reviserName,
          revisionTimestamp: row.revisionTimestamp,
        };
        const newHistory = [...prev, newAction];
        if (newHistory.length > MAX_HISTORY_SIZE) {
          return newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
        }
        return newHistory;
      });

      // Update row and mark as revised
      setData((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                principle_id: targetPrincipleId,
                isRevised: true,
                reviserName: currentUserName,
                revisionTimestamp: new Date().toISOString(),
              }
            : r,
        ),
      );
    }
  };

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

            {/* Right Side: Toggle Button + Reviewer Label */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowRevised(!showRevised)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                  ${
                    showRevised
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm border border-transparent" // State B: Shown (Primary Style)
                      : "bg-white text-slate-500 border border-slate-300 hover:bg-slate-50 hover:text-slate-700 shadow-sm" // State A: Hidden (Neutral Style)
                  }
                `}
              >
                {showRevised ? (
                  <>
                    {/* Eye Slash Icon */}
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
                    {/* Eye Icon */}
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

        <div className="flex-1 overflow-y-auto bg-white overflow-x-auto relative">
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

          <div className="pb-20 min-w-max">
            {visibleRows.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">
                {showRevised
                  ? "No data annotations assigned to this principle."
                  : "No pending annotations. All samples revised!"}
              </div>
            ) : (
              visibleRows.map((row) => (
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
        </div>
      </main>
    </div>
  );
};

export default App;
