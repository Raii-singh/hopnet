/**
 * HOPNet Backend IMDb Graph Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Loads the processed IMDb actor collaboration graph from the database folder.
 * Provides a read-only bridge to the Express routes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { EngineNode, EngineEdge } from '../../../../shared/graph-engine/src';

const PROCESSED_PATH = path.resolve(__dirname, '../../../../database/graph-providers/imdb/datasets/processed/imdb_graph.json');

export interface ImdbNode {
  id: string;
  publicId: string;
  fullName: string;
  username: string;
  company: string;
  cluster: string;
  influenceScore: number;
  connectionCount: number;
  realConnections: number;
  demoConnections: number;
  tags: string[];
  sourceConnectors: string[];
  nodeType: string;
  metadata: any;
}

export interface ImdbEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  trustScore: number;
  interactionFrequency: number;
  connectorSource: string;
  edgeType: string;
  weight: number;
}

export interface ImdbGraphData {
  nodes: ImdbNode[];
  links: ImdbEdge[];
}

// Fallback placeholder graph if pipeline hasn't been run yet
const FALLBACK_GRAPH: ImdbGraphData = {
  nodes: [
    {
      id: "nm0000102",
      publicId: "nm0000102",
      fullName: "Kevin Bacon (Pipeline Pending)",
      username: "imdb_nm0000102",
      company: "The Center of the Universe",
      cluster: "1950s",
      influenceScore: 99,
      connectionCount: 6,
      realConnections: 6,
      demoConnections: 0,
      tags: ["actor", "legend"],
      sourceConnectors: ["imdb"],
      nodeType: "REAL",
      metadata: { appearances: 100, rank: 1 }
    },
    {
      id: "nm0000190",
      publicId: "nm0000190",
      fullName: "Jack Nicholson",
      username: "imdb_nm0000190",
      company: "Born 1937",
      cluster: "1930s",
      influenceScore: 88,
      connectionCount: 4,
      realConnections: 4,
      demoConnections: 0,
      tags: ["actor"],
      sourceConnectors: ["imdb"],
      nodeType: "REAL",
      metadata: { appearances: 80, rank: 2 }
    }
  ],
  links: [
    {
      id: "e_fallback_1",
      source: "nm0000102",
      target: "nm0000190",
      relationshipType: "Co-Starred",
      trustScore: 0.85,
      interactionFrequency: 2,
      connectorSource: "imdb",
      edgeType: "REAL_EDGE",
      weight: 0.85
    }
  ]
};

export function loadImdbGraph(): ImdbGraphData {
  try {
    if (fs.existsSync(PROCESSED_PATH)) {
      const content = fs.readFileSync(PROCESSED_PATH, 'utf8');
      const parsed = JSON.parse(content);
      return {
        nodes: parsed.nodes || [],
        links: parsed.edges || []
      };
    } else {
      console.warn(`[IMDb Adapter] Processed graph not found at ${PROCESSED_PATH}. Using fallback dataset. Please run scripts/imdb/run_pipeline.ps1`);
      return FALLBACK_GRAPH;
    }
  } catch (error) {
    console.error('[IMDb Adapter] Failed to load processed IMDb graph:', error);
    return FALLBACK_GRAPH;
  }
}
