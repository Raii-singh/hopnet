import 'dotenv/config';
import app from './app';
import { bootstrapNeo4j } from './services/neo4jBootstrap';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.listen(PORT, () => {
  console.log(`\n🔷 HOPNet API running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);

  // Asynchronously ensure database indexes and datasets are populated without blocking startup
  bootstrapNeo4j().catch(err => {
    console.error('[Bootstrap] Background initialization error:', err);
  });
});
