import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import graphRouter from './routes/graph.routes';
import usersRouter from './routes/users.routes';
import connectorsRouter from './routes/connectors.routes';
import imdbRouter from './routes/imdb.routes';
// v2 — Neo4j-backed API
import personsV2Router from './routes/v2/persons.routes';
import relationshipsV2Router from './routes/v2/relationships.routes';
import graphV2Router from './routes/v2/graph.routes';
import authRouter from './routes/v2/auth.routes';
import { hopnetErrorHandler } from './middleware/errorHandler';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/v2/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── v1 Routes (Prisma-backed — unchanged) ─────────────────────────────────
app.use('/api/graph', graphRouter);
app.use('/api/users', usersRouter);
app.use('/api/connectors', connectorsRouter);
app.use('/api/imdb', imdbRouter);

// ── v2 Routes (Neo4j-backed) ───────────────────────────────────────────────
app.use('/api/v2/auth', authRouter);
app.use('/api/v2/persons', personsV2Router);
app.use('/api/v2/relationships', relationshipsV2Router);
app.use('/api/v2/graph', graphV2Router);

// ── Shared error handler (must be last) ───────────────────────────────────
app.use(hopnetErrorHandler);

export default app;
