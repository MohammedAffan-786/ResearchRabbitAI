import express from 'express';
import multer from 'multer';
import { db } from '../db.js';
import { searchService } from '../services/academicSearch.js';
import { graphEngine } from '../services/graphEngine.js';
import { pdfParser } from '../services/pdfParser.js';
import { aiAssistant } from '../services/aiAssistant.js';
import { exportEngine } from '../services/exportEngine.js';
import { SearchFilters, Collection } from '../../../shared/types.js';

const router = express.Router();
const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  storage: multer.memoryStorage()
});

// --- Search API ---
router.get('/search', async (req, res) => {
  try {
    const filters: SearchFilters = {
      query: (req.query.q as string) || '',
      yearStart: req.query.yearStart ? parseInt(req.query.yearStart as string, 10) : undefined,
      yearEnd: req.query.yearEnd ? parseInt(req.query.yearEnd as string, 10) : undefined,
      minCitations: req.query.minCitations ? parseInt(req.query.minCitations as string, 10) : undefined,
      fieldOfStudy: (req.query.field as string) || undefined,
      openAccessOnly: req.query.openAccess === 'true',
      sortBy: (req.query.sortBy as any) || 'relevance'
    };

    const results = await searchService.search(filters);
    res.json(results);
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message || 'Search execution failed' });
  }
});

// --- Papers API ---
router.get('/papers', (req, res) => {
  const collectionId = req.query.collectionId as string;
  let papers = db.getPapers();

  if (collectionId) {
    const col = db.getCollection(collectionId);
    if (col) {
      papers = papers.filter(p => col.paperIds.includes(p.id));
    } else {
      return res.status(404).json({ error: 'Collection not found' });
    }
  }

  res.json({ papers, total: papers.length });
});

router.get('/papers/:id', (req, res) => {
  const paper = db.getPaper(req.params.id);
  if (!paper) {
    return res.status(404).json({ error: 'Paper not found' });
  }
  const similar = graphEngine.getSimilarPapers(paper.id);
  res.json({ paper, similar });
});

router.patch('/papers/:id', (req, res) => {
  const updated = db.updatePaper(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Paper not found' });
  }
  res.json(updated);
});

router.delete('/papers/:id', (req, res) => {
  const ok = db.deletePaper(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Paper not found' });
  res.json({ success: true });
});

// --- PDF Upload API ---
router.post('/papers/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file attached.' });
    }

    const parsedPaper = await pdfParser.parsePdfBuffer(req.file.buffer, req.file.originalname);
    db.savePaper(parsedPaper);

    // If collectionId passed in body, add to collection
    if (req.body.collectionId) {
      const col = db.getCollection(req.body.collectionId);
      if (col && !col.paperIds.includes(parsedPaper.id)) {
        col.paperIds.push(parsedPaper.id);
        db.saveCollection(col);
      }
    }

    res.json({
      success: true,
      paper: parsedPaper,
      message: `Successfully analyzed and ingested "${parsedPaper.title}"`
    });
  } catch (err: any) {
    console.error('PDF upload error:', err);
    res.status(500).json({ error: 'Failed to parse PDF document: ' + (err.message || 'Unknown error') });
  }
});

// --- Knowledge Graph API ---
router.get('/graph', (req, res) => {
  try {
    const seedIds = req.query.seeds ? (req.query.seeds as string).split(',') : undefined;
    const graph = graphEngine.buildGraph(seedIds);
    res.json(graph);
  } catch (err: any) {
    res.status(500).json({ error: 'Graph generation error: ' + err.message });
  }
});

router.post('/graph/expand', (req, res) => {
  const { paperId } = req.body;
  if (!paperId) return res.status(400).json({ error: 'paperId is required' });
  const result = graphEngine.expandNode(paperId);
  res.json(result);
});

// --- Collections API ---
router.get('/collections', (req, res) => {
  const collections = db.getCollections();
  res.json(collections);
});

