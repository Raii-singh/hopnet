import { Router } from 'express';
import { getGraph, getNode, getPath } from '../controllers/graph.controller';

const router = Router();

router.get('/', getGraph);
router.get('/node/:id', getNode);
router.get('/path', getPath);

export default router;
