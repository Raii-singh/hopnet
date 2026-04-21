import prisma from '../config/prisma';
import { NodeType } from '../domain/person';
import { getAllActiveRealNodes } from '../repositories/graph.repository';
import { createPerson, updatePerson } from '../repositories/person.repository';
import { createRelationship } from '../repositories/relationship.repository';

export interface ParsedContact {
  fullName: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  company?: string;
  position?: string;
  tags: string[];
  relationshipType?: string;
  trustScore?: number;
  interactionFrequency?: number;
}

export interface ImportPreviewResponse {
  detectedNodes: ParsedContact[];
  duplicateMatches: {
    imported: ParsedContact;
    existing: {
      id: string;
      publicId: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      company: string | null;
      nodeType: NodeType;
    };
    reason: string;
    similarity: number;
    survivingOption: 'KEEP_EXISTING' | 'OVERWRITE_WITH_IMPORTED';
  }[];
  inferredEdges: {
    sourceName: string;
    targetName: string;
    relationshipType: string;
    trustScore: number;
    interactionFrequency: number;
  }[];
  summary: {
    totalContacts: number;
    newNodesCount: number;
    duplicateMatchesCount: number;
    inferredEdgesCount: number;
  };
}

// ── Standard RFC 4180 CSV Parser ────────────────────────────────
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let col = "";
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        col += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(col.trim());
      col = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(col.trim());
      if (row.length > 0 && row.some(c => c !== "")) {
        lines.push(row);
      }
      row = [];
      col = "";
    } else {
      col += char;
