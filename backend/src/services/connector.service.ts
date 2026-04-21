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
    }
  }
  if (col || row.length > 0) {
    row.push(col.trim());
    lines.push(row);
  }
  return lines;
}

// ── Specific Connector Parsers ──────────────────────────────────

// 1. LinkedIn Connections.csv Parser
function parseLinkedInCSV(rawText: string): ParsedContact[] {
  const rows = parseCSV(rawText);
  if (rows.length < 2) return [];

  // Find header index
  const header = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const firstNameIdx = header.indexOf('firstname');
  const lastNameIdx = header.indexOf('lastname');
  const emailIdx = header.indexOf('emailaddress');
  const companyIdx = header.indexOf('company');
  const positionIdx = header.indexOf('position');

  const contacts: ParsedContact[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    const fName = firstNameIdx !== -1 ? row[firstNameIdx] : '';
    const lName = lastNameIdx !== -1 ? row[lastNameIdx] : '';
    const fullName = `${fName} ${lName}`.trim();
    if (!fullName) continue;

    const email = emailIdx !== -1 ? row[emailIdx] : '';
    const company = companyIdx !== -1 ? row[companyIdx] : '';
    const position = positionIdx !== -1 ? row[positionIdx] : '';

    contacts.push({
      fullName,
      email: email || undefined,
      company: company || undefined,
      position: position || undefined,
      linkedinUrl: `https://linkedin.com/in/${fullName.toLowerCase().replace(/\s+/g, '-')}`,
      tags: ['LinkedIn Connection', company].filter(Boolean) as string[],
      relationshipType: 'colleague',
      trustScore: 0.6,
      interactionFrequency: 0.4,
    });
  }

  return contacts;
}

// 2. Google Contacts CSV Parser
function parseGoogleContactsCSV(rawText: string): ParsedContact[] {
  const rows = parseCSV(rawText);
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.toLowerCase());
  const nameIdx = header.findIndex(h => h.includes('name') && !h.includes('given') && !h.includes('family'));
  const givenNameIdx = header.indexOf('given name');
  const familyNameIdx = header.indexOf('family name');
  const emailIdx = header.findIndex(h => h.includes('e-mail') && h.includes('value'));
  const phoneIdx = header.findIndex(h => h.includes('phone') && h.includes('value'));
  const orgIdx = header.findIndex(h => h.includes('organization') && h.includes('name'));

  const contacts: ParsedContact[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    let fullName = '';
    if (nameIdx !== -1 && row[nameIdx]) {
      fullName = row[nameIdx];
    } else {
      const gName = givenNameIdx !== -1 ? row[givenNameIdx] : '';
      const fName = familyNameIdx !== -1 ? row[familyNameIdx] : '';
      fullName = `${gName} ${fName}`.trim();
    }
    if (!fullName) continue;

    const email = emailIdx !== -1 ? row[emailIdx] : '';
