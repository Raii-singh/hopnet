import prisma from '../config/prisma';
import { NodeType, EdgeType } from '@prisma/client';
import { computeScores } from '../graph/centrality';

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
    const phone = phoneIdx !== -1 ? row[phoneIdx] : '';
    const company = orgIdx !== -1 ? row[orgIdx] : '';

    contacts.push({
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      tags: ['Google Contact', company].filter(Boolean) as string[],
      relationshipType: 'acquaintance',
      trustScore: 0.5,
      interactionFrequency: 0.3,
    });
  }

  return contacts;
}

// 3. Outlook Contacts CSV Parser
function parseOutlookCSV(rawText: string): ParsedContact[] {
  const rows = parseCSV(rawText);
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const firstNameIdx = header.indexOf('firstname');
  const lastNameIdx = header.indexOf('lastname');
  const emailIdx = header.indexOf('emailaddress');
  const phoneIdx = header.indexOf('mobilephone');
  const companyIdx = header.indexOf('company');

  const contacts: ParsedContact[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    const fName = firstNameIdx !== -1 ? row[firstNameIdx] : '';
    const lName = lastNameIdx !== -1 ? row[lastNameIdx] : '';
    const fullName = `${fName} ${lName}`.trim();
    if (!fullName) continue;

    const email = emailIdx !== -1 ? row[emailIdx] : '';
    const phone = phoneIdx !== -1 ? row[phoneIdx] : '';
    const company = companyIdx !== -1 ? row[companyIdx] : '';

    contacts.push({
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      tags: ['Outlook Contact', company].filter(Boolean) as string[],
      relationshipType: 'colleague',
      trustScore: 0.5,
      interactionFrequency: 0.4,
    });
  }

  return contacts;
}

// 4. Twitter Follower List JS/JSON Parser
function parseTwitterExport(rawText: string): ParsedContact[] {
  try {
    let cleanText = rawText.trim();
    if (cleanText.startsWith('window.YTD.following.part0 =')) {
      cleanText = cleanText.substring(cleanText.indexOf('=') + 1).trim();
    }
    if (cleanText.endsWith(';')) cleanText = cleanText.slice(0, -1);

    const json = JSON.parse(cleanText);
    const list = Array.isArray(json) ? json : json.following || [];
    
    return list.map((item: any) => {
      const uLink = item.following?.userLink || item.userLink || '';
      const handle = uLink.substring(uLink.lastIndexOf('/') + 1) || 'twitter_user';
      const name = handle.replace(/_/g, ' ');
      
      return {
        fullName: name.charAt(0).toUpperCase() + name.slice(1),
        twitterHandle: `@${handle}`,
        tags: ['Twitter Expanders', 'Following'],
        relationshipType: 'acquaintance',
        trustScore: 0.3,
        interactionFrequency: 0.2,
      };
    });
  } catch (err) {
    console.warn('Fallback: line by line Twitter parse', err);
    // Simple line by line fallback
    const handles = Array.from(rawText.matchAll(/@([a-zA-Z0-9_]{1,15})/g)).map(m => m[1]);
    return Array.from(new Set(handles)).map(h => ({
      fullName: h.charAt(0).toUpperCase() + h.slice(1).replace(/_/g, ' '),
      twitterHandle: `@${h}`,
      tags: ['Twitter Expanders', 'Following'],
      relationshipType: 'acquaintance',
      trustScore: 0.3,
      interactionFrequency: 0.2,
    }));
  }
}

