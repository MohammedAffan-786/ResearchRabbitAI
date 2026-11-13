import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRouter from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'ResearchRabbit AI',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve static frontend in production if built
const clientDist = path.resolve(process.cwd(), '../client/dist');
app.use(express.static(clientDist));

app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      // If client is running in dev mode via Vite, inform user
      res.status(200).send(`
        <html>
          <body style="font-family:sans-serif; text-align:center; padding: 40px;">
            <h2>ResearchRabbit AI Backend Server</h2>
            <p>API is active on port ${PORT}. In development mode, launch the client via Vite on port 5173.</p>
          </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, () => {
  console.log(`🐇 ResearchRabbit AI Server running on http://localhost:${PORT}`);
});
