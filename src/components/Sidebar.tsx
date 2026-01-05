import React, { useState, useRef, useEffect } from "react";
import { Principle } from "../types";
import { SidebarResizeHandle } from "./SidebarResizeHandle";

interface SidebarProps {
  principles: Principle[];
  selectedId: string; // Changed from number
  onSelect: (id: string) => void; // Changed from number
  onRename: (id: string, newName: string) => void; // Changed from number
  onDropRow: (rowId: string, targetPrincipleId: string) => void; // Changed from number
  width: number;
  isCollapsed: boolean;
  isResizing: boolean;
  onResizeStart: (startX: number) => void;
  onDoubleClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  principles,
  selectedId,
  onSelect,
  onRename,
  onDropRow,
  width,
  isCollapsed,
  isResizing,
  onResizeStart,
  onDoubleClick,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null); // Changed type
  const [editValue, setEditValue] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null); // Changed type
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleClick = (e: React.MouseEvent, id: string) => {
    // Changed type
    if (editingId !== id) {
      onSelect(id);
    }
    if (e.detail === 3) {
      const p = principles.find((item) => item.id === id);
      if (p) {
        setEditingId(id);
        setEditValue(p.label_name);
      }
    }
  };

  const handleBlur = () => {
    if (editingId !== null) {
      onRename(editingId, editValue);
      setEditingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    // Changed type
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    // Changed type
    e.preventDefault();
    setDragOverId(null);
    const rowId = e.dataTransfer.getData("text/plain");
    if (rowId) {
      onDropRow(rowId, targetId);
    }
  };

  return (
    <aside
      className="bg-white border-r border-slate-200 flex flex-col h-full shrink-0 relative transition-all duration-300"
      style={{ width: `${width}px` }}
    >
      <div
        className={`p-6 border-b border-slate-100 ${isCollapsed ? "px-3" : ""}`}
      >
        <h2
          className={`text-xs font-semibold text-slate-400 uppercase tracking-wider transition-all ${isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100"}`}
        >
          Principle Names
        </h2>
        {isCollapsed && (
          <div className="text-xs font-semibold text-slate-400 text-center">
            ☰
          </div>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto py-2">
        {principles.map((p) => {
          const isActive = selectedId === p.id;
          const isEditing = editingId === p.id;
          const isDragTarget = dragOverId === p.id;

          return (
            <li
              key={p.id}
              onClick={(e) => handleClick(e, p.id)}
              onDragOver={(e) => handleDragOver(e, p.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, p.id)}
              className={`
                group relative px-6 py-3 cursor-pointer text-sm font-medium transition-all duration-200
                ${isActive ? "bg-slate-50 text-slate-900 border-r-4 border-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}
                ${isDragTarget ? "bg-blue-50 border-blue-400 border-dashed border-2 m-1 rounded-md" : ""}
                ${isCollapsed ? "px-3 justify-center" : ""}
              `}
              title={isCollapsed ? p.label_name : undefined}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-white border border-blue-400 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              ) : (
                <span
                  className={`block select-none ${isCollapsed ? "text-center text-xs" : "truncate"}`}
                >
                  {isCollapsed
                    ? p.label_name.substring(0, 2).toUpperCase()
                    : p.label_name}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div
        className={`p-4 border-t border-slate-100 text-xs text-slate-400 text-center transition-all ${isCollapsed ? "opacity-0 h-0 overflow-hidden p-0" : "opacity-100"}`}
      >
        Triple-click to rename
      </div>

      <SidebarResizeHandle
        onMouseDown={(e) => onResizeStart(e.clientX)}
        onDoubleClick={onDoubleClick}
        isResizing={isResizing}
        isCollapsed={isCollapsed}
      />
    </aside>
  );
};