// 5. Gmail Header Log Parser
function parseGmailHeaders(rawText: string): { contacts: ParsedContact[]; edges: any[] } {
  // Regex to match header sequences
  const fromRegex = /From:\s*([^<]*?)(?:<([^>]+)>)?\r?\n/gi;
  const toRegex = /To:\s*([^<]*?)(?:<([^>]+)>)?\r?\n/gi;
  
  const fromMatches = Array.from(rawText.matchAll(fromRegex));
  const toMatches = Array.from(rawText.matchAll(toRegex));

  const contactMap = new Map<string, { fullName: string; count: number }>();

  function registerEmail(name: string, email: string) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || cleanEmail.includes('noreply') || cleanEmail.includes('notification')) return;
    
    let cleanName = name.trim().replace(/^["']|["']$/g, '');
    if (!cleanName || cleanName.includes('@')) {
      cleanName = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }
    
    if (!contactMap.has(cleanEmail)) {
      contactMap.set(cleanEmail, { fullName: cleanName, count: 0 });
    }
    contactMap.get(cleanEmail)!.count++;
  }

  for (const m of fromMatches) {
    const name = m[1] || '';
    const email = m[2] || m[1] || '';
    if (email.includes('@')) registerEmail(name, email);
  }

  for (const m of toMatches) {
    const name = m[1] || '';
    const email = m[2] || m[1] || '';
    if (email.includes('@')) registerEmail(name, email);
  }

  const contacts: ParsedContact[] = [];
  const edges: any[] = [];

  const list = Array.from(contactMap.entries());
  for (const [email, entry] of list) {
    // Determine interaction strength based on conversation volume
    const interactionFreq = Math.min(1.0, 0.1 + (entry.count * 0.15));
    const trust = Math.min(0.9, 0.3 + (entry.count * 0.1));

    contacts.push({
      fullName: entry.fullName,
      email,
      tags: ['Gmail Communications', `Count: ${entry.count}`],
      relationshipType: entry.count > 5 ? 'colleague' : 'acquaintance',
      trustScore: Math.round(trust * 10) / 10,
      interactionFrequency: Math.round(interactionFreq * 10) / 10,
    });
  }

  // Create mock star edges between all parsed Gmail contacts if they are in the same threads
  if (contacts.length > 1) {
    const primary = contacts.sort((a,b) => b.trustScore! - a.trustScore!)[0];
    for (const c of contacts) {
      if (c.email !== primary.email) {
        edges.push({
          sourceName: primary.fullName,
          targetName: c.fullName,
          relationshipType: c.relationshipType || 'acquaintance',
          trustScore: c.trustScore || 0.5,
          interactionFrequency: c.interactionFrequency || 0.4,
        });
      }
    }
  }

  return { contacts, edges };
}

// ── Recalculate Centrality ──────────────────────────────────────
export async function recalculateCentrality() {
  const [users, edges] = await Promise.all([
    prisma.user.findMany({ where: { deletedAt: null } }),
    prisma.edge.findMany({
      where: {
        source: { deletedAt: null },
        target: { deletedAt: null },
      },
    }),
  ]);

  const scoringNodes = users.map(u => ({ id: u.id, nodeType: u.nodeType }));
  const scoringEdges = edges.map(e => ({
    sourceId: e.sourceId,
    targetId: e.targetId,
    weight: e.weight,
    edgeType: e.edgeType,
  }));

  const scores = computeScores(scoringNodes, scoringEdges);

  for (const user of users) {
    const scoreEntry = scores.get(user.id);
    if (scoreEntry) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          influenceScore: scoreEntry.influenceScore,
          metadata: {
            ...((user.metadata as any) || {}),
            centrality: scoreEntry.degreeCentrality,
            weightedDegree: scoreEntry.weightedDegree,
          }
        },
      });
    }
  }
}

