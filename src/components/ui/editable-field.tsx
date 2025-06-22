"use client";

import { useState } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';

interface EditableFieldProps {
  fieldName: string;
  value: string;
  isEditing: boolean;
  tempValue?: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onTempValueChange: (value: string) => void;
  isSaving?: boolean;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  displayClassName?: string;
  customDisplay?: React.ReactNode; // For custom display content like status with colored dots
}

export function EditableField({
  fieldName,
  value,
  isEditing,
  tempValue = '',
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onTempValueChange,
  isSaving = false,
  placeholder = "No value",
  multiline = false,
  className = "",
  displayClassName = "",
  customDisplay
}: EditableFieldProps) {

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      console.log(`✅ Copied ${fieldName} to clipboard:`, value);
    } catch (err) {
      console.error(`❌ Failed to copy ${fieldName}:`, err);
    }
  };

  if (isEditing) {
    return (
      <div className={`space-y-3 ${className}`}>
        {multiline ? (
          <Textarea
            value={tempValue}
            onChange={(e) => onTempValueChange(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm resize-none"
            rows={multiline ? 4 : 1}
            disabled={isSaving}
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => onTempValueChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSaving}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !multiline) {
                e.preventDefault();
                onSaveEdit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancelEdit();
              }
            }}
          />
        )}
        
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onSaveEdit}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelEdit}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2 group ${className}`}>
      <div 
        className={`flex-1 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 transition-colors ${displayClassName}`}
        onClick={handleCopyToClipboard}
        title="Click to copy"
      >
        {customDisplay ? (
          customDisplay
        ) : value ? (
          multiline ? (
            <pre className="whitespace-pre-wrap text-xs">{value}</pre>
          ) : (
            <span className="text-sm">{value}</span>
          )
        ) : (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onStartEdit}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
        title="Edit field"
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </Button>
    </div>
  );
} 