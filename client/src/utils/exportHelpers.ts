import { Paper } from '../../../shared/types';
import { formatAuthors } from './formatters';

export type ExportFormat = 'bibtex' | 'ris' | 'apa' | 'csv' | 'json';

export const exportToBibTeX = (papers: Paper[]): string => {
  return papers
    .map((paper, idx) => {
      const citeKey = (paper.authors[0]?.name.split(' ').pop() || 'Paper') + (paper.year || '2024') + (idx + 1);
      const authors = paper.authors.map((a) => a.name).join(' and ');
      const venue = paper.venue || (paper as any).journal || 'arXiv preprint';
      const url = (paper as any).url || paper.openAccessPdfUrl || '';
      return `@article{${citeKey},
  title = {${paper.title}},
  author = {${authors}},
  year = {${paper.year || ''}},
  journal = {${venue}},
  doi = {${paper.doi || ''}},
  url = {${url}},
  abstract = {${paper.abstract ? paper.abstract.replace(/\n/g, ' ') : ''}}
}`;
    })
    .join('\n\n');
};

export const exportToRIS = (papers: Paper[]): string => {
  return papers
    .map((paper) => {
      const venue = paper.venue || (paper as any).journal || '';
      const url = (paper as any).url || paper.openAccessPdfUrl || '';
      const lines = [
        'TY  - JOUR',
        `TI  - ${paper.title}`,
        ...paper.authors.map((a) => `AU  - ${a.name}`),
        `PY  - ${paper.year || ''}`,
        `JO  - ${venue}`,
        `DO  - ${paper.doi || ''}`,
        `UR  - ${url}`,
        `AB  - ${paper.abstract ? paper.abstract.replace(/\n/g, ' ') : ''}`,
        'ER  -',
      ];
      return lines.join('\n');
    })
    .join('\n\n');
};

export const exportToAPA = (papers: Paper[]): string => {
  return papers
    .map((p) => {
      const auth = formatAuthors(p.authors, 7);
      const yr = p.year ? `(${p.year}).` : '(n.d.).';
      const venue = p.venue ? ` *${p.venue}*.` : '';
      const url = (p as any).url || p.openAccessPdfUrl || '';
      const doi = p.doi ? ` https://doi.org/${p.doi}` : url ? ` ${url}` : '';
      return `${auth} ${yr} ${p.title}.${venue}${doi}`;
    })
    .join('\n\n');
};

export const exportToCSV = (papers: Paper[]): string => {
  const headers = ['ID', 'Title', 'Authors', 'Year', 'Venue', 'CitationCount', 'DOI', 'URL', 'Source'];
  const escapeCsv = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;
  const rows = papers.map((p) => [
    escapeCsv(p.id),
    escapeCsv(p.title),
    escapeCsv(p.authors.map((a) => a.name).join('; ')),
    escapeCsv(p.year),
    escapeCsv(p.venue),
    escapeCsv(p.citationCount),
    escapeCsv(p.doi),
    escapeCsv((p as any).url || p.openAccessPdfUrl || ''),
    escapeCsv(p.source),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
};

export const exportToJSON = (papers: Paper[]): string => {
  return JSON.stringify(papers, null, 2);
};

export const downloadExport = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
