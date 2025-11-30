import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { HeaderPanel } from './components/HeaderPanel';
import { DataRowItem } from './components/DataRowItem';
// Import JSON data directly
import initialPrinciples from './principles.json';
import initialSamples from './samples.json';
import { Principle, DataRow } from './types';

// Action type for history
interface HistoryAction {
  rowId: number;
  fromPrincipleId: number;
  toPrincipleId: number;
}

const MAX_HISTORY_SIZE = 50;

const App: React.FC = () => {
  // Global State initialized with JSON data
  const [principles, setPrinciples] = useState<Principle[]>(initialPrinciples);
  const [data, setData] = useState<DataRow[]>(initialSamples);
  const [history, setHistory] = useState<HistoryAction[]>([]);
  
  // Initialize selection with the ID of the first principle (number)
  const [selectedPrincipleId, setSelectedPrincipleId] = useState<number>(initialPrinciples[0]?.id || 0);

  // Derived State
  const selectedPrinciple = useMemo(
    () => principles.find((p) => p.id === selectedPrincipleId) || principles[0],
    [principles, selectedPrincipleId]
  );

  const visibleRows = useMemo(
    // Filter samples based on sample.principle_id == principle.id
    () => data.filter((row) => row.principle_id === selectedPrincipleId),
    [data, selectedPrincipleId]
  );

  // Global Undo Handler (Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        
        setHistory((currentHistory) => {
          if (currentHistory.length === 0) return currentHistory;

          // Get the last action (Top of stack)
          const lastAction = currentHistory[currentHistory.length - 1];
          
          // Revert the data change
          setData((currentData) => 
            currentData.map((row) => {
              if (row.id === lastAction.rowId) {
                return { ...row, principle_id: lastAction.fromPrincipleId };
              }
              return row;
            })
          );

          // Return new history without the last action (Pop)
          return currentHistory.slice(0, -1);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleRenamePrinciple = (id: number, newName: string) => {
    setPrinciples((prev) =>
      prev.map((p) => (p.id === id ? { ...p, label_name: newName } : p))
    );
  };

  const handleUpdateDescription = (id: number, newDesc: string) => {
    setPrinciples((prev) =>
      prev.map((p) => (p.id === id ? { ...p, definition: newDesc } : p))
    );
  };

  const handleUpdateInclusion = (id: number, newCriteria: string) => {
    setPrinciples((prev) =>
      prev.map((p) => (p.id === id ? { ...p, inclusion_criteria: newCriteria } : p))
    );
  };

  const handleUpdateExclusion = (id: number, newCriteria: string) => {
    setPrinciples((prev) =>
      prev.map((p) => (p.id === id ? { ...p, exclusion_criteria: newCriteria } : p))
    );
  };

  // New handler for updating expert opinion on a specific row
  const handleUpdateExpertOpinion = (rowId: number, newOpinion: string) => {
    setData((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return { ...row, expert_opinion: newOpinion };
        }
        return row;
      })
    );
  };

  const handleDropRow = (rowId: number, targetPrincipleId: number) => {
    if (targetPrincipleId === selectedPrincipleId) return;

    // Find current state of the row for history
    const row = data.find(r => r.id === rowId);
    if (row && row.principle_id !== targetPrincipleId) {
      setHistory((prev) => {
        const newAction: HistoryAction = {
          rowId,
          fromPrincipleId: row.principle_id,
          toPrincipleId: targetPrincipleId
        };
        
        const newHistory = [...prev, newAction];
        // Enforce max size (remove from bottom/start if full)
        if (newHistory.length > MAX_HISTORY_SIZE) {
          return newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
        }
        return newHistory;
      });
    }

    setData((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return { ...row, principle_id: targetPrincipleId };
        }
        return row;
      })
    );
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden text-slate-800 font-sans">
      {/* Sidebar Component */}
      <Sidebar
        principles={principles}
        selectedId={selectedPrincipleId}
        onSelect={setSelectedPrincipleId}
        onRename={handleRenamePrinciple}
        onDropRow={handleDropRow}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white shadow-xl shadow-slate-200/50 m-2 ml-0 rounded-l-2xl overflow-hidden border border-slate-200">
        
        {/* Header with Definition */}
        {selectedPrinciple && (
            <HeaderPanel 
                principle={selectedPrinciple} 
                onUpdateDescription={handleUpdateDescription}
                onUpdateInclusion={handleUpdateInclusion}
                onUpdateExclusion={handleUpdateExclusion}
            />
        )}

        {/* Data Table Area */}
        <div className="flex-1 overflow-y-auto bg-white">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-sm bg-opacity-90 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {/* Adjusted Columns for new data */}
            <div className="col-span-1">Preceding</div>
            <div className="col-span-3">Target</div>
            <div className="col-span-1">Following</div>
            
            <div className="col-span-2">LLM Justification</div>
            <div className="col-span-2">LLM Evidence</div>
            <div className="col-span-2">Expert Opinion</div>

            <div className="col-span-1 text-right">A_Score</div>
          </div>

          {/* Data Rows */}
          <div className="pb-20">
            {visibleRows.length === 0 ? (
               <div className="p-12 text-center text-slate-400 italic">
                 No data annotations assigned to this principle.
               </div>
            ) : (
              visibleRows.map((row) => (
                <DataRowItem 
                  key={row.id} 
                  row={row} 
                  onUpdateExpertOpinion={handleUpdateExpertOpinion}
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