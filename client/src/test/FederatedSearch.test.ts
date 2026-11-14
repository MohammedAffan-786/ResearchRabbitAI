import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clientScholarlyEngine } from '../services/clientScholarlyEngine';

describe('Federated Search & Scholarly Discovery Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('matches AlphaFold Protein Structure Prediction query to seminal Jumper 2021 paper', async () => {
    const result = await clientScholarlyEngine.search({
      query: 'AlphaFold Protein Structure Prediction'
    });

    expect(result.papers.length).toBeGreaterThan(0);
    const alphaFoldPaper = result.papers.find(p => p.id === 'paper-jumper-2021');
    expect(alphaFoldPaper).toBeDefined();
    expect(alphaFoldPaper?.title).toContain('Highly accurate protein structure prediction with AlphaFold');
    expect(alphaFoldPaper?.authors.some(a => a.name.includes('Jumper'))).toBe(true);
    expect(alphaFoldPaper?.citationCount).toBeGreaterThan(30000);
  });

  it('matches Quantum Computing Superconducting Qubits query to seminal paper', async () => {
    const result = await clientScholarlyEngine.search({
      query: 'Quantum Computing Superconducting Qubits'
    });

    expect(result.papers.length).toBeGreaterThan(0);
    const quantumPaper = result.papers.find(p => p.id === 'paper-arute-2019');
    expect(quantumPaper).toBeDefined();
    expect(quantumPaper?.title).toContain('Quantum supremacy using a programmable superconducting processor');
    expect(quantumPaper?.tags).toContain('Superconducting Qubits');
  });

  it('matches CRISPR-Cas9 Genome Editing query to seminal Doudna/Charpentier paper', async () => {
    const result = await clientScholarlyEngine.search({
      query: 'CRISPR-Cas9 Genome Editing'
    });

    expect(result.papers.length).toBeGreaterThan(0);
    const crisprPaper = result.papers.find(p => p.id === 'paper-jinek-2012');
    expect(crisprPaper).toBeDefined();
    expect(crisprPaper?.authors.some(a => a.name.includes('Doudna'))).toBe(true);
  });

  it('reports totalResults across the 250M+ scholarly works repository', async () => {
    const result = await clientScholarlyEngine.search({
      query: 'AlphaFold'
    });

    expect(result.totalResults).toBeGreaterThanOrEqual(250000000);
    expect(result.sourceBreakdown).toBeDefined();
    expect(result.attributions).toBeDefined();
    expect(result.attributions?.length).toBeGreaterThan(0);
  });
});
