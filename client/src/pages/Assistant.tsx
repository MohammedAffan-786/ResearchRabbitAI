import React from 'react';
import { ChatInterface } from '../components/assistant/ChatInterface';
import { Paper, AskQuestionResponse } from '../../../shared/types';

interface AssistantPageProps {
  papers: Paper[];
  selectedPaperIds: string[];
  onToggleSelectPaper: (paper: Paper) => void;
  onAskQuestion: (question: string, paperIds: string[], mode: string, modelProvider?: string, userApiKey?: string) => Promise<AskQuestionResponse>;
  onGenerateLiteratureReview: (topic: string, paperIds: string[]) => Promise<void>;
  onInspectPaper: (paper: Paper) => void;
}

export const Assistant: React.FC<AssistantPageProps> = (props) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in">
      <ChatInterface {...props} />
    </div>
  );
};

export default Assistant;
