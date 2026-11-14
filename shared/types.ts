export interface Author {
  name: string;
  affiliation?: string;
  authorId?: string;
}

export interface PaperSection {
  title: string;
  content: string;
}

export interface PaperIntelligence {
  problemStatement: string;
  researchObjectives: string[];
  methodology: string;
  datasetUsed: string;
  experimentalResults: string;
  keyFindings: string[];
  limitations: string[];
  futureDirections: string[];
  keywords: string[];
  isAbstractOnly: boolean;
}

export interface Paper {
  id: string;
  title: string;
  authors: Author[];
  abstract: string;
  year: number;
  venue?: string;
  doi?: string;
  arxivId?: string;
  citationCount: number;
  referenceCount: number;
  influentialCitationCount?: number;
  fieldsOfStudy: string[];
  openAccessPdfUrl?: string;
  tldr?: string;
  source: 'openalex' | 'arxiv' | 'semanticscholar' | 'crossref' | 'europepmc' | 'upload' | 'local';
  pdfExtracted?: {
    sections: PaperSection[];
    references: string[];
    keywords: string[];
    fullText?: string;
  };
  paperIntelligence?: PaperIntelligence;
  userNotes?: string;
  readingStatus?: 'to-read' | 'reading' | 'completed' | 'starred';
  userRating?: number; // 1-5
  tags?: string[];
  dateAdded?: string;
  citedByCount?: number;
  references?: string[]; // IDs or titles of references
  isUploaded?: boolean;
  hasFullText?: boolean;
}

export type LinkType = 
  | 'cites' 
  | 'citation' 
  | 'referenced_by' 
  | 'co_citation' 
  | 'author_collaboration' 
  | 'authored' 
  | 'author' 
  | 'semantic_similarity' 
  | 'semantic' 
  | 'topic_membership';

export interface GraphNode {
  id: string;
  title: string;
  authors: string[];
  year: number;
  citations: number;
  fields: string[];
  isSeed?: boolean;
  isUploaded?: boolean;
  group?: number;
  nodeType?: 'paper' | 'author' | 'topic' | 'institution';
  venue?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  id?: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: LinkType;
  weight: number;
  isVerifiedCitation?: boolean;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  stats?: {
    nodeCount: number;
    edgeCount: number;
    verifiedCitations: number;
    semanticSimilarities: number;
    collaborations: number;
  };
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  paperIds: string[];
  createdAt: string;
  updatedAt: string;
  color: string;
  icon: string;
  isPublic?: boolean;
  shareToken?: string;
  tags?: string[];
  paperCount?: number;
  papers?: Partial<Paper>[];
}

export interface CitationItem {
  paperId: string;
  citeKey: string;
  title: string;
  authors: string;
  year: number;
  quoteSnippet?: string;
  confidence?: number;
}

export interface ReviewSection {
  heading: string;
  content: string;
  citations: CitationItem[];
}

export interface SynthesisRow {
  paperId: string;
  paperTitle: string;
  authors: string;
  year: number;
  objective: string;
  methodology: string;
  datasetOrSample: string;
  keyFindings: string;
  limitations: string;
  gapsIdentified: string;
}

export interface LiteratureReview {
  id: string;
  title: string;
  topic: string;
  collectionId?: string;
  paperIds: string[];
  executiveSummary: string;
  sections: ReviewSection[];
  synthesisMatrix: SynthesisRow[];
  prismaStats?: {
    identified: number;
    screened: number;
    eligible: number;
    included: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SearchFilters {
  query: string;
  yearStart?: number;
  yearEnd?: number;
  minCitations?: number;
  fieldOfStudy?: string;
  openAccessOnly?: boolean;
  sortBy?: 'relevance' | 'citations' | 'year';
  source?: 'all' | 'openalex' | 'crossref' | 'semantic_scholar' | 'arxiv' | 'europepmc';
  provider?: string;
}

export interface SearchResult {
  papers: Paper[];
  totalResults: number;
  page: number;
  queryTimeMs: number;
  sourceBreakdown: Record<string, number>;
  attributions?: string[];
  cached?: boolean;
}

export interface AskQuestionRequest {
  question: string;
  paperIds: string[];
  mode?: 'comprehensive' | 'concise' | 'comparative' | 'methodology' | 'critique';
  userApiKey?: string;
  modelProvider?: 'builtin' | 'openai' | 'gemini' | 'anthropic';
}

export interface AskQuestionResponse {
  answer: string;
  citations: CitationItem[];
  synthesisKeyPoints: string[];
  suggestedFollowUps: string[];
  modeUsed: string;
}

export interface PrismaRecord {
  paperId: string;
  paperTitle: string;
  stage: 'identified' | 'screened_in' | 'screened_out' | 'eligible' | 'excluded' | 'included';
  exclusionReason?: string;
  timestamp: string;
}

export interface PrismaProject {
  id: string;
  title: string;
  researchQuestion: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  records: PrismaRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentJob {
  jobId: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  paperId?: string;
  error?: string;
  createdAt?: string;
}

export interface ResearchActivityItem {
  id: string;
  type: string;
  title: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface WeeklyActivityDay {
  day: string;
  dayName: string;
  date: string;
  count: number;
  isToday?: boolean;
  label: string;
}

export interface DashboardOverview {
  stats: {
    totalPapers: number;
    totalCitations: number;
    totalAuthors?: number;
    graphConnections?: number;
    openAccessCount: number;
    uploadedCount: number;
    totalCollections: number;
    totalReviews: number;
  };
  recentActivities: ResearchActivityItem[];
  weeklyActivity?: WeeklyActivityDay[];
  recentPapers: Paper[];
  savedCollections: Collection[];
  trendingTopics: { topic: string; paperCount: number; growth: string }[];
  recommendations: (Paper & { recommendationReason?: string })[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  institution?: string;
  created_at?: string;
  stats?: {
    collectionsCount: number;
    reviewsCount: number;
    prismaCount: number;
    uploadedPapersCount: number;
  };
}
