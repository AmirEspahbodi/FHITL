import React, { useState, useRef, useEffect } from 'react';
import { Principle } from '../types';

interface SidebarProps {
  principles: Principle[];
  selectedId: number;
  onSelect: (id: number) => void;
  onRename: (id: number, newName: string) => void;
  onDropRow: (rowId: number, targetPrincipleId: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  principles,
  selectedId,
  onSelect,
  onRename,
  onDropRow
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleClick = (e: React.MouseEvent,YP: number) => {
    if (editingId !== YP) {
      onSelect(YP);
    }
    if (e.detail === 3) {
      const p = principles.find(item => item.id === YP);
      if (p) {
        setEditingId(YP);
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
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    setDragOverId(null);
    const rowId = e.dataTransfer.getData("text/plain");
    if (rowId) {
      // rowId comes from drag event as string, parse to int
      onDropRow(parseInt(rowId, 10), targetId);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Principle Names
        </h2>
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
                ${isActive ? 'bg-slate-50 text-slate-900 border-r-4 border-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
                ${isDragTarget ? 'bg-blue-50 border-blue-400 border-dashed border-2 m-1 rounded-md' : ''}
              `}
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
                <span className="truncate block select-none">{p.label_name}</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
        Triple-click to rename
      </div>
    </aside>
  );
};