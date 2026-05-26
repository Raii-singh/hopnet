import { Router } from 'express';
import {
  getUsers,
  getNodeRankings,
  getNodeProfile,
  createUserNode,
  updateUserNode,
  deleteUserNode,
  getDuplicates,
  mergeUserIdentities,
} from '../controllers/graph.controller';

const router = Router();

router.get('/', getUsers);
router.get('/rankings', getNodeRankings);
router.get('/profile/:publicId', getNodeProfile);

// Workspace CRUD
router.post('/', createUserNode);
router.put('/:id', updateUserNode);
router.delete('/:id', deleteUserNode);

// Duplicate suggestions & Merging
router.get('/duplicates', getDuplicates);
router.post('/merge', mergeUserIdentities);

export default router;


