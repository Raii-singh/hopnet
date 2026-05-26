import { Router } from 'express';
import { getHistory, previewConnector, ingestConnector } from '../controllers/connector.controller';

const router = Router();

router.get('/history', getHistory);
router.post('/preview', previewConnector);
router.post('/ingest', ingestConnector);

export default router;
