/**
 * Utility formatters for scholarly metadata, numbers, and strings
 */

export const formatCitations = (count: number): string => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toLocaleString();
};

export const formatAuthors = (
  authors: Array<{ name: string; authorId?: string }>,
  maxVisible: number = 3
): string => {
  if (!authors || authors.length === 0) return 'Unknown Author';
  const names = authors.map((a) => a.name);
  if (names.length <= maxVisible) {
    return names.join(', ');
  }
  return `${names.slice(0, maxVisible).join(', ')} et al.`;
};

export const formatDoi = (doi?: string | null): string => {
  if (!doi) return '';
  return doi.replace(/^https?:\/\/doi\.org\//i, '').replace(/^doi:/i, '');
};

export const getDoiUrl = (doi?: string | null): string | null => {
  if (!doi) return null;
  const clean = formatDoi(doi);
  return `https://doi.org/${clean}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength).trimEnd() + '…';
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};
