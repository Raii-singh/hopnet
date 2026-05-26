import { Router } from 'express';
import { getUsers, getNodeRankings } from '../controllers/graph.controller';

const router = Router();

router.get('/', getUsers);
router.get('/rankings', getNodeRankings);

export default router;
