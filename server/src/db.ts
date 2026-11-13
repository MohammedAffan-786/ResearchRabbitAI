import fs from 'fs';
import path from 'path';
import { Paper, Collection, LiteratureReview, PrismaProject } from '../../shared/types.js';

interface DatabaseSchema {
  papers: Record<string, Paper>;
  collections: Record<string, Collection>;
  reviews: Record<string, LiteratureReview>;
  prismaProjects: Record<string, PrismaProject>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Seed papers with high-impact seminal research papers across AI, Quantum, and Medicine
const SEED_PAPERS: Paper[] = [
  {
    id: 'paper-vaswani-2017',
    title: 'Attention Is All You Need',
    authors: [
      { name: 'Ashish Vaswani', affiliation: 'Google Brain' },
      { name: 'Noam Shazeer', affiliation: 'Google Brain' },
      { name: 'Niki Parmar', affiliation: 'Google Research' },
      { name: 'Jakob Uszkoreit', affiliation: 'Google Research' },
      { name: 'Llion Jones', affiliation: 'Google Research' },
      { name: 'Aidan N. Gomez', affiliation: 'University of Toronto' },
      { name: 'Lukasz Kaiser', affiliation: 'Google Brain' },
      { name: 'Illia Polosukhin', affiliation: 'Independent' }
    ],
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.',
    year: 2017,
    venue: 'NeurIPS 2017',
    arxivId: '1706.03762',
    doi: '10.48550/arXiv.1706.03762',
    citationCount: 135400,
    referenceCount: 42,
    influentialCitationCount: 18200,
    fieldsOfStudy: ['Computer Science', 'Artificial Intelligence', 'Natural Language Processing'],
    openAccessPdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf',
    tldr: 'Introduces the Transformer architecture based entirely on self-attention mechanisms, replacing recurrent networks in sequence transduction.',
    source: 'local',
    readingStatus: 'starred',
    userRating: 5,
    tags: ['Transformer', 'NLP', 'Foundational', 'Attention'],
    dateAdded: new Date(Date.now() - 30 * 86400000).toISOString(),
    references: ['paper-bahdanau-2014', 'paper-sutskever-2014', 'paper-hochreiter-1997']
  },
  {
    id: 'paper-devlin-2018',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    authors: [
      { name: 'Jacob Devlin', affiliation: 'Google AI Language' },
      { name: 'Ming-Wei Chang', affiliation: 'Google AI Language' },
      { name: 'Kenton Lee', affiliation: 'Google AI Language' },
      { name: 'Kristina Toutanova', affiliation: 'Google AI Language' }
    ],
    abstract: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers. As a result, the pre-trained BERT model can be fine-tuned with just one additional output layer to create state-of-the-art models for a wide range of tasks, such as question answering and language inference.',
    year: 2018,
    venue: 'NAACL 2019',
    arxivId: '1810.04805',
    doi: '10.18653/v1/N19-1423',
    citationCount: 104200,
    referenceCount: 47,
    influentialCitationCount: 12400,
    fieldsOfStudy: ['Computer Science', 'Artificial Intelligence', 'Natural Language Processing'],
    openAccessPdfUrl: 'https://arxiv.org/pdf/1810.04805.pdf',
    tldr: 'Introduces BERT, using masked language modeling to pre-train deep bidirectional representations yielding breakthrough NLP benchmark performance.',
    source: 'local',
    readingStatus: 'completed',
    userRating: 5,
    tags: ['BERT', 'Transformers', 'Pretraining', 'Bidirectional'],
    dateAdded: new Date(Date.now() - 25 * 86400000).toISOString(),
    references: ['paper-vaswani-2017', 'paper-radford-2018']
  },
  {
    id: 'paper-brown-2020',
    title: 'Language Models are Few-Shot Learners (GPT-3)',
    authors: [
      { name: 'Tom B. Brown', affiliation: 'OpenAI' },
      { name: 'Benjamin Mann', affiliation: 'OpenAI' },
      { name: 'Nick Ryder', affiliation: 'OpenAI' },
      { name: 'Melanie Subbiah', affiliation: 'OpenAI' },
      { name: 'Jared Kaplan', affiliation: 'Johns Hopkins University' },
      { name: 'Dario Amodei', affiliation: 'OpenAI' }
    ],
    abstract: 'Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text followed by fine-tuning on a specific task. While typically task-agnostic in architecture, this method still requires task-specific fine-tuning datasets of thousands or tens of thousands of examples. Here we show that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches.',
    year: 2020,
    venue: 'NeurIPS 2020',
    arxivId: '2005.14165',
    doi: '10.48550/arXiv.2005.14165',
    citationCount: 42100,
    referenceCount: 78,
    influentialCitationCount: 6500,
    fieldsOfStudy: ['Computer Science', 'Artificial Intelligence', 'Machine Learning'],
    openAccessPdfUrl: 'https://arxiv.org/pdf/2005.14165.pdf',
    tldr: 'Demonstrates that 175-billion parameter autoregressive language models achieve strong in-context few-shot learning capabilities without task-specific parameter updating.',
    source: 'local',
    readingStatus: 'reading',
    userRating: 5,
    tags: ['GPT-3', 'Few-Shot', 'Scaling Laws', 'LLM'],
    dateAdded: new Date(Date.now() - 20 * 86400000).toISOString(),
    references: ['paper-vaswani-2017', 'paper-radford-2019', 'paper-kaplan-2020']
  },
  {
    id: 'paper-ouyang-2022',
    title: 'Training language models to follow instructions with human feedback (InstructGPT)',
    authors: [
      { name: 'Long Ouyang', affiliation: 'OpenAI' },
      { name: 'Jeff Wu', affiliation: 'OpenAI' },
      { name: 'Xu Jiang', affiliation: 'OpenAI' },
      { name: 'Diogo Almeida', affiliation: 'OpenAI' },
      { name: 'Carroll L. Wainwright', affiliation: 'OpenAI' },
      { name: 'John Schulman', affiliation: 'OpenAI' }
    ],
    abstract: 'Making language models bigger does not inherently make them better at following a users intent. For example, large language models can generate outputs that are untruthful, toxic, or simply not helpful to the user. In this work, we show an avenue for aligning language models with user intent on a wide range of tasks by fine-tuning with human feedback. Using Reinforcement Learning from Human Feedback (RLHF), we train models that are much better at following instructions.',
    year: 2022,
    venue: 'NeurIPS 2022',
    arxivId: '2203.02155',
    doi: '10.48550/arXiv.2203.02155',
    citationCount: 18500,
    referenceCount: 64,
    influentialCitationCount: 2900,
    fieldsOfStudy: ['Computer Science', 'Artificial Intelligence', 'Human-Computer Interaction'],
    openAccessPdfUrl: 'https://arxiv.org/pdf/2203.02155.pdf',
    tldr: 'Demonstrates alignment of LLMs using Reinforcement Learning from Human Feedback (RLHF) to make models helpful, honest, and harmless.',
    source: 'local',
    readingStatus: 'starred',
    userRating: 5,
    tags: ['RLHF', 'Alignment', 'InstructGPT', 'PPO'],
    dateAdded: new Date(Date.now() - 15 * 86400000).toISOString(),
    references: ['paper-brown-2020', 'paper-christiano-2017']
  },
  {
    id: 'paper-lewis-2020',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    authors: [
      { name: 'Patrick Lewis', affiliation: 'Facebook AI Research' },
      { name: 'Ethan Perez', affiliation: 'New York University' },
      { name: 'Aleksandra Piktus', affiliation: 'Facebook AI Research' },
      { name: 'Fabio Petroni', affiliation: 'Facebook AI Research' },
      { name: 'Vladimir Karpukhin', affiliation: 'Facebook AI Research' },
      { name: 'Douwe Kiela', affiliation: 'Facebook AI Research' }
    ],
    abstract: 'Large pre-trained language models have been shown to store factual knowledge in their parameters. However, their ability to precisely access and manipulate knowledge is still limited. We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) — models which combine pre-trained parametric and non-parametric memory for language generation. We introduce RAG models where the parametric memory is a pre-trained seq2seq model and the non-parametric memory is a dense vector index of Wikipedia.',
    year: 2020,
    venue: 'NeurIPS 2020',
    arxivId: '2005.11401',
    doi: '10.48550/arXiv.2005.11401',
    citationCount: 12200,
    referenceCount: 52,
    influentialCitationCount: 2100,
    fieldsOfStudy: ['Computer Science', 'Information Retrieval', 'Natural Language Processing'],
    openAccessPdfUrl: 'https://arxiv.org/pdf/2005.11401.pdf',
    tldr: 'Pioneers Retrieval-Augmented Generation (RAG) combining dense neural retrieval with sequence-to-sequence language generators to mitigate hallucinations.',
    source: 'local',
    readingStatus: 'starred',
    userRating: 5,
    tags: ['RAG', 'Retrieval', 'Information Retrieval', 'Dense Embeddings'],
    dateAdded: new Date(Date.now() - 10 * 86400000).toISOString(),
    references: ['paper-vaswani-2017', 'paper-devlin-2018', 'paper-karpukhin-2020']
  },
  {
    id: 'paper-jumper-2021',
    title: 'Highly accurate protein structure prediction with AlphaFold',
    authors: [
      { name: 'John Jumper', affiliation: 'DeepMind' },
      { name: 'Richard Evans', affiliation: 'DeepMind' },
      { name: 'Alexander Pritzel', affiliation: 'DeepMind' },
      { name: 'Tim Green', affiliation: 'DeepMind' },
      { name: 'Michael Figurnov', affiliation: 'DeepMind' },
      { name: 'Demis Hassabis', affiliation: 'DeepMind' }
    ],
    abstract: 'Proteins are essential to life, and understanding their structure can facilitate a mechanistic understanding of their function. Decades of effort have produced experimental methods that have determined tens of thousands of protein structures, but mapping the structural proteome has remained a major challenge. Here we present AlphaFold, a computational approach capable of predicting protein structures to atomic accuracy even in cases in which no similar structure is known.',
    year: 2021,
    venue: 'Nature',
    doi: '10.1038/s41586-021-03819-2',
    citationCount: 31200,
    referenceCount: 65,
    influentialCitationCount: 7800,
    fieldsOfStudy: ['Biology', 'Structural Biology', 'Bioinformatics', 'Machine Learning'],
    openAccessPdfUrl: 'https://www.nature.com/articles/s41586-021-03819-2.pdf',
    tldr: 'Solves the 50-year protein folding grand challenge using Evoformer attention architectures and invariant coordinate frames to achieve atomic-level accuracy.',
    source: 'local',
    readingStatus: 'starred',
    userRating: 5,
    tags: ['AlphaFold', 'Structural Biology', 'Proteins', 'DeepMind'],
    dateAdded: new Date(Date.now() - 18 * 86400000).toISOString(),
    references: ['paper-vaswani-2017']
  },
  {
    id: 'paper-arute-2019',
    title: 'Quantum supremacy using a programmable superconducting processor (Sycamore)',
    authors: [
      { name: 'Frank Arute', affiliation: 'Google AI Quantum' },
      { name: 'Kunal Arya', affiliation: 'Google AI Quantum' },
      { name: 'John M. Martinis', affiliation: 'Google AI Quantum' }
    ],
    abstract: 'The promise of quantum computers is that certain computational tasks might be executed exponentially faster on a quantum processor than on a classical processor. A fundamental milestone is to demonstrate a quantum speedup over the best possible classical algorithms. Here we report the use of a processor with 53 programmable superconducting qubits to achieve quantum supremacy on a random circuit sampling task.',
    year: 2019,
    venue: 'Nature',
    doi: '10.1038/s41586-019-1666-5',
    citationCount: 7800,
    referenceCount: 50,
    influentialCitationCount: 1100,
    fieldsOfStudy: ['Physics', 'Quantum Physics', 'Quantum Computing'],
    openAccessPdfUrl: 'https://www.nature.com/articles/s41586-019-1666-5.pdf',
    tldr: 'Demonstrates quantum supremacy with a 53-qubit superconducting Sycamore processor sampling random circuits in 200 seconds.',
    source: 'local',
    readingStatus: 'reading',
    userRating: 4,
    tags: ['Quantum Supremacy', 'Sycamore', 'Superconducting Qubits'],
    dateAdded: new Date(Date.now() - 14 * 86400000).toISOString(),
    references: []
  },
  {
    id: 'paper-doudna-2012',
    title: 'A programmable dual-RNA-guided DNA endonuclease in adaptive bacterial immunity',
    authors: [
      { name: 'Martin Jinek', affiliation: 'University of California, Berkeley' },
      { name: 'Krzysztof Chylinski', affiliation: 'University of Vienna' },
      { name: 'Ines Fonfara', affiliation: 'Umea University' },
      { name: 'Michael Hauer', affiliation: 'University of California, Berkeley' },
      { name: 'Jennifer A. Doudna', affiliation: 'University of California, Berkeley' },
      { name: 'Emmanuelle Charpentier', affiliation: 'Umea University' }
    ],
    abstract: 'Clustered regularly interspaced short palindromic repeats (CRISPR)/CRISPR-associated (Cas) systems provide adaptive immunity against viruses and plasmids in bacteria and archaea. Cas9 endonuclease guided by dual-RNA structures cleaves targeted double-stranded DNA. We demonstrate that Cas9 can be programmed with single guide RNAs to introduce targeted double-stranded breaks into specific DNA sequences, establishing CRISPR-Cas9 as a versatile gene editing platform.',
    year: 2012,
    venue: 'Science',
    doi: '10.1126/science.1225829',
    citationCount: 22400,
    referenceCount: 38,
    influentialCitationCount: 4500,
    fieldsOfStudy: ['Biology', 'Genetics', 'Molecular Biology'],
    openAccessPdfUrl: 'https://www.science.org/doi/10.1126/science.1225829',
    tldr: 'Discovers that Cas9 can be programmed by synthetic single-guide RNAs to perform targeted site-specific DNA cleavage, enabling precision genome editing.',
    source: 'local',
    readingStatus: 'completed',
    userRating: 5,
    tags: ['CRISPR', 'Cas9', 'Genome Editing', 'Biotechnology'],
    dateAdded: new Date(Date.now() - 22 * 86400000).toISOString(),
    references: []
  },
  {
    id: 'paper-dosovitskiy-2020',
    title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale (ViT)',
    authors: [
      { name: 'Alexey Dosovitskiy', affiliation: 'Google Research, Brain Team' },
      { name: 'Lucas Beyer', affiliation: 'Google Research' },
      { name: 'Alexander Kolesnikov', affiliation: 'Google Research' },
      { name: 'Dirk Weissenborn', affiliation: 'Google Research' },
      { name: 'Xiaohua Zhai', affiliation: 'Google Research' },
      { name: 'Thomas Unterthiner', affiliation: 'Google Research' }
    ],
    abstract: 'While the Transformer architecture has become the de-facto standard for natural language processing tasks, its applications to computer vision remain limited. In vision, attention is either applied in conjunction with convolutional networks, or used to replace certain components of convolutional networks while keeping their overall structure in place. We show that this reliance on CNNs is not necessary and a pure transformer applied directly to sequences of image patches can perform very well on image classification tasks.',
    year: 2020,
    venue: 'ICLR 2021',
    arxivId: '2010.11929',
    doi: '10.48550/arXiv.2010.11929',
    citationCount: 46800,
    referenceCount: 49,
    influentialCitationCount: 6100,
    fieldsOfStudy: ['Computer Science', 'Computer Vision', 'Artificial Intelligence'],
    openAccessPdfUrl: 'https://arxiv.org/pdf/2010.11929.pdf',
    tldr: 'Applies pure standard Transformer encoders directly to flattened 16x16 image patches, challenging convolutional dominance in computer vision.',
    source: 'local',
    readingStatus: 'starred',
    userRating: 5,
    tags: ['Vision Transformer', 'ViT', 'Computer Vision', 'Self-Attention'],
    dateAdded: new Date(Date.now() - 16 * 86400000).toISOString(),
    references: ['paper-vaswani-2017']
  },
  {
    id: 'paper-rombach-2022',
    title: 'High-Resolution Image Synthesis with Latent Diffusion Models (Stable Diffusion)',
    authors: [
      { name: 'Robin Rombach', affiliation: 'LMU Munich' },
      { name: 'Andreas Blattmann', affiliation: 'LMU Munich' },
      { name: 'Dominik Lorenz', affiliation: 'LMU Munich' },
      { name: 'Patrick Esser', affiliation: 'Runway ML' },
      { name: 'Bjorn Ommer', affiliation: 'LMU Munich' }
    ],
    abstract: 'By decomposing the image formation process into a sequential application of denoising autoencoders, diffusion models achieve state-of-the-art synthesis results on image data. However, operating directly in RGB space consumes prohibitive computing resources. To overcome this limitation, we apply diffusion models in the latent space of powerful pretrained autoencoders, significantly boosting computational efficiency while retaining high perceptual fidelity.',
    year: 2022,
    venue: 'CVPR 2022',
    arxivId: '2112.10752',
    doi: '10.1109/CVPR52688.2022.01042',
    citationCount: 16400,
    referenceCount: 71,
    influentialCitationCount: 2400,
    fieldsOfStudy: ['Computer Science', 'Computer Vision', 'Generative Modeling'],
    openAccessPdfUrl: 'https://arxiv.org/pdf/2112.10752.pdf',
    tldr: 'Introduces Latent Diffusion Models (LDM), enabling high-resolution photorealistic generative image synthesis on consumer GPUs via cross-attention condition conditioning.',
    source: 'local',
    readingStatus: 'reading',
    userRating: 5,
    tags: ['Diffusion Models', 'Stable Diffusion', 'Generative AI', 'Latent Space'],
    dateAdded: new Date(Date.now() - 12 * 86400000).toISOString(),
    references: ['paper-vaswani-2017']
  }
];

const SEED_COLLECTIONS: Collection[] = [
  {
    id: 'col-transformers-foundation',
    name: 'Foundation Models & Transformer Architectures',
    description: 'Seminal and cutting-edge literature on self-attention mechanisms, scaling laws, bidirectional encodings, and generative pre-training.',
    paperIds: ['paper-vaswani-2017', 'paper-devlin-2018', 'paper-brown-2020', 'paper-ouyang-2022', 'paper-lewis-2020'],
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    color: '#3b82f6',
    icon: 'Brain'
  },
  {
    id: 'col-multimodal-vision',
    name: 'Multimodal AI & Generative Diffusion',
    description: 'Breakthrough architectures bridging vision, text, latent diffusion, and generative modeling.',
    paperIds: ['paper-dosovitskiy-2020', 'paper-rombach-2022'],
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    color: '#8b5cf6',
    icon: 'Sparkles'
  },
  {
    id: 'col-biomedical-breakthroughs',
    name: 'Bioinformatics & Molecular Precision',
    description: 'Milestone papers in structural biology prediction and programmable genetic therapeutics.',
    paperIds: ['paper-jumper-2021', 'paper-doudna-2012'],
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    color: '#10b981',
    icon: 'Dna'
  }
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read existing store.json, reinitializing seeds', e);
    }

