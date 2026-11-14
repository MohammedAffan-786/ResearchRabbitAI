import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Global resilience and crash interceptors
if (typeof window !== 'undefined') {
  console.log(
    '%c ResearchRabbit AI %c Architected & Developed by Mohammed Affan ',
    'background: #4f46e5; color: #ffffff; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
    'background: #1e1b4b; color: #c7d2fe; padding: 4px 8px; border-radius: 0 4px 4px 0;'
  );
  (window as any).__DEVELOPER__ = 'Mohammed Affan';

  window.addEventListener('error', (event) => {
    console.warn('Interception of uncaught error:', event.error || event.message);
    event.preventDefault();
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Interception of unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="ResearchRabbit AI Workspace Recovered">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
