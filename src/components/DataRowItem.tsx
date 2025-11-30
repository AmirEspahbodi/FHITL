import React, { useState, useEffect, useRef } from 'react';
import { DataRow } from '../types';

interface DataRowItemProps {
  row: DataRow;
  onUpdateExpertOpinion: (id: number, opinion: string) => void;
}

export const DataRowItem: React.FC<DataRowItemProps> = ({ row, onUpdateExpertOpinion }) => {
  const [expanded, setExpanded] = useState(false);
  
  // State for Expert Opinion editing
  const [isEditingOpinion, setIsEditingOpinion] = useState(false);
  const [opinionText, setOpinionText] = useState(row.expert_opinion);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync opinion text when row data updates from parent
  useEffect(() => {
    setOpinionText(row.expert_opinion);
  }, [row.expert_opinion]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditingOpinion && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditingOpinion]);

  const handleDragStart = (e: React.DragEvent) => {
    if (!expanded) {
      e.preventDefault();
      return;
    }
    // Convert ID to string for transfer
    e.dataTransfer.setData("text/plain", row.id.toString());
    e.dataTransfer.effectAllowed = "move";
    
    const el = e.currentTarget as HTMLElement;
    el.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.classList.remove('opacity-50');
  };

  const toggleExpand = () => setExpanded(!expanded);

  // Expert Opinion Handlers
  const handleSaveOpinion = () => {
    setIsEditingOpinion(false);
    if (opinionText !== row.expert_opinion) {
      onUpdateExpertOpinion(row.id, opinionText);
    }
  };

  const handleOpinionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveOpinion();
    }
  };

  const textCellStyle = `px-4 py-3 text-sm text-slate-700KP transition-all duration-300 ${
    expanded ? 'whitespace-normal break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis'
  }`;
  
  const scoreCellStyle = "px-4 py-3 text-sm text-slate-500 font-mono text-right";

  return (
    <div
      draggable={expanded}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={toggleExpand} // Changed from onClick to onDoubleClick
      className={`
        grid grid-cols-12 gap-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer
        ${expanded ? 'bg-white shadow-lg ring-1 ring-slate-200 relative z-10 my-2 rounded-lg' : 'bg-white'}
        ${expanded ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
      `}
    >
      {/* preceding */}
      <div className={`col-span-1 ${textCellStyle} text-slate-500`}>
        <span className="font-semibold text-slate-900 block mb-1 text-xs uppercase tracking-wider opacity-50 md:hidden">Before</span>
        {row.preceding}
      </div>

      {/* target */}
      <div className={`col-span-3 ${textCellStyle} font-medium text-slate-900`}>
        <span className="font-semibold text-slate-900 block mb-1 text-xs uppercase tracking-wider opacity-50 md:hidden">Target</span>
        {row.target}
      </div>

      {/* following */}
      <div className={`col-span-1 ${textCellStyle} text-slate-500`}>
        <span className="font-semibold text-slate-900 block mb-1 text-xs uppercase tracking-wider opacity-50 md:hidden">After</span>
        {row.following}
      </div>

      {/* LLM Justification */}
      <div className={`col-span-2 ${textCellStyle} text-slate-600`}>
        <span className="font-semibold text-slate-900 block mb-1 text-xs uppercase tracking-wider opacity-50 md:hidden">LLM Justification</span>
        {row.llm_justification || <span className="text-slate-300 italic">-</span>}
      </div>

      {/* LLM Evidence Quote */}
      <div className={`col-span-2 ${textCellStyle} text-slate-600 italic`}>
        <span className="font-semibold text-slate-900 block mb-1 text-xs uppercase tracking-wider opacity-50 md:hidden">LLM Evidence</span>
        {row.llm_evidence_quote ? `"${row.llm_evidence_quote}"` : <span className="text-slate-300 italic">-</span>}
      </div>

      {/* Expert Opinion (Editable) */}
      <div 
        className={`col-span-2 ${textCellStyle} text-slate-600 ${expanded ? 'cursor-text hover:bg-blue-50/50 rounded' : ''}`}
        onClick={(e) => {
            // Enable edit on single click if expanded
            if (expanded) {
                e.stopPropagation(); 
                setIsEditingOpinion(true);
            }
        }}
        onDoubleClick={(e) => {
            // Prevent double-click from collapsing the row when interacting with this cell
            if (expanded) {
                e.stopPropagation();
            }
        }}
      >
        <span className="font-semibold text-slate-900 block mb-1 text-xs uppercase tracking-wider opacity-50 md:hidden">Expert Opinion</span>
        
        {expanded && isEditingOpinion ? (
            <textarea
                ref={textareaRef}
                value={opinionText}
                onChange={(e) => setOpinionText(e.target.value)}
                onBlur={handleSaveOpinion}
                onKeyDown={handleOpinionKeyDown}
                onClick={(e) => e.stopPropagation()} // Stop propagation to prevent row interactions
                className="w-full p-2 bg-white border border-blue-400 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-800"
                rows={3}
            />
        ) : (
            row.expert_opinion || <span className="text-slate-300 italic">-</span>
        )}
      </div>

      {/* A Score (Combined) */}
      <div className={`col-span-1 ${scoreCellStyle} font-bold text-slate-600`}>
         {expanded && <div className="text-[10px] text-slate-300 uppercase">Score</div>}
         <span>{row.A1_Score},{row.A2_Score},{row.A3_Score}</span>
      </div>
      
      {expanded && (
        <div className="col-span-12 px-4 pb-2 flex justify-end">
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">
            Drag to reassign | Double-click to collapse
          </span>
        </div>
      )}
    </div>
  );
};