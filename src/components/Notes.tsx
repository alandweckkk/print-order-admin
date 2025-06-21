"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, X, Save } from 'lucide-react';

interface NotesProps {
  className?: string;
}

export default function Notes({ className = "" }: NotesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load notes from localStorage on mount
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('admin-notes');
      if (savedNotes) {
        setNotes(savedNotes);
      }
    } catch (error) {
      console.error('Error loading notes from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save notes to localStorage
  const handleSave = () => {
    try {
      localStorage.setItem('admin-notes', notes);
      console.log('✅ Notes saved to localStorage');
      // Optional: Show a brief success indicator
      const button = document.querySelector('[data-save-button]') as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Saved!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving notes to localStorage:', error);
      alert('Failed to save notes');
    }
  };



  return (
    <>
      {/* Notes Button */}
      <Button
        variant="outline"
        size="sm"
        className={`border-gray-300 text-gray-700 hover:bg-gray-50 ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <StickyNote className="h-4 w-4" />
        <span className="ml-1 text-sm">Notes</span>
      </Button>

      {/* Side Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Background overlay */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl transform transition-transform">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Admin Notes</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex flex-col h-full">
              <div className="flex-1 p-4 overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="notes-textarea" className="block text-sm font-medium text-gray-700">
                      Your Notes
                    </label>
                    <Button
                      onClick={handleSave}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-save-button
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                  {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      Loading notes...
                    </div>
                  ) : (
                    <Textarea
                      id="notes-textarea"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Type your notes here..."
                      className="flex-1 resize-none border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-0"
                      rows={20}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 