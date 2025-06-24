"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
  initialNotes: string;
  isSaving: boolean;
}

export default function NotesModal({ isOpen, onClose, onSave, initialNotes, isSaving }: NotesModalProps) {
  const [notesValue, setNotesValue] = useState(initialNotes);

  // Update local state when modal opens with new initial notes
  useEffect(() => {
    if (isOpen) {
      setNotesValue(initialNotes);
    }
  }, [isOpen, initialNotes]);

  const handleSave = () => {
    onSave(notesValue);
  };

  const handleClose = () => {
    setNotesValue(''); // Clear local state
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Notes</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="notes-textarea" className="text-sm font-medium">
              Order Notes
            </label>
            <textarea
              id="notes-textarea"
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Enter your notes..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={6}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSave();
                }
              }}
              autoFocus
            />
            <div className="text-xs text-gray-500">
              Press Cmd/Ctrl + Enter to save quickly
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 