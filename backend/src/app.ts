import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import graphRouter from './routes/graph.routes';
import usersRouter from './routes/users.routes';
import connectorsRouter from './routes/connectors.routes';

const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/graph', graphRouter);
app.use('/api/users', usersRouter);
app.use('/api/connectors', connectorsRouter);

export default app;
