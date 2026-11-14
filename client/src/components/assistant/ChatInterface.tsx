import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  ExternalLink, 
  Layers, 
  SlidersHorizontal, 
  Flame, 
  RotateCcw, 
  Scale, 
  SearchCode,
  Check
} from 'lucide-react';
import { Paper, AskQuestionResponse, CitationItem } from '../../../../shared/types';
import { FormalResponseRenderer } from '../common/FormalResponseRenderer';

interface AiAssistantProps {
  papers: Paper[];
  selectedPaperIds: string[];
  onToggleSelectPaper: (paper: Paper) => void;
  onAskQuestion: (
    question: string,
    paperIds: string[],
    mode: string,
    modelProvider?: string,
    userApiKey?: string
  ) => Promise<AskQuestionResponse>;
  onGenerateLiteratureReview: (topic: string, paperIds: string[]) => Promise<void>;
  onInspectPaper: (paper: Paper) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  citations?: CitationItem[];
  keyPoints?: string[];
  followUps?: string[];
  timestamp: string;
}

export const ChatInterface: React.FC<AiAssistantProps> = ({
  papers,
  selectedPaperIds,
  onToggleSelectPaper,
  onAskQuestion,
  onGenerateLiteratureReview,
  onInspectPaper
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Welcome to the Research Intelligence Assistant. I synthesize evidence across multiple peer-reviewed papers with verified citations. Select papers from the left context panel, choose a synthesis mode, and ask your research question.',
      followUps: [
        'How does self-attention in Transformers compare with recurrent architectures?',
        'What are the core bottlenecks and limitations of large language models?',
        'How does Retrieval-Augmented Generation (RAG) mitigate hallucinations?'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'comprehensive' | 'comparative' | 'methodology' | 'critique'>('comprehensive');
  const [modelProvider, setModelProvider] = useState<'builtin' | 'openai' | 'anthropic' | 'gemini'>(
    () => (localStorage.getItem('rr_user_ai_provider') as any) || 'builtin'
  );
  const [activeCitationModal, setActiveCitationModal] = useState<CitationItem | null>(null);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [reviewTopic, setReviewTopic] = useState('');

  // Target papers currently included in AI context
  const targetPapers = papers.filter(p => selectedPaperIds.includes(p.id));

  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || inputQuestion).trim();
    if (!q || loading) return;

    if (targetPapers.length === 0) {
      alert('Please select at least one paper in the Synthesis Context pane to query.');
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      const apiKey = localStorage.getItem('rr_user_ai_key') || undefined;
      const resp = await onAskQuestion(q, selectedPaperIds, mode, modelProvider, apiKey);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: resp.answer,
        citations: resp.citations,
        keyPoints: resp.synthesisKeyPoints,
        followUps: resp.suggestedFollowUps,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'An error occurred during multi-document synthesis: ' + (err.message || 'Unknown error'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTopic.trim() || targetPapers.length === 0) return;
    setShowReviewPrompt(false);
    await onGenerateLiteratureReview(reviewTopic, selectedPaperIds);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Multi-Paper Context & Synthesis Mode (Elicit / Notion style) */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-4">
          
          {/* Active Context Box */}
          <div className="bg-white dark:bg-[#171c28] rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Synthesis Context</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-semibold text-[11px] border border-indigo-200/50 dark:border-indigo-800/50">
                {targetPapers.length} Active
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Toggle papers to include full-text embeddings in cross-document Q&A.
            </p>

            {/* Papers List with Full Title Display & Zero Truncation */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {papers.map(paper => {
                const isSelected = selectedPaperIds.includes(paper.id);
                return (
                  <div
                    key={paper.id}
                    onClick={() => onToggleSelectPaper(paper)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-slate-100 font-medium shadow-2xs'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs leading-snug break-words whitespace-normal text-slate-900 dark:text-slate-100">
                        {paper.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal break-words whitespace-normal">
                        {paper.year} • {paper.authors && paper.authors.length > 0 ? paper.authors.map(a => a.name).join(', ') : 'Academic Authors'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generate Literature Review Button */}
            <button
              onClick={() => {
                if (targetPapers.length === 0) {
                  alert('Please select at least 1 paper to generate a literature review.');
                  return;
                }
                setReviewTopic(targetPapers[0]?.fieldsOfStudy[0] || 'Foundational Machine Learning Architectures');
                setShowReviewPrompt(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Synthesize Review</span>
            </button>
          </div>

          {/* Strategy Mode Selector */}
          <div className="bg-white dark:bg-[#171c28] rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-2.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
              <span>Synthesis Strategy</span>
            </span>

            <div className="space-y-1">
              {[
                { id: 'comprehensive', label: 'Comprehensive', desc: 'Holistic synthesis with verified citations', icon: Sparkles },
                { id: 'comparative', label: 'Comparative', desc: 'Architectural and benchmark trade-offs', icon: Scale },
                { id: 'methodology', label: 'Methodology', desc: 'Datasets, parameters, metrics, and proofs', icon: SearchCode },
                { id: 'critique', label: 'Critique & Gaps', desc: 'Limitations, biases, and research frontiers', icon: Flame },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    mode === m.id
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 font-medium'
                      : 'bg-slate-50/40 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <p className="font-semibold flex items-center gap-1.5">
                    <m.icon className="w-3 h-3 text-indigo-500" />
                    <span>{m.label}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Perplexity-Style Interactive Conversation */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col h-[750px] bg-white dark:bg-[#171c28] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
          
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#141824] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                🐇
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Research Evidence Assistant</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {targetPapers.length} papers in context • <span className="capitalize font-medium text-indigo-600 dark:text-indigo-400">{mode} mode</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Active AI Model Selector */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <select
                  value={modelProvider}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setModelProvider(val);
                    localStorage.setItem('rr_user_ai_provider', val);
                  }}
                  className="text-[11px] bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="builtin">Builtin Neural Engine</option>
                  <option value="openai">OpenAI (GPT-4o-mini)</option>
                  <option value="anthropic">Claude 3.5 Sonnet</option>
                  <option value="gemini">Gemini 1.5 Flash</option>
                </select>
              </div>

              <button
                onClick={() => setMessages([messages[0]])}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer px-1.5 py-1"
                title="Clear conversation"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 shadow-xs">
                    AI
                  </div>
                )}

                <div className={`max-w-2xl rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'bg-white dark:bg-[#1c2230] border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 shadow-2xs'
                }`}>
                  
                  {/* Prose */}
                  {msg.sender === 'ai' ? (
                    <FormalResponseRenderer text={msg.text} />
                  ) : (
                    <div className="space-y-2 whitespace-pre-line">
                      {msg.text}
                    </div>
                  )}

                  {/* Grounded Citation Badges */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                        <span>Source Grounding ({msg.citations.length} Verified References):</span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {msg.citations.map((cite, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveCitationModal(cite)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer"
                            title="Click to view verified source excerpt"
                          >
                            <span>{cite.citeKey}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Follow-Ups */}
                  {msg.followUps && msg.followUps.length > 0 && (
                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-indigo-500" />
                        <span>Suggested Inquiries:</span>
                      </span>
                      <div className="space-y-1">
                        {msg.followUps.map((fu, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(fu)}
                            className="w-full text-left p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span>{fu}</span>
                            <Sparkles className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 mt-2 text-right">
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold animate-pulse">
                  AI
                </div>
                <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1.5 text-xs font-medium">Synthesizing cross-document evidence...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-[#171c28]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder={
                  targetPapers.length > 0
                    ? `Ask a question across ${targetPapers.length} selected paper(s)...`
                    : 'Select at least 1 paper in the left context pane to ask questions...'
                }
                disabled={targetPapers.length === 0}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#141824] text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />

              <button
                type="submit"
                disabled={loading || !inputQuestion.trim() || targetPapers.length === 0}
                className="flex items-center justify-center px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Citation Verification Dialog */}
      {activeCitationModal && (
        <div className="fixed inset-0 z-50 bg-[#090c12]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#171c28] rounded-2xl p-5 max-w-lg w-full shadow-xl border border-slate-200 dark:border-white/10 animate-in fade-in space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold text-xs border border-indigo-200/50 dark:border-indigo-800/50">
                  {activeCitationModal.citeKey}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Verified Source Grounding
                </span>
              </div>
              <button
                onClick={() => setActiveCitationModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              {activeCitationModal.title}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              {activeCitationModal.authors} ({activeCitationModal.year})
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 leading-relaxed space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Extracted Excerpt:</span>
              </span>
              <p className="italic font-normal">"{activeCitationModal.quoteSnippet}"</p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                Confidence: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{(activeCitationModal.confidence! * 100).toFixed(0)}%</strong>
              </span>

              {papers.find(p => p.id === activeCitationModal.paperId) && (
                <button
                  onClick={() => {
                    const p = papers.find(x => x.id === activeCitationModal.paperId);
                    if (p) onInspectPaper(p);
                    setActiveCitationModal(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  Inspect Paper
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Literature Review Topic Prompt */}
      {showReviewPrompt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in space-y-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Synthesize Literature Review
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generates a structured systematic review across {targetPapers.length} papers including objective, state-of-the-art, debates, gaps, and evidence matrix.
            </p>

            <form onSubmit={handleCreateReview} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Research Topic or Query
                </label>
                <input
                  type="text"
                  required
                  value={reviewTopic}
                  onChange={(e) => setReviewTopic(e.target.value)}
                  placeholder="e.g. Attention Mechanisms and Transformer Scaling"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReviewPrompt(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Synthesize Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export const AiAssistant = ChatInterface;
export default ChatInterface;
