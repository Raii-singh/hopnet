import { Router } from 'express';
import { getHistory, previewConnector, ingestConnector } from '../controllers/connector.controller';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

router.get('/history', requireAdmin, getHistory);
router.post('/preview', requireAdmin, previewConnector);
router.post('/ingest', requireAdmin, ingestConnector);

export default router;
