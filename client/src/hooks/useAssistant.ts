import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { AskQuestionResponse } from '../../../shared/types';
import { useResearchStore } from '../store/useResearchStore';

export const useAssistant = () => {
  const { showToast } = useResearchStore();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(
    async (
      question: string,
      paperIds: string[],
      mode: string = 'Comprehensive Evidence Review'
    ): Promise<AskQuestionResponse> => {
      setAsking(true);
      setError(null);
      try {
        const res = await api.askQuestion(question, paperIds, mode);
        return res;
      } catch (err: any) {
        const msg = err.message || 'AI Assistant question failed';
        setError(msg);
        showToast(`AI query error: ${msg}`);
        throw err;
      } finally {
        setAsking(false);
      }
    },
    [showToast]
  );

  return {
    ask,
    asking,
    error,
  };
};