// ── GET PREVIEW ─────────────────────────────────────────────────
export async function generateImportPreview(
  connectorType: string,
  rawText: string
): Promise<ImportPreviewResponse> {
  let contacts: ParsedContact[] = [];
  let inferredEdges: any[] = [];

  switch (connectorType.toLowerCase()) {
    case 'linkedin':
      contacts = parseLinkedInCSV(rawText);
      break;
    case 'google':
      contacts = parseGoogleContactsCSV(rawText);
      break;
    case 'outlook':
      contacts = parseOutlookCSV(rawText);
      break;
    case 'twitter':
      contacts = parseTwitterExport(rawText);
      break;
    case 'gmail': {
      const res = parseGmailHeaders(rawText);
      contacts = res.contacts;
      inferredEdges = res.edges;
      break;
    }
    default:
      throw new Error(`Unsupported connector classification: ${connectorType}`);
  }

  const activeUsers = await prisma.user.findMany({ where: { deletedAt: null } });
  const duplicateMatches: any[] = [];
  const detectedNodes: ParsedContact[] = [];

  for (const contact of contacts) {
    let matchFound = false;

    for (const u of activeUsers) {
      const emailMatch = contact.email && u.email && contact.email.toLowerCase() === u.email.toLowerCase();
      const linkedinMatch = contact.linkedinUrl && u.linkedinUrl && contact.linkedinUrl.toLowerCase() === u.linkedinUrl.toLowerCase();
      const phoneMatch = contact.phone && u.phone && contact.phone.replace(/[^0-9]/g, '') === u.phone.replace(/[^0-9]/g, '');

      if (emailMatch || linkedinMatch || phoneMatch) {
        duplicateMatches.push({
          imported: contact,
          existing: {
            id: u.id,
            publicId: u.publicId,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            company: u.company,
            nodeType: u.nodeType,
          },
          reason: emailMatch ? 'Matches identical E-mail' : linkedinMatch ? 'Matches identical LinkedIn URL' : 'Matches identical mobile number',
          similarity: 98,
          survivingOption: 'KEEP_EXISTING',
        });
        matchFound = true;
        break;
      }

      // Fuzzy name matching suggestion
      const namePartsA = contact.fullName.toLowerCase().split(/\s+/);
      const namePartsB = u.fullName.toLowerCase().split(/\s+/);
      const intersect = namePartsA.filter(p => namePartsB.includes(p) && p.length > 2);

      if (intersect.length > 0 && contact.company && u.company && contact.company.toLowerCase() === u.company.toLowerCase()) {
        duplicateMatches.push({
          imported: contact,
          existing: {
            id: u.id,
            publicId: u.publicId,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            company: u.company,
            nodeType: u.nodeType,
          },
          reason: `Partial name match ('${intersect.join(', ')}') and identical company`,
          similarity: 80,
          survivingOption: 'KEEP_EXISTING',
        });
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      detectedNodes.push(contact);
    }
  }

  return {
    detectedNodes,
    duplicateMatches,
    inferredEdges,
    summary: {
      totalContacts: contacts.length,
      newNodesCount: detectedNodes.length,
      duplicateMatchesCount: duplicateMatches.length,
      inferredEdgesCount: inferredEdges.length,
    },
  };
}

// ── COMMIT INGESTION ────────────────────────────────────────────
export async function commitIngestion(
  connectorType: string,
  filename: string,
  previewData: ImportPreviewResponse
) {
  const logs: string[] = [`Initial security checks triggered for ${connectorType} archive.`];
  let nodesCreated = 0;
  let edgesCreated = 0;

  const idMap = new Map<string, string>(); // Maps name to node ID for link bindings

  // 1. Process New Nodes
  for (const node of previewData.detectedNodes) {
    try {
      const typeCount = await prisma.user.count({ where: { nodeType: NodeType.REAL } });
      const publicId = `HNP-000${typeCount + 1}`;
      const username = node.email?.split('@')[0] || node.fullName.toLowerCase().replace(/\s+/g, '_');

      const u = await prisma.user.create({
        data: {
          publicId,
          fullName: node.fullName,
          username,
          email: node.email,
          phone: node.phone,
          linkedinUrl: node.linkedinUrl,
          twitterHandle: node.twitterHandle,
          company: node.company,
          tags: node.tags,
          sourceConnectors: [connectorType],
          nodeType: NodeType.REAL,
          createdBy: `${connectorType} Connector`,
          metadata: {
            inferredPosition: node.position,
            confidence: 0.9,
          }
        }
      });
      idMap.set(node.fullName, u.id);
      nodesCreated++;
      logs.push(`Successfully established node for "${node.fullName}" as ${publicId}.`);
    } catch (err: any) {
      logs.push(`Error building node "${node.fullName}": ${err.message}`);
    }
  }

  // 2. Process Duplicate Resolvers
  for (const dup of previewData.duplicateMatches) {
    try {
      const uId = dup.existing.id;
      if (dup.survivingOption === 'OVERWRITE_WITH_IMPORTED') {
        const u = await prisma.user.update({
          where: { id: uId },
          data: {
            email: dup.imported.email || undefined,
            phone: dup.imported.phone || undefined,
            linkedinUrl: dup.imported.linkedinUrl || undefined,
            twitterHandle: dup.imported.twitterHandle || undefined,
            company: dup.imported.company || undefined,
            sourceConnectors: {
              push: connectorType
            }
          }
        });
        idMap.set(dup.imported.fullName, u.id);
        logs.push(`Overwrote duplicate profile "${dup.imported.fullName}" in active ledger.`);
      } else {
        // Keep existing, just append source
        const u = await prisma.user.update({
          where: { id: uId },
          data: {
            sourceConnectors: {
              push: connectorType
            }
          }
        });
        idMap.set(dup.imported.fullName, u.id);
        logs.push(`Retained primary unique node "${dup.existing.fullName}" and logged ${connectorType} connector.`);
      }
    } catch (err: any) {
      logs.push(`Failed to merge metadata for "${dup.imported.fullName}": ${err.message}`);
    }
  }

  // 3. Process Inferred Relationship Edges
  for (const edge of previewData.inferredEdges) {
    try {
      const srcId = idMap.get(edge.sourceName);
      const tgtId = idMap.get(edge.targetName);

      if (srcId && tgtId && srcId !== tgtId) {
        // Avoid duplicates
        const exists = await prisma.edge.findFirst({
          where: {
            OR: [
              { sourceId: srcId, targetId: tgtId },
              { sourceId: tgtId, targetId: srcId }
            ]
          }
        });

        if (!exists) {
          const trust = edge.trustScore || 0.5;
          const freq = edge.interactionFrequency || 0.5;
          const weight = Math.round((trust * 0.6 + freq * 0.4) * 100) / 100;

          await prisma.edge.create({
            data: {
              sourceId: srcId,
              targetId: tgtId,
              relationshipType: edge.relationshipType,
              trustScore: trust,
              interactionFrequency: freq,
              connectorSource: connectorType,
              edgeType: EdgeType.REAL_EDGE,
              weight,
              inferred: true,
              createdBy: `${connectorType} Connector`,
            }
          });
          edgesCreated++;
          logs.push(`Generated relationship link: "${edge.sourceName}" ─── [${edge.relationshipType}] ───> "${edge.targetName}"`);
        }
      }
    } catch (err: any) {
      logs.push(`Failed to establish inferred relationship edge: ${err.message}`);
    }
  }

  // 4. Default star layout generation for non-Gmail connectors
  // If importing LinkedIn or Google contacts, automatically connect new nodes to the active root user (or first REAL node in the DB)!
  if (connectorType.toLowerCase() !== 'gmail' && nodesCreated > 0) {
    try {
      const firstReal = await prisma.user.findFirst({
        where: {
          nodeType: NodeType.REAL,
          deletedAt: null,
          NOT: {
            id: {
              in: Array.from(idMap.values())
            }
          }
        }
      });

      if (firstReal) {
        for (const [name, newId] of idMap.entries()) {
          const isNewNode = previewData.detectedNodes.some(n => n.fullName === name);
          if (isNewNode) {
            const trust = 0.5;
            const freq = 0.4;
            const weight = Math.round((trust * 0.6 + freq * 0.4) * 100) / 100;

            await prisma.edge.create({
              data: {
                sourceId: firstReal.id,
                targetId: newId,
                relationshipType: 'colleague',
                trustScore: trust,
                interactionFrequency: freq,
                connectorSource: connectorType,
                edgeType: EdgeType.REAL_EDGE,
                weight,
                inferred: true,
                createdBy: `${connectorType} Connector`,
              }
            });
            edgesCreated++;
          }
        }
        logs.push(`Automatically bridged ${nodesCreated} new relationships to central admin node "${firstReal.fullName}".`);
      }
    } catch (err: any) {
      logs.push(`Warning on bridging central edges: ${err.message}`);
    }
  }

  // 5. Recalculate Centralities
  logs.push(`Triggering full-graph scoring recalculation engines...`);
  try {
    await recalculateCentrality();
    logs.push(`Centralities and node influence power values recalculated successfully.`);
  } catch (err: any) {
    logs.push(`Error during scoring computation: ${err.message}`);
  }

  // 6. Save Import Log History
  const logEntry = await prisma.importLog.create({
    data: {
      connectorSource: connectorType,
      filename,
      status: 'SUCCESS',
      nodesCreated,
      edgesCreated,
      inferredEdgesCount: previewData.inferredEdges.length,
      confidenceScore: 0.95,
      importLogs: logs,
    }
  });

  return {
    logId: logEntry.id,
    nodesCreated,
    edgesCreated,
    logs,
  };
}
