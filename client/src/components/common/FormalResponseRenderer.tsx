import React from 'react';

interface FormalResponseRendererProps {
  text: string;
}

export const FormalResponseRenderer: React.FC<FormalResponseRendererProps> = ({ text }) => {
  if (!text) return null;

  // Split into lines while preserving empty lines for paragraph spacing
  const rawLines = text.split('\n');

  // Helper to parse inline bold segments: **bold text** -> <strong>
  const renderInlineFormatted = (lineText: string): React.ReactNode => {
    // Clean any stray hashes or isolated asterisks
    const cleanedText = lineText.replace(/^#+\s*/, '');
    
    // Split by **bold** delimiters
    const parts = cleanedText.split(/(\*\*[^*]+?\*\*)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        const innerText = part.slice(2, -2).replace(/\*/g, '');
        return (
          <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
            {innerText}
          </strong>
        );
      }
      // Remove any stray unescaped asterisks or hashes from plain text
      const cleanPart = part.replace(/[*#]/g, '');
      return <span key={idx}>{cleanPart}</span>;
    });
  };

  return (
    <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
      {rawLines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // 1. Major Section Headings (e.g., ### Section Title)
        if (trimmed.startsWith('### ')) {
          const headingText = trimmed.replace(/^###\s+/, '').replace(/[*#]/g, '').trim();
          return (
            <div key={idx} className="pt-3 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-3.5 rounded-full bg-indigo-500 inline-block" />
                <span>{headingText}</span>
              </h3>
            </div>
          );
        }

        // 2. Sub-headings (e.g., #### 1. Paper Title)
        if (trimmed.startsWith('#### ') || trimmed.startsWith('## ')) {
          const subHeadingText = trimmed.replace(/^#+\s+/, '').replace(/[*#]/g, '').trim();
          return (
            <div key={idx} className="pt-2 pb-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {subHeadingText}
              </h4>
            </div>
          );
        }

        // 3. Bullet points (e.g., - **Key**: Description or * **Key**: Description)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletBody = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0 opacity-80" />
              <div className="flex-1 leading-relaxed">
                {renderInlineFormatted(bulletBody)}
              </div>
            </div>
          );
        }

        // 4. Numbered list items (e.g., 1. **Key**: Description)
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const itemBody = numberedMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 py-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[10px] shrink-0 border border-indigo-200/50 dark:border-indigo-800/50 mt-0.5">
                {num}
              </span>
              <div className="flex-1 leading-relaxed pt-0.5">
                {renderInlineFormatted(itemBody)}
              </div>
            </div>
          );
        }

        // 5. Standard paragraph line
        return (
          <p key={idx} className="leading-relaxed">
            {renderInlineFormatted(trimmed)}
          </p>
        );
      })}
    </div>
  );
};
