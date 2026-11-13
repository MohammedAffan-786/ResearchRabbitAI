import { GraphData, GraphNode, GraphLink, Paper } from '../../../shared/types.js';
import { db } from '../db.js';

export class GraphEngineService {
  /**
   * Assign a cluster group number based on primary field of study
   */
  private getFieldGroup(fields: string[]): number {
    const primary = (fields[0] || '').toLowerCase();
    if (primary.includes('natural language') || primary.includes('nlp')) return 1;
    if (primary.includes('computer vision') || primary.includes('vision')) return 2;
    if (primary.includes('bio') || primary.includes('genetic') || primary.includes('protein')) return 3;
    if (primary.includes('quantum') || primary.includes('physics')) return 4;
    if (primary.includes('reinforcement') || primary.includes('learning')) return 5;
    return 6;
  }

  /**
   * Build a knowledge graph from a list of seed paper IDs or entire active library
   */
  public buildGraph(seedPaperIds?: string[], maxNodes = 50): GraphData {
    const allPapers = db.getPapers();
    const paperMap = new Map<string, Paper>();
    allPapers.forEach(p => paperMap.set(p.id, p));

    // Determine target papers
    let targetPapers: Paper[] = [];
    const seedSet = new Set<string>(seedPaperIds || []);

    if (seedPaperIds && seedPaperIds.length > 0) {
      // Gather seeds + their direct references / connected papers
      seedPaperIds.forEach(id => {
        const p = paperMap.get(id);
        if (p) {
          targetPapers.push(p);
          // Add known references
          (p.references || []).forEach(refId => {
            const refPaper = paperMap.get(refId);
            if (refPaper && !targetPapers.some(tp => tp.id === refPaper.id)) {
              targetPapers.push(refPaper);
            }
          });
        }
      });

      // If we still have room, add related papers based on shared fields of study
      if (targetPapers.length < maxNodes) {
        const activeFields = new Set<string>();
        targetPapers.forEach(p => p.fieldsOfStudy.forEach(f => activeFields.add(f.toLowerCase())));

        for (const p of allPapers) {
          if (!targetPapers.some(tp => tp.id === p.id)) {
            const hasSharedField = p.fieldsOfStudy.some(f => activeFields.has(f.toLowerCase()));
            if (hasSharedField) {
              targetPapers.push(p);
              if (targetPapers.length >= maxNodes) break;
            }
          }
        }
      }
    } else {
      // Use all papers up to maxNodes
      targetPapers = allPapers.slice(0, maxNodes);
    }

    // Build GraphNodes
    const nodes: GraphNode[] = targetPapers.map(p => ({
      id: p.id,
      title: p.title,
      authors: p.authors.map(a => a.name),
      year: p.year,
      citations: p.citationCount,
      fields: p.fieldsOfStudy,
      isSeed: seedSet.has(p.id),
      isUploaded: p.source === 'upload',
      group: this.getFieldGroup(p.fieldsOfStudy)
    }));

    // Build GraphLinks
    const links: GraphLink[] = [];
    const currentIds = new Set(nodes.map(n => n.id));

    for (let i = 0; i < targetPapers.length; i++) {
      const p1 = targetPapers[i];

      // 1. Direct Citation / Reference Links
      if (p1.references) {
        for (const refId of p1.references) {
          if (currentIds.has(refId)) {
            links.push({
              source: p1.id,
              target: refId,
              type: 'cites',
              weight: 2
            });
          }
        }
      }

      // 2. Author Collaboration Links & Semantic/Topic Proximity Links
      for (let j = i + 1; j < targetPapers.length; j++) {
        const p2 = targetPapers[j];

        // Shared authors
        const sharedAuthors = p1.authors.filter(a1 => 
          p2.authors.some(a2 => a2.name.toLowerCase() === a1.name.toLowerCase())
        );
        if (sharedAuthors.length > 0) {
          links.push({
            source: p1.id,
            target: p2.id,
            type: 'author_collaboration',
            weight: 3
          });
          continue;
        }

        // Shared fields of study
        const sharedFields = p1.fieldsOfStudy.filter(f1 => 
          p2.fieldsOfStudy.some(f2 => f2.toLowerCase() === f1.toLowerCase())
        );

        if (sharedFields.length >= 2) {
          links.push({
            source: p1.id,
            target: p2.id,
            type: 'semantic_similarity',
            weight: 1
          });
        }
      }
    }

    return { nodes, links };
  }

  /**
   * Dynamically expand connections for a single paper node
   */
  public expandNode(paperId: string): { newNodes: GraphNode[]; newLinks: GraphLink[] } {
    const allPapers = db.getPapers();
    const targetPaper = allPapers.find(p => p.id === paperId);
    if (!targetPaper) {
      return { newNodes: [], newLinks: [] };
    }

    const newNodes: GraphNode[] = [];
    const newLinks: GraphLink[] = [];

    // Find papers with shared fields or references not yet in seed
    const candidateNeighbors = allPapers.filter(p => p.id !== paperId);

    candidateNeighbors.slice(0, 5).forEach(neighbor => {
      newNodes.push({
        id: neighbor.id,
        title: neighbor.title,
        authors: neighbor.authors.map(a => a.name),
        year: neighbor.year,
        citations: neighbor.citationCount,
        fields: neighbor.fieldsOfStudy,
        group: this.getFieldGroup(neighbor.fieldsOfStudy),
        isSeed: false
      });

      newLinks.push({
        source: paperId,
        target: neighbor.id,
        type: 'semantic_similarity',
        weight: 1.5
      });
    });

    return { newNodes, newLinks };
  }

  /**
   * Find similar papers (ResearchRabbit-style "Earlier Work" and "Later Work")
   */
  public getSimilarPapers(paperId: string): { earlierWork: Paper[]; laterWork: Paper[]; similarWork: Paper[] } {
    const allPapers = db.getPapers();
    const target = allPapers.find(p => p.id === paperId);
    if (!target) {
      return { earlierWork: [], laterWork: [], similarWork: [] };
    }

    const otherPapers = allPapers.filter(p => p.id !== paperId);

    // Score similarity
    const scored = otherPapers.map(p => {
      let score = 0;

      // Shared fields
      const sharedFields = p.fieldsOfStudy.filter(f => 
        target.fieldsOfStudy.some(tf => tf.toLowerCase() === f.toLowerCase())
      );
      score += sharedFields.length * 3;

      // Shared authors
      const sharedAuthors = p.authors.filter(a => 
        target.authors.some(ta => ta.name.toLowerCase() === a.name.toLowerCase())
      );
      score += sharedAuthors.length * 5;

      // Keyword overlap in abstracts
      const targetWords = new Set(target.abstract.toLowerCase().split(/\W+/).filter(w => w.length > 4));
      const pWords = p.abstract.toLowerCase().split(/\W+/).filter(w => w.length > 4);
      let matchCount = 0;
      for (const w of pWords) {
        if (targetWords.has(w)) matchCount++;
      }
      score += Math.min(matchCount, 10);

      return { paper: p, score };
    });

    const ranked = scored.sort((a, b) => b.score - a.score).map(s => s.paper);

    const earlierWork = ranked.filter(p => p.year < target.year).slice(0, 4);
    const laterWork = ranked.filter(p => p.year > target.year).slice(0, 4);
    const similarWork = ranked.filter(p => p.year === target.year || Math.abs(p.year - target.year) <= 1).slice(0, 4);

    return { earlierWork, laterWork, similarWork };
  }
}

export const graphEngine = new GraphEngineService();
