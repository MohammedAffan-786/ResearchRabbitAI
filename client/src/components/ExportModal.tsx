import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  X
} from 'lucide-react';
import { Paper } from '../../../shared/types';
import { api } from '../services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPaperIds: string[];
  allPapers: Paper[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  selectedPaperIds,
  allPapers
}) => {
  const [activeFormat, setActiveFormat] = useState<'bibtex' | 'ris' | 'apa' | 'mla' | 'ieee' | 'chicago' | 'harvard'>('bibtex');
  const [exportContent, setExportContent] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Target papers to export: selected basket, or all papers if none selected
  const targetIds = selectedPaperIds.length > 0 ? selectedPaperIds : allPapers.map(p => p.id);

  useEffect(() => {
    if (!isOpen) return;

    const fetchExport = async () => {
      setLoading(true);
      try {
        if (activeFormat === 'bibtex') {
          const text = await api.exportCitations(targetIds, 'bibtex');
          setExportContent(text);
        } else if (activeFormat === 'ris') {
          const text = await api.exportCitations(targetIds, 'ris');
          setExportContent(text);
        } else {
          const res = await api.exportCitations(targetIds, 'text', activeFormat);
          if (res.citations) {
            setExportContent(res.citations.join('\n\n'));
          }
        }
      } catch (err) {
        setExportContent('Failed to generate export format.');
      } finally {
        setLoading(false);
      }
    };

    fetchExport();
  }, [isOpen, activeFormat, selectedPaperIds, allPapers]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeFormat === 'bibtex' ? 'bib' : activeFormat === 'ris' ? 'ris' : 'txt';
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `references_${activeFormat}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090c12]/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#171c28] rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl border border-slate-200/80 dark:border-white/10 animate-in fade-in space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-500" />
              <span>Export Citations & References</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Exporting <strong className="text-slate-800 dark:text-slate-200">{targetIds.length}</strong> {selectedPaperIds.length > 0 ? 'selected' : 'library'} paper(s) for LaTeX, Zotero, or manuscript drafting.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#222938] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-[#141824] rounded-lg overflow-x-auto border border-slate-200/60 dark:border-white/10">
          {[
            { id: 'bibtex', label: 'BibTeX (.bib)' },
            { id: 'ris', label: 'RIS (Zotero/EndNote)' },
            { id: 'apa', label: 'APA 7th' },
            { id: 'mla', label: 'MLA 9th' },
            { id: 'ieee', label: 'IEEE' },
            { id: 'chicago', label: 'Chicago' },
            { id: 'harvard', label: 'Harvard' }
          ].map(fmt => (
            <button
              key={fmt.id}
              onClick={() => setActiveFormat(fmt.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeFormat === fmt.id
                  ? 'bg-white dark:bg-[#1c2230] text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            readOnly
            value={loading ? 'Generating formatted citations...' : exportContent}
            rows={10}
            className="w-full p-3.5 rounded-xl bg-[#121620] text-indigo-300 font-mono text-xs leading-relaxed focus:outline-none border border-slate-200 dark:border-white/10 select-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-400">
            {targetIds.length} citations generated
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#222938] hover:bg-slate-50 dark:hover:bg-[#2b3548] text-slate-700 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
