import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Minimal valid PDF generator
function createSampleAcademicPdf(outputPath) {
  const content = `BT
/F1 18 Tf
50 750 Td
(Scalable State Space Models for Efficient Sequence Modeling) Tj
/F1 12 Tf
0 -30 Td
(Albert Gu, Tri Dao, Christopher Re) Tj
0 -30 Td
(Abstract) Tj
0 -20 Td
(Recent advances in sequence modeling have seen Transformers become ubiquitous across artificial intelligence. However, their quadratic computational complexity in sequence length presents fundamental bottlenecks for long context tasks. In this work, we introduce structured state space sequence models that process sequences in sub-quadratic O(N log N) time while matching Transformer perplexity benchmarks.) Tj
0 -50 Td
(1. Introduction) Tj
0 -20 Td
(Sequence models are central to modern deep learning. While attention mechanisms allow unbounded receptive fields, the compute cost scales prohibitively.) Tj
0 -40 Td
(2. Methodology) Tj
0 -20 Td
(We parameterize continuous-time state spaces using diagonalized transition matrices and apply fast Fourier transforms for parallelized associative scans.) Tj
0 -40 Td
(3. Results) Tj
0 -20 Td
(Our model achieves 84.2 accuracy on the Long Range Arena benchmark, outperforming Linear Transformers by 4.8 points.) Tj
0 -40 Td
(References) Tj
0 -20 Td
([1] Vaswani et al., Attention is all you need, NeurIPS 2017.) Tj
0 -15 Td
([2] Gu et al., Efficiently modeling long sequences with structured state spaces, ICLR 2022.) Tj
ET`;

  const streamLength = Buffer.byteLength(content);

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${400 + streamLength}
%%EOF`;

  fs.writeFileSync(outputPath, pdf);
  console.log('Sample PDF created at:', outputPath);
}

const samplePdfPath = path.resolve('sample_paper.pdf');
createSampleAcademicPdf(samplePdfPath);
