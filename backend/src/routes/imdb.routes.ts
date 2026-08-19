/**
 * Express Route Handlers for IMDb Provider API
 * ─────────────────────────────────────────────────────────────────────────────
 * Exposes endpoints for retrieving the actor-collaboration network,
 * computing short paths (Six Degrees of Separation) between actors,
 * and fetching high-level graph metrics.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { loadImdbGraph } from '../graph-providers/imdb/imdb.adapter';
import { dijkstra, reconstructPath, EngineNode, EngineEdge } from '../../../shared/graph-engine/src';

const router = Router();

// ── GET /api/imdb/graph ──────────────────────────────────────────────────────
router.get('/graph', (req: Request, res: Response) => {
  try {
    const graphData = loadImdbGraph();
    res.json(graphData);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch IMDb graph', details: error.message });
  }
});

// ── GET /api/imdb/path ───────────────────────────────────────────────────────
router.get('/path', (req: Request, res: Response) => {
  const { from, to } = req.query;

  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
    res.status(400).json({ error: 'Missing active target query params: "from" and "to" are required.' });
    return;
  }

  try {
    const graphData = loadImdbGraph();

    // Map Imdb nodes & links to Engine schema
    const engineNodes: EngineNode[] = graphData.nodes.map(n => ({
      id: n.id,
      kind: 'ACTOR' as any
    }));

    const engineEdges: EngineEdge[] = graphData.links.map(l => ({
      id: l.id,
      sourceId: typeof l.source === 'string' ? l.source : (l.source as any).id,
      targetId: typeof l.target === 'string' ? l.target : (l.target as any).id,
      kind: 'COLLABORATION' as any,
      weight: l.weight
    }));

    // Find if both nodes exist in the dataset
    const startNode = graphData.nodes.find(n => n.id === from || n.fullName.toLowerCase() === from.toLowerCase());
    const endNode = graphData.nodes.find(n => n.id === to || n.fullName.toLowerCase() === to.toLowerCase());

    if (!startNode || !endNode) {
      res.status(404).json({ error: 'One or both of the actors could not be found in the Top N dataset.' });
      return;
    }

    // Run Dijkstra shortest path
    const dijkstraRes = dijkstra(startNode.id, engineNodes, engineEdges, () => true);
    const pathNodeIds = reconstructPath(endNode.id, dijkstraRes.previous);

    if (pathNodeIds.length === 0 || pathNodeIds[0] !== startNode.id) {
      res.status(404).json({ error: `No path exists between ${startNode.fullName} and ${endNode.fullName}.` });
      return;
    }

    // Reconstruct complete node and link objects for the path
    const pathNodes = pathNodeIds.map(id => graphData.nodes.find(n => n.id === id)!);
    const pathLinks: any[] = [];

    for (let i = 0; i < pathNodeIds.length - 1; i++) {
      const u = pathNodeIds[i];
      const v = pathNodeIds[i + 1];
      const link = graphData.links.find(l => {
        const src = typeof l.source === 'string' ? l.source : (l.source as any).id;
        const tgt = typeof l.target === 'string' ? l.target : (l.target as any).id;
        return (src === u && tgt === v) || (src === v && tgt === u);
      });
      if (link) pathLinks.push(link);
    }

    res.json({
      nodes: pathNodes,
      links: pathLinks,
      hops: pathNodeIds.length - 1
    });

  } catch (error: any) {
    res.status(500).json({ error: 'Failed to compute shortest path', details: error.message });
  }
});

// ── GET /api/imdb/stats ──────────────────────────────────────────────────────
router.get('/stats', (req: Request, res: Response) => {
  try {
    const graphData = loadImdbGraph();

    const avgAppearances = graphData.nodes.reduce((sum, n) => sum + (n.metadata?.appearances || 0), 0) / (graphData.nodes.length || 1);
    const maxAppearances = Math.max(...graphData.nodes.map(n => n.metadata?.appearances || 0));

    res.json({
      totalActors: graphData.nodes.length,
      totalCollaborations: graphData.links.length,
      avgAppearances: Math.round(avgAppearances * 10) / 10,
      maxAppearances,
      provider: 'imdb',
      capabilities: {
        readOnly: true,
        supportsCRUD: false,
        supportsPathfinding: true,
        supportsCentrality: true
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch graph stats', details: error.message });
  }
});

export default router;
