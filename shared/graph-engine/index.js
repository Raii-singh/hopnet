/**
 * HOPNet Shared Graph Engine — JavaScript Entry Point for Node.js Scripts
 * ─────────────────────────────────────────────────────────────────────────────
 * This is a pure-JS re-export of the shared graph engine.
 * Used by the IMDb preprocessing pipeline scripts (which can't run TypeScript).
 *
 * The TypeScript source lives in src/. This file is the CJS-compatible
 * entry point for Node.js require() calls from scripts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ── Centrality / Scoring ─────────────────────────────────────────────────────

/**
 * Compute degree centrality and weighted scores for all nodes.
 * @param {Array<{id: string}>} nodes
 * @param {Array<{id: string, sourceId: string, targetId: string, weight: number, kind: string}>} edges
 * @param {Function} realEdgePredicate - returns true for "primary" edges
 * @returns {Map<string, object>}
 */
function computeScores(nodes, edges, realEdgePredicate = (e) => e.kind === 'REAL_EDGE') {
  const scores = new Map();
  const n = nodes.length;

  for (const node of nodes) {
    scores.set(node.id, {
      id: node.id,
      degreeCentrality: 0,
      weightedDegree: 0,
      realConnectionRatio: 0,
      influenceScore: 0,
    });
  }

  const edgesByNode = new Map();
  for (const edge of edges) {
    if (!edgesByNode.has(edge.sourceId)) edgesByNode.set(edge.sourceId, []);
    if (!edgesByNode.has(edge.targetId)) edgesByNode.set(edge.targetId, []);
    edgesByNode.get(edge.sourceId).push(edge);
    edgesByNode.get(edge.targetId).push(edge);
  }

  const maxPossibleDegree = Math.max(1, n - 1);

  for (const node of nodes) {
    const nodeEdges = edgesByNode.get(node.id) ?? [];
    const degree = nodeEdges.length;
    const weightedDeg = nodeEdges.reduce((sum, e) => sum + (e.weight || 0), 0);
    const realEdgeCount = nodeEdges.filter(realEdgePredicate).length;
    const realRatio = degree > 0 ? realEdgeCount / degree : 0;

    const degreeCentrality = degree / maxPossibleDegree;

    // Composite influence: 40% degree + 35% weighted + 25% real ratio
    const influenceScore = Math.min(
      100,
      Math.round(
        degreeCentrality * 40 +
        Math.min(1, weightedDeg / 10) * 35 +
        realRatio * 25
      )
    );

    scores.set(node.id, {
      id: node.id,
      degreeCentrality: Math.round(degreeCentrality * 1000) / 1000,
      weightedDegree: Math.round(weightedDeg * 100) / 100,
      realConnectionRatio: Math.round(realRatio * 100) / 100,
      influenceScore,
    });
  }

  return scores;
}

/**
 * Rank nodes by composite influence score (descending).
 * @param {Map<string, object>} scores
 * @returns {Array<object>}
 */
function rankNodes(scores) {
  return Array.from(scores.values())
    .sort((a, b) => b.influenceScore - a.influenceScore)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// ── BFS Subgraph ─────────────────────────────────────────────────────────────

/**
 * BFS subgraph expansion from a root node.
 * @param {string} rootId
 * @param {number} maxDepth
 * @param {boolean} includeDemo
 * @param {Array<{id: string, kind: string}>} allNodes
 * @param {Array<{id: string, sourceId: string, targetId: string}>} allEdges
 * @param {Function} constraint - (from, to) => boolean
 * @param {string[]} demoKinds
 * @returns {{ visitedNodeIds: Set<string>, visitedEdgeIds: Set<string>, hopMap: Map<string, number> }}
 */
function bfsSubgraph(
  rootId,
  maxDepth,
  includeDemo,
  allNodes,
  allEdges,
  constraint = () => true,
  demoKinds = ['DEMO']
) {
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  const adj = new Map();

  for (const edge of allEdges) {
    if (!adj.has(edge.sourceId)) adj.set(edge.sourceId, []);
    if (!adj.has(edge.targetId)) adj.set(edge.targetId, []);
    adj.get(edge.sourceId).push({ neighborId: edge.targetId, edgeId: edge.id });
    adj.get(edge.targetId).push({ neighborId: edge.sourceId, edgeId: edge.id });
  }

  const visitedNodes = new Set([rootId]);
  const visitedEdges = new Set();
  const hopMap = new Map([[rootId, 0]]);
  const queue = [{ nodeId: rootId, hop: 0 }];

  while (queue.length > 0) {
    const { nodeId, hop } = queue.shift();
    if (hop >= maxDepth) continue;

    const currentNode = nodeMap.get(nodeId);
    if (!currentNode) continue;

    for (const { neighborId, edgeId } of adj.get(nodeId) ?? []) {
      const neighborNode = nodeMap.get(neighborId);
      if (!neighborNode) continue;
      if (!constraint(currentNode, neighborNode)) continue;
      if (!includeDemo && demoKinds.includes(neighborNode.kind)) continue;

      visitedEdges.add(edgeId);

      if (!visitedNodes.has(neighborId)) {
        visitedNodes.add(neighborId);
        hopMap.set(neighborId, hop + 1);
        queue.push({ nodeId: neighborId, hop: hop + 1 });
      }
    }
  }

  return { visitedNodeIds: visitedNodes, visitedEdgeIds: visitedEdges, hopMap };
}

// ── Constraints ───────────────────────────────────────────────────────────────

/** IMDb: no traversal constraints */
const imdbConstraint = () => true;

/** College: block DEMO → REAL traversal */
const collegeConstraint = (from, to) => {
  if (from.kind === 'DEMO' && to.kind === 'REAL') return false;
  return true;
};

/** No constraints */
const noConstraint = () => true;

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  computeScores,
  rankNodes,
  bfsSubgraph,
  imdbConstraint,
  collegeConstraint,
  noConstraint,
};
