import React, { useState, useEffect, useRef } from "react";
import { Principle } from "../types";

interface HeaderPanelProps {
  principle: Principle;
  onUpdateDescription: (id: string, newDesc: string) => void;
  onUpdateInclusion: (id: string, newCriteria: string) => void;
  onUpdateExclusion: (id: string, newCriteria: string) => void;
}

// Internal reusable component for editable fields
const EditableField = ({
  label,
  value,
  onSave,
  textClassName,
  labelColor = "text-slate-400",
  containerClassName = "",
}: {
  label?: string;
  value: string;
  onSave: (val: string) => void;
  textClassName?: string;
  labelColor?: string;
  containerClassName?: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  // Common styling for label
  const labelElement = label && (
    <h3
      className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${labelColor} transition-opacity select-none`}
    >
      {label}
    </h3>
  );

  if (isEditing) {
    return (
      <div className={`mb-2 ${containerClassName}`}>
        {labelElement}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={`w-full bg-white border border-blue-400 rounded p-1.5 focus:outline-none shadow-sm resize-none ${textClassName}`}
          rows={1}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`mb-2 group cursor-pointer -ml-2 p-1.5 rounded border border-transparent hover:bg-slate-50 hover:border-slate-200 transition-all duration-200 ${containerClassName}`}
    >
      {labelElement}
      <p className={`whitespace-pre-wrap ${textClassName || "text-slate-600"}`}>
        {value || (
          <span className="text-slate-300 italic opacity-50 text-xs">
            Click to add {label?.toLowerCase()}...
          </span>
        )}
      </p>
    </div>
  );
};

export const HeaderPanel: React.FC<HeaderPanelProps> = ({
  principle,
  onUpdateDescription,
  onUpdateInclusion,
  onUpdateExclusion,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-white px-4 py-3 border-b border-slate-200 sticky top-0 z-10 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight truncate flex-1">
          {principle.label_name}
        </h1>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-4 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title={isCollapsed ? "Show Details" : "Hide Details"}
        >
          {isCollapsed ? (
            // Chevron Down Icon (Simple SVG)
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          ) : (
            // Chevron Up Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <EditableField
            value={principle.definition}
            onSave={(val) => onUpdateDescription(principle.id, val)}
            textClassName="text-sm text-slate-600 leading-normal"
            containerClassName="mb-1"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0 mt-2 pt-2 border-t border-slate-100">
            <EditableField
              label="Inclusion Criteria"
              labelColor="text-green-600"
              value={principle.inclusion_criteria}
              onSave={(val) => onUpdateInclusion(principle.id, val)}
              textClassName="text-xs text-slate-500 leading-tight"
              containerClassName="mb-0"
            />

            <EditableField
              label="Exclusion Criteria"
              labelColor="text-red-500"
              value={principle.exclusion_criteria}
              onSave={(val) => onUpdateExclusion(principle.id, val)}
              textClassName="text-xs text-slate-500 leading-tight"
              containerClassName="mb-0"
            />
          </div>
        </div>
      )}
    </div>
  );
};
