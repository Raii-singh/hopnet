import { Request, Response } from 'express';
import {
  getSubgraph,
  getNodeById,
  getAllNodes,
  getRankings,
  getShortestPath,
} from '../services/graph.service';

// GET /api/graph?nodeId=xxx&depth=1&includeDemo=true
export async function getGraph(req: Request, res: Response): Promise<void> {
  try {
    const nodeId = req.query['nodeId'] as string | undefined;
    const depth = Math.min(3, Math.max(1, parseInt(req.query['depth'] as string) || 1));
    const includeDemo = req.query['includeDemo'] !== 'false';

    let rootId = nodeId;
    if (!rootId) {
      const nodes = await getAllNodes();
      rootId = nodes.find(n => n.type === 'REAL')?.id;
    }

    if (!rootId) {
      res.status(404).json({ error: 'No nodes found in database' });
      return;
    }

    const data = await getSubgraph(rootId, depth, includeDemo);
    res.json(data);
  } catch (err) {
    console.error('[getGraph]', err);
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
}

// GET /api/graph/node/:id
export async function getNode(req: Request, res: Response): Promise<void> {
  try {
    const node = await getNodeById(req.params['id'] ?? '');
    if (!node) { res.status(404).json({ error: 'Node not found' }); return; }
    res.json(node);
  } catch (err) {
    console.error('[getNode]', err);
    res.status(500).json({ error: 'Failed to fetch node' });
  }
}

// GET /api/graph/path?from=xxx&to=yyy
export async function getPath(req: Request, res: Response): Promise<void> {
  try {
    const from = req.query['from'] as string;
    const to = req.query['to'] as string;
    if (!from || !to) { res.status(400).json({ error: 'from and to are required' }); return; }
    const result = await getShortestPath(from, to);
    if (!result) { res.status(404).json({ error: 'No path found' }); return; }
    res.json(result);
  } catch (err) {
    console.error('[getPath]', err);
    res.status(500).json({ error: 'Failed to compute path' });
  }
}

// GET /api/users
export async function getUsers(_req: Request, res: Response): Promise<void> {
  try {
    const nodes = await getAllNodes();
    res.json({ users: nodes, total: nodes.length });
  } catch (err) {
    console.error('[getUsers]', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// GET /api/users/rankings
export async function getNodeRankings(_req: Request, res: Response): Promise<void> {
  try {
    const rankings = await getRankings();
    res.json({ rankings, total: rankings.length });
  } catch (err) {
    console.error('[getRankings]', err);
    res.status(500).json({ error: 'Failed to compute rankings' });
  }
}