router.post('/collections', (req, res) => {
  const { name, description, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Collection name is required' });

  const newCol: Collection = {
    id: `col-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name,
    description: description || '',
    paperIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    color: color || '#3b82f6',
    icon: icon || 'Folder'
  };

  db.saveCollection(newCol);
  res.status(201).json(newCol);
});

router.patch('/collections/:id', (req, res) => {
  const updated = db.updateCollection(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Collection not found' });
  res.json(updated);
});

router.delete('/collections/:id', (req, res) => {
  const ok = db.deleteCollection(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Collection not found' });
  res.json({ success: true });
});

router.post('/collections/:id/papers', (req, res) => {
  const { paperId } = req.body;
  const col = db.getCollection(req.params.id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  if (!col.paperIds.includes(paperId)) {
    col.paperIds.push(paperId);
    db.saveCollection(col);
  }
  res.json(col);
});

router.delete('/collections/:id/papers/:paperId', (req, res) => {
  const col = db.getCollection(req.params.id);
  if (!col) return res.status(404).json({ error: 'Collection not found' });

  col.paperIds = col.paperIds.filter(id => id !== req.params.paperId);
  db.saveCollection(col);
  res.json(col);
});

// --- AI Research Assistant API ---
router.post('/ai/ask', async (req, res) => {
  try {
    const { question, paperIds, mode } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const response = await aiAssistant.askQuestion(question, paperIds || [], mode);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: 'AI Assistant error: ' + err.message });
  }
});

router.post('/ai/synthesize', async (req, res) => {
  try {
    const { topic, paperIds, collectionName } = req.body;
    if (!topic || !paperIds || paperIds.length === 0) {
      return res.status(400).json({ error: 'Topic and at least one paperId are required' });
    }

    const review = await aiAssistant.generateLiteratureReview(topic, paperIds, collectionName);
    res.json(review);
  } catch (err: any) {
    res.status(500).json({ error: 'Synthesis error: ' + err.message });
  }
});

router.get('/reviews', (req, res) => {
  res.json(db.getReviews());
});

router.get('/reviews/:id', (req, res) => {
  const rev = db.getReview(req.params.id);
  if (!rev) return res.status(404).json({ error: 'Review not found' });
  res.json(rev);
});

router.delete('/reviews/:id', (req, res) => {
  const ok = db.deleteReview(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Review not found' });
  res.json({ success: true });
});

// --- PRISMA Systematic Review API ---
router.get('/prisma', (req, res) => {
  res.json(db.getPrismaProjects());
});

router.post('/prisma', (req, res) => {
  const { title, researchQuestion, inclusionCriteria, exclusionCriteria } = req.body;
  const project = {
    id: `prisma-${Date.now()}`,
    title: title || 'Systematic Literature Review Screening',
    researchQuestion: researchQuestion || '',
    inclusionCriteria: inclusionCriteria || ['Peer-reviewed publication', 'Empirical or theoretical methodology', 'Relevance to research question'],
    exclusionCriteria: exclusionCriteria || ['Non-English language', 'Duplicate study', 'Insufficient experimental data'],
    records: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.savePrismaProject(project);
  res.status(201).json(project);
});

router.post('/prisma/:id/screen', (req, res) => {
  const project = db.getPrismaProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { paperId, stage, exclusionReason } = req.body;
  const paper = db.getPaper(paperId);

  project.records = project.records.filter(r => r.paperId !== paperId);
  project.records.push({
    paperId,
    paperTitle: paper?.title || 'Unknown Paper',
    stage,
    exclusionReason,
    timestamp: new Date().toISOString()
  });

  project.updatedAt = new Date().toISOString();
  db.savePrismaProject(project);
  res.json(project);
});

// --- Export API ---
router.post('/export', (req, res) => {
  try {
    const { paperIds, format, style } = req.body;
    const allPapers = db.getPapers();
    const papers = paperIds && paperIds.length > 0
      ? allPapers.filter(p => paperIds.includes(p.id))
      : allPapers;

    if (format === 'bibtex') {
      const bib = exportEngine.toBibTeX(papers);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="references.bib"');
      return res.send(bib);
    }

    if (format === 'ris') {
      const ris = exportEngine.toRIS(papers);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="references.ris"');
      return res.send(ris);
    }

    // Formatted text citations
    const citations = papers.map(p => exportEngine.formatCitation(p, style || 'apa'));
    res.json({ citations, count: citations.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

router.post('/export/review', (req, res) => {
  try {
    const { reviewId, format } = req.body;
    const review = db.getReview(reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const allPapers = db.getPapers();
    const papers = allPapers.filter(p => review.paperIds.includes(p.id));

    if (format === 'csv') {
      const csv = exportEngine.synthesisMatrixToCSV(review);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${review.title.replace(/\s+/g, '_')}_matrix.csv"`);
      return res.send(csv);
    }

    // Default Markdown
    const md = exportEngine.reviewToMarkdown(review, papers);
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${review.title.replace(/\s+/g, '_')}.md"`);
    res.send(md);
  } catch (err: any) {
    res.status(500).json({ error: 'Review export failed: ' + err.message });
  }
});

export default router;
