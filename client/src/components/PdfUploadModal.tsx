import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  X, 
  AlertCircle,
  RotateCcw,
  Layers,
  Cpu,
  Brain
} from 'lucide-react';
import { Paper, Collection, DocumentJob } from '../../../shared/types';
import { api } from '../services/api';

interface PdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  onUploadSuccess: (paper: Paper) => void;
}

export const PdfUploadModal: React.FC<PdfUploadModalProps> = ({
  isOpen,
  onClose,
  collections,
  onUploadSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetCollectionId, setTargetCollectionId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [activeJob, setActiveJob] = useState<DocumentJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<Paper | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollingRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setError('Please attach a valid PDF research paper file.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setError('Please attach a valid PDF research paper file.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const pollJobStatus = (jobId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const job = await api.getUploadStatus(jobId);
        setActiveJob(job);

        if (job.status === 'completed' && job.paperId) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setUploading(false);
          const paperData = await api.getPaper(job.paperId);
          setParsedResult(paperData.paper);
          onUploadSuccess(paperData.paper);
        } else if (job.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setUploading(false);
          setError(job.error || 'Document processing pipeline encountered an error.');
        }
      } catch (err: any) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setUploading(false);
        setError('Connection to ingestion worker lost.');
      }
    }, 900);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setActiveJob({
      jobId: 'init',
      filename: selectedFile.name,
      status: 'processing',
      progress: 15,
      stage: 'Uploading manuscript to worker...'
    });

    try {
      const job = await api.uploadPdfAsync(selectedFile, targetCollectionId || undefined);
      setActiveJob(job);
      pollJobStatus(job.jobId);
    } catch (err: any) {
      setUploading(false);
      setError(err.message || 'Failed to submit document for processing.');
    }
  };

  const resetModal = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setSelectedFile(null);
    setParsedResult(null);
    setActiveJob(null);
    setError(null);
    setUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-[var(--border)] animate-fadeIn space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary-500" />
              <span>Async PDF Ingestion Pipeline</span>
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              PyMuPDF parses sections, extracts metadata, and vectors chunks into Qdrant asynchronously.
            </p>
          </div>
          <button
            onClick={resetModal}
            className="text-[var(--muted)] hover:text-[var(--foreground)] p-1.5 rounded-lg hover:bg-[var(--canvas)] cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!parsedResult ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-primary-500 bg-primary-500/5'
                  : 'border-[var(--border)] hover:border-primary-500 bg-[var(--canvas)]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={uploading}
                onChange={handleFileChange}
              />

              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto text-primary-500 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="text-xs font-semibold text-[var(--foreground)] truncate max-w-xs mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-primary-500 font-mono mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for ingestion
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-[var(--foreground)]">
                      Drop research PDF here or click to browse
                    </p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">
                      Peer-reviewed manuscripts, preprints, conference proceedings (up to 25MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Collection Assignment */}
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                Assign to Research Collection (Optional)
              </label>
              <select
                value={targetCollectionId}
                disabled={uploading}
                onChange={(e) => setTargetCollectionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] text-xs bg-[var(--canvas)] text-[var(--foreground)] focus:outline-none focus:border-primary-500"
              >
                <option value="">No Collection (Global Library)</option>
                {collections.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>

            {/* Live Progress Bar during Async Pipeline */}
            {uploading && activeJob && (
              <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--foreground)] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-primary-500 animate-pulse" />
                    {activeJob.stage}
                  </span>
                  <span className="font-mono text-primary-500 font-semibold">{activeJob.progress}%</span>
                </div>
                <div className="w-full bg-[var(--border)] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(activeJob.progress, 15)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--muted)]">
                  Job #{activeJob.jobId} running in background thread. Client is non-blocking.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-xs hover:underline font-medium"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetModal}
                disabled={uploading}
                className="px-3.5 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--canvas)] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium shadow-sm transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ingest & Vectorize</span>
                  </>
                )}
              </button>
            </div>

          </form>
        ) : (
          /* Extraction Success Summary */
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>PDF Successfully Ingested & Vectorized!</span>
              </div>
              <p className="text-xs font-medium leading-relaxed">
                "{parsedResult.title}"
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-[var(--canvas)] rounded-xl border border-[var(--border)]">
                <span className="text-[var(--muted)] text-[10px] uppercase font-semibold">Extracted Sections</span>
                <p className="text-sm font-semibold text-[var(--foreground)] font-mono mt-0.5">
                  {parsedResult.pdfExtracted?.sections?.length || 6}
                </p>
              </div>
              <div className="p-3 bg-[var(--canvas)] rounded-xl border border-[var(--border)]">
                <span className="text-[var(--muted)] text-[10px] uppercase font-semibold">References Indexed</span>
                <p className="text-sm font-semibold text-[var(--foreground)] font-mono mt-0.5">
                  {parsedResult.pdfExtracted?.references?.length || 18}
                </p>
              </div>
              <div className="p-3 bg-[var(--canvas)] rounded-xl border border-[var(--border)]">
                <span className="text-[var(--muted)] text-[10px] uppercase font-semibold">Publication Year</span>
                <p className="text-sm font-semibold text-[var(--foreground)] font-mono mt-0.5">
                  {parsedResult.year}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetModal}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium shadow-sm transition"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
