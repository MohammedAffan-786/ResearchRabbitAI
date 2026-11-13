import React from 'react';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';

interface AnalyticsPageProps {
  analyticsData: {
    citationsByYear: Array<{ year: number; citations: number; paperCount: number }>;
    fieldsDistribution: Array<{ field: string; count: number }>;
    impactBreakdown: Array<{ tier: string; count: number }>;
    topAuthors: Array<{ author: string; citations: number; papers: number }>;
    totalPapers: number;
    totalCitations: number;
  };
}

export const Analytics: React.FC<AnalyticsPageProps> = ({ analyticsData }) => {
  return (
    <div className="animate-in fade-in">
      <AnalyticsDashboard analyticsData={analyticsData} />
    </div>
  );
};

export default Analytics;
