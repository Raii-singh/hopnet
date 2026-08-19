import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import graphRouter from './routes/graph.routes';
import usersRouter from './routes/users.routes';
import connectorsRouter from './routes/connectors.routes';
import imdbRouter from './routes/imdb.routes';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/graph', graphRouter);
app.use('/api/users', usersRouter);
app.use('/api/connectors', connectorsRouter);
app.use('/api/imdb', imdbRouter);

export default app;

