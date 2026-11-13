import { Paper, LiteratureReview } from '../../../shared/types.js';

export class ExportEngineService {
  /**
   * Generate clean BibTeX key: e.g. vaswani2017attention
   */
  private generateBibKey(paper: Paper): string {
    const firstAuthor = (paper.authors[0]?.name || 'unknown').split(' ').pop()?.toLowerCase().replace(/[^a-z]/g, '') || 'paper';
    const firstWordTitle = paper.title.split(' ')[0]?.toLowerCase().replace(/[^a-z]/g, '') || 'research';
    return `${firstAuthor}${paper.year}${firstWordTitle}`;
  }

  /**
   * Export papers to BibTeX format (.bib)
   */
  public toBibTeX(papers: Paper[]): string {
    return papers.map(p => {
      const key = this.generateBibKey(p);
      const authorsStr = p.authors.map(a => a.name).join(' and ');
      const venueField = p.venue ? `  journal={${p.venue}},\n` : '';
      const doiField = p.doi ? `  doi={${p.doi}},\n` : '';
      const arxivField = p.arxivId ? `  eprint={${p.arxivId}},\n  archivePrefix={arXiv},\n` : '';

      return `@article{${key},\n  title={${p.title}},\n  author={${authorsStr}},\n${venueField}${doiField}${arxivField}  year={${p.year}}\n}`;
    }).join('\n\n');
  }

  /**
   * Export papers to RIS format (.ris) for Zotero/EndNote/Mendeley
   */
  public toRIS(papers: Paper[]): string {
    return papers.map(p => {
      let ris = `TY  - JOUR\n`;
      ris += `TI  - ${p.title}\n`;
      p.authors.forEach(a => {
        ris += `AU  - ${a.name}\n`;
      });
      ris += `PY  - ${p.year}\n`;
      if (p.venue) ris += `JO  - ${p.venue}\n`;
      if (p.doi) ris += `DO  - ${p.doi}\n`;
      if (p.abstract) ris += `AB  - ${p.abstract.replace(/\r?\n/g, ' ')}\n`;
      if (p.openAccessPdfUrl) ris += `UR  - ${p.openAccessPdfUrl}\n`;
      ris += `ER  - \n`;
      return ris;
    }).join('\n');
  }

  /**
   * Format citation in specific academic style (APA, MLA, IEEE, Chicago, Harvard)
   */
  public formatCitation(paper: Paper, style: 'apa' | 'mla' | 'ieee' | 'chicago' | 'harvard' = 'apa'): string {
    const authorNames = paper.authors.map(a => a.name);
    let authorStr = '';

    if (style === 'apa') {
      if (authorNames.length === 1) {
        authorStr = `${authorNames[0]}.`;
      } else if (authorNames.length === 2) {
        authorStr = `${authorNames[0]}, & ${authorNames[1]}.`;
      } else if (authorNames.length > 2) {
        authorStr = `${authorNames[0]} et al.`;
      }
      const venue = paper.venue ? `*${paper.venue}*.` : '';
      const doi = paper.doi ? ` https://doi.org/${paper.doi}` : '';
      return `${authorStr} (${paper.year}). ${paper.title}. ${venue}${doi}`.trim();
    }

    if (style === 'mla') {
      if (authorNames.length === 1) {
        authorStr = `${authorNames[0]}.`;
      } else if (authorNames.length > 1) {
        authorStr = `${authorNames[0]}, et al.`;
      }
      return `${authorStr} "${paper.title}." *${paper.venue || 'Academic Press'}*, ${paper.year}.`.trim();
    }

    if (style === 'ieee') {
      const initialAuthors = authorNames.map(name => {
        const parts = name.split(' ');
        const surname = parts.pop();
        const initials = parts.map(p => p[0] + '.').join(' ');
        return `${initials} ${surname}`;
      }).join(', ');
      return `${initialAuthors}, "${paper.title}," in *${paper.venue || 'Proceedings'}*, ${paper.year}.`;
    }

    if (style === 'chicago') {
      return `${authorNames[0] || 'Author'}, et al. "${paper.title}." *${paper.venue || 'Journal'}* (${paper.year}).`;
    }

    // Default Harvard
    return `${authorNames[0] || 'Author'} (${paper.year}) '${paper.title}', *${paper.venue || 'Academic Publication'}*.`;
  }

  /**
   * Export Literature Review to Markdown
   */
  public reviewToMarkdown(review: LiteratureReview, papers: Paper[]): string {
    let md = `# ${review.title}\n\n`;
    md += `**Date:** ${new Date(review.createdAt).toLocaleDateString()}\n`;
    md += `**Topic:** ${review.topic}\n`;
    md += `**Papers Synthesized:** ${papers.length}\n\n`;

    md += `## Executive Summary\n\n${review.executiveSummary}\n\n`;

    review.sections.forEach(sec => {
      md += `## ${sec.heading}\n\n${sec.content}\n\n`;
    });

    md += `## Evidence Extraction Matrix\n\n`;
    md += `| Paper | Authors | Year | Objective | Methodology | Key Findings | Gaps & Limitations |\n`;
    md += `| :--- | :--- | :---: | :--- | :--- | :--- | :--- |\n`;
    review.synthesisMatrix.forEach(row => {
      md += `| ${row.paperTitle.replace(/\|/g, '')} | ${row.authors} | ${row.year} | ${row.objective.replace(/\|/g, '')} | ${row.methodology.replace(/\|/g, '')} | ${row.keyFindings.replace(/\|/g, '')} | ${row.limitations.replace(/\|/g, '')} |\n`;
    });

    md += `\n## References\n\n`;
    papers.forEach(p => {
      md += `- ${this.formatCitation(p, 'apa')}\n`;
    });

    return md;
  }

  /**
   * Export Synthesis Matrix to CSV
   */
  public synthesisMatrixToCSV(review: LiteratureReview): string {
    const headers = ['Paper Title', 'Authors', 'Year', 'Objective', 'Methodology', 'Dataset or Sample', 'Key Findings', 'Limitations', 'Gaps Identified'];
    const rows = review.synthesisMatrix.map(row => [
      `"${row.paperTitle.replace(/"/g, '""')}"`,
      `"${row.authors.replace(/"/g, '""')}"`,
      row.year,
      `"${row.objective.replace(/"/g, '""')}"`,
      `"${row.methodology.replace(/"/g, '""')}"`,
      `"${row.datasetOrSample.replace(/"/g, '""')}"`,
      `"${row.keyFindings.replace(/"/g, '""')}"`,
      `"${row.limitations.replace(/"/g, '""')}"`,
      `"${row.gapsIdentified.replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const exportEngine = new ExportEngineService();
