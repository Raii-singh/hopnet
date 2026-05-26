import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { generateImportPreview, commitIngestion } from '../services/connector.service';

/**
 * GET /api/connectors/history
 */
export async function getHistory(_req: Request, res: Response) {
  try {
    const logs = await prisma.importLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve import log history.' });
  }
}

/**
 * POST /api/connectors/preview
 */
export async function previewConnector(req: Request, res: Response) {
  try {
    const { connectorType, rawText } = req.body;
    if (!connectorType || !rawText) {
      res.status(400).json({ error: 'Missing connectorType or file rawText content.' });
      return;
    }

    const preview = await generateImportPreview(connectorType, rawText);
    res.json(preview);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to parse upload data.' });
  }
}

/**
 * POST /api/connectors/ingest
 */
export async function ingestConnector(req: Request, res: Response) {
  try {
    const { connectorType, filename, previewData } = req.body;
    if (!connectorType || !filename || !previewData) {
      res.status(400).json({ error: 'Missing connectorType, filename, or previewData config.' });
      return;
    }

    const outcome = await commitIngestion(connectorType, filename, previewData);
    res.json(outcome);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to commit graph ingestion.' });
  }
}
