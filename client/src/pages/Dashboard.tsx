import React from 'react';
import { ResearchDashboard } from '../components/ResearchDashboard';
import { Paper } from '../../../shared/types';

interface DashboardPageProps {
  onOpenPaper: (paper: Paper) => void;
  onOpenUpload: () => void;
}

export const Dashboard: React.FC<DashboardPageProps> = ({ onOpenPaper, onOpenUpload }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in">
      <ResearchDashboard onOpenPaper={onOpenPaper} onOpenUpload={onOpenUpload} />
    </div>
  );
};

export default Dashboard;
