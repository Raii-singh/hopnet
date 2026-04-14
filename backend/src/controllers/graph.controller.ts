import { Request, Response } from 'express';
import {
  getSubgraph,
  getNodeById,
  getNodeByPublicId,
  getAllNodes,
  getRankings,
  getShortestPath,
  createUser,
  updateUser,
  softDeleteUser,
  createEdge,
  updateEdge,
  deleteEdge,
  mergeUsers,
  detectDuplicates,
} from '../services/graph.service';
import { NodeType } from '@prisma/client';

// GET /api/graph?nodeId=xxx&depth=1&includeDemo=true
export async function getGraph(req: Request, res: Response): Promise<void> {
  try {
    const nodeId = req.query['nodeId'] as string | undefined;
    const depth = Math.min(3, Math.max(1, parseInt(req.query['depth'] as string) || 1));
    const includeDemo = req.query['includeDemo'] !== 'false';

    let rootId = nodeId;
    if (!rootId) {
      const nodes = await getAllNodes();
      rootId = nodes.find(n => n.nodeType === NodeType.REAL)?.id;
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
    const node = await getNodeById(req.params['id'] as string);
    if (!node) { res.status(404).json({ error: 'Node not found' }); return; }
    res.json(node);
  } catch (err) {
    console.error('[getNode]', err);
    res.status(500).json({ error: 'Failed to fetch node' });
  }
}

// GET /api/users/profile/:publicId
export async function getNodeProfile(req: Request, res: Response): Promise<void> {
  try {
    const node = await getNodeByPublicId(req.params['publicId'] as string);
    if (!node) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(node);
  } catch (err) {
    console.error('[getNodeProfile]', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
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

// ── WORKSPACE: User CRUD Controller ───────────────────────────
export async function createUserNode(req: Request, res: Response): Promise<void> {
  try {
    const node = await createUser(req.body);
    res.status(201).json(node);
  } catch (err: any) {
    console.error('[createUserNode]', err);
    res.status(400).json({ error: err.message || 'Failed to create user' });
  }
}

export async function updateUserNode(req: Request, res: Response): Promise<void> {
  try {
    const node = await updateUser(req.params['id'] as string, req.body);
    res.json(node);
  } catch (err: any) {
    console.error('[updateUserNode]', err);
    res.status(400).json({ error: err.message || 'Failed to update user' });
  }
}

export async function deleteUserNode(req: Request, res: Response): Promise<void> {
  try {
    await softDeleteUser(req.params['id'] as string);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[deleteUserNode]', err);
    res.status(400).json({ error: err.message || 'Failed to soft delete user' });
  }
}

// ── WORKSPACE: Relationship CRUD Controller ───────────────────
export async function createRelationship(req: Request, res: Response): Promise<void> {
  try {
    const link = await createEdge(req.body);
    res.status(201).json(link);
  } catch (err: any) {
    console.error('[createRelationship]', err);
    res.status(400).json({ error: err.message || 'Failed to establish connection' });
  }
}

export async function updateRelationship(req: Request, res: Response): Promise<void> {
  try {
    const link = await updateEdge(req.params['id'] as string, req.body);
    res.json(link);
  } catch (err: any) {
    console.error('[updateRelationship]', err);
    res.status(400).json({ error: err.message || 'Failed to update connection' });
  }
}

export async function deleteRelationship(req: Request, res: Response): Promise<void> {
  try {
    await deleteEdge(req.params['id'] as string);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[deleteRelationship]', err);
    res.status(400).json({ error: err.message || 'Failed to delete connection' });
  }
}

// ── WORKSPACE: Merge & Duplicate suggestions ──────────────────
export async function getDuplicates(req: Request, res: Response): Promise<void> {
  try {
    const suggestions = await detectDuplicates();
    res.json({ suggestions });
  } catch (err: any) {
    console.error('[getDuplicates]', err);
    res.status(500).json({ error: 'Failed to detect duplicates' });
  }
}

export async function mergeUserIdentities(req: Request, res: Response): Promise<void> {
  try {
    const { sourceId, targetId } = req.body;
    if (!sourceId || !targetId) {
      res.status(400).json({ error: 'sourceId and targetId are required' });
      return;
    }
    const targetNode = await mergeUsers(sourceId, targetId);
    res.json({ success: true, targetNode });
  } catch (err: any) {
    console.error('[mergeUserIdentities]', err);
    res.status(400).json({ error: err.message || 'Failed to merge users' });
  }
}
