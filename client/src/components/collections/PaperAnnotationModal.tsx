import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Edit3 } from 'lucide-react';
import { Paper } from '../../../../shared/types';

interface PaperAnnotationModalProps {
  paper: Paper | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes: (paperId: string, notes: string) => Promise<void>;
}

export const PaperAnnotationModal: React.FC<PaperAnnotationModalProps> = ({
  paper,
  isOpen,
  onClose,
  onSaveNotes,
}) => {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (paper) {
      setNotes(paper.userNotes || '');
    }
  }, [paper]);

  if (!paper) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveNotes(paper.id, notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Research Notes & Annotations</span>
        </div>
      }
      description={`Paper: "${paper.title}"`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Personal Critical Appraisal & Synthesis Notes
          </label>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record methodology strengths, statistical limitations, key equations, or follow-up citations..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" isLoading={saving} onClick={handleSave}>
            Save Notes
          </Button>
        </div>
      </div>
    </Modal>
  );
};