    const initialPapers: Record<string, Paper> = {};
    SEED_PAPERS.forEach(p => {
      initialPapers[p.id] = p;
    });

    const initialCollections: Record<string, Collection> = {};
    SEED_COLLECTIONS.forEach(c => {
      initialCollections[c.id] = c;
    });

    const schema: DatabaseSchema = {
      papers: initialPapers,
      collections: initialCollections,
      reviews: {},
      prismaProjects: {}
    };

    this.save(schema);
    return schema;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }

  // --- Papers ---
  public getPapers(): Paper[] {
    return Object.values(this.data.papers);
  }

  public getPaper(id: string): Paper | undefined {
    return this.data.papers[id];
  }

  public savePaper(paper: Paper): Paper {
    this.data.papers[paper.id] = paper;
    this.save();
    return paper;
  }

  public savePapers(papers: Paper[]): Paper[] {
    papers.forEach(p => {
      this.data.papers[p.id] = p;
    });
    this.save();
    return papers;
  }

  public updatePaper(id: string, updates: Partial<Paper>): Paper | undefined {
    const existing = this.data.papers[id];
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.data.papers[id] = updated;
    this.save();
    return updated;
  }

  public deletePaper(id: string): boolean {
    if (!this.data.papers[id]) return false;
    delete this.data.papers[id];
    // Remove from collections
    Object.values(this.data.collections).forEach(c => {
      c.paperIds = c.paperIds.filter(pid => pid !== id);
    });
    this.save();
    return true;
  }

  // --- Collections ---
  public getCollections(): Collection[] {
    return Object.values(this.data.collections);
  }

  public getCollection(id: string): Collection | undefined {
    return this.data.collections[id];
  }

  public saveCollection(col: Collection): Collection {
    this.data.collections[col.id] = col;
    this.save();
    return col;
  }

  public updateCollection(id: string, updates: Partial<Collection>): Collection | undefined {
    const existing = this.data.collections[id];
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.data.collections[id] = updated;
    this.save();
    return updated;
  }

  public deleteCollection(id: string): boolean {
    if (!this.data.collections[id]) return false;
    delete this.data.collections[id];
    this.save();
    return true;
  }

  // --- Literature Reviews ---
  public getReviews(): LiteratureReview[] {
    return Object.values(this.data.reviews);
  }

  public getReview(id: string): LiteratureReview | undefined {
    return this.data.reviews[id];
  }

  public saveReview(review: LiteratureReview): LiteratureReview {
    this.data.reviews[review.id] = review;
    this.save();
    return review;
  }

  public deleteReview(id: string): boolean {
    if (!this.data.reviews[id]) return false;
    delete this.data.reviews[id];
    this.save();
    return true;
  }

  // --- PRISMA Projects ---
  public getPrismaProjects(): PrismaProject[] {
    return Object.values(this.data.prismaProjects);
  }

  public getPrismaProject(id: string): PrismaProject | undefined {
    return this.data.prismaProjects[id];
  }

  public savePrismaProject(project: PrismaProject): PrismaProject {
    this.data.prismaProjects[project.id] = project;
    this.save();
    return project;
  }
}

export const db = new Database();
