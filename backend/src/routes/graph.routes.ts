import { Router } from 'express';
import {
  getGraph,
  getNode,
  getPath,
  createRelationship,
  updateRelationship,
  deleteRelationship,
} from '../controllers/graph.controller';

const router = Router();

router.get('/', getGraph);
router.get('/node/:id', getNode);
router.get('/path', getPath);

// Edge CRUD
router.post('/edge', createRelationship);
router.put('/edge/:id', updateRelationship);
router.delete('/edge/:id', deleteRelationship);

export default router;

