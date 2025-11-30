import React, { useState, useEffect, useRef } from 'react';
import { Principle } from '../types';

interface HeaderPanelProps {
  principle: Principle;
  onUpdateDescription: (id: number, newDesc: string) => void;
  onUpdateInclusion: (id: number, newCriteria: string) => void;
  onUpdateExclusion: (id: number, newCriteria: string) => void;
}

// Internal reusable component for editable fields
const EditableField = ({ 
  label, 
  value, 
  onSave, 
  textClassName,
  labelColor = "text-slate-400"
}: { 
  label?: string; 
  value: string; 
  onSave: (val: string) => void; 
  textClassName?: string;
  labelColor?: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync internal state if prop updates externally (e.g. switching principles)
  useEffect(() => {
    setText(value);
  }, [value]);

  // Focus and auto-resize when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(text);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    onSave(text);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  if (isEditing) {
    return (
      <div className="mb-4">
        {label && <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${labelColor}`}>{label}</h3>}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`w-full bg-white border-2 border-blue-400 rounded-lg p-2 focus:outline-none shadow-md resize-none ${textClassName}`}
          rows={1}
        />
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="mb-4 group cursor-pointer -ml-2 p-2 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-200 transition-all duration-200"
    >
      {label && <h3 className={`text-xs font-bold uppercase tracking-wider mb-1 ${labelColor} group-hover:opacity-100 transition-opacity`}>{label}</h3>}
      <p className={`whitespace-pre-wrap ${textClassName || 'text-slate-600'}`}>
        {value || <span className="text-slate-300 italic">Click to add {label?.toLowerCase()}...</span>}
      </p>
    </div>
  );
};

export const HeaderPanel: React.FC<HeaderPanelProps> = ({ 
  principle, 
  onUpdateDescription,
  onUpdateInclusion,
  onUpdateExclusion
}) => {
  return (
    <div className="bg-white px-8 py-8 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{principle.label_name}</h1>
      </div>

      <div className="space-y-2">
        {/* Definition Field */}
        <EditableField 
          value={principle.definition} 
          onSave={(val) => onUpdateDescription(principle.id, val)}
          textClassName="text-lg text-slate-700 leading-relaxed"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-100">
          {/* Inclusion Criteria */}
          <EditableField 
            label="Inclusion Criteria"
            labelColor="text-green-600"
            value={principle.inclusion_criteria} 
            onSave={(val) => onUpdateInclusion(principle.id, val)}
            textClassName="text-sm text-slate-600"
          />

          {/* Exclusion Criteria */}
          <EditableField 
            label="Exclusion Criteria"
            labelColor="text-red-500"
            value={principle.exclusion_criteria} 
            onSave={(val) => onUpdateExclusion(principle.id, val)}
            textClassName="text-sm text-slate-600"
          />
        </div>
      </div>
    </div>
  );
};