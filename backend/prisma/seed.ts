/**
 * HOPNet CollegeGraph — PostgreSQL Seed Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds the database dynamically by reading from the canonical CollegeGraph
 * dataset snapshot.
 *
 * Source Snapshot:
 *   database/graph-providers/college/datasets/snapshots/seed_v1_snapshot.json
 * ─────────────────────────────────────────────────────────────────────────────
 */
import 'dotenv/config';
import { PrismaClient, NodeType, EdgeType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding HOPNet V2 database from canonical snapshot...\n');

  // 1. Clean up existing records
  await prisma.edge.deleteMany();
  await prisma.user.deleteMany();

  // 2. Load and parse the canonical snapshot
  const snapshotPath = path.resolve(__dirname, '../../database/graph-providers/college/datasets/snapshots/seed_v1_snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Canonical seed snapshot not found at path: ${snapshotPath}`);
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const { realNodes, demoNodes, edges } = snapshot;

  const pad = (num: number, size: number) => {
    let s = num + '';
    while (s.length < size) s = '0' + s;
    return s;
  };

  // Keep a mapping from publicId (HNP-..., DNP-...) to generated PostgreSQL UUID id
  const publicIdToUuidMap = new Map<string, string>();

  // 3. Seed REAL NODES
  console.log(`Seeding ${realNodes.length} REAL nodes...`);
  const seededRealUsers = await Promise.all(
    realNodes.map(async (u: any) => {
      const username = u.fullName.toLowerCase().replace(/\s+/g, '_');
      const user = await prisma.user.create({
        data: {
          publicId: u.publicId,
          fullName: u.fullName,
          username,
          email: `${username}@hopnet.io`,
          phone: `+91 98300 ${pad(u.seq, 5)}`,
          linkedinUrl: `https://linkedin.com/in/${u.linkedin}`,
          twitterHandle: `@${u.twitter}`,
          instagramHandle: `@${username}_ig`,
          company: u.company,
          cluster: u.cluster,
          influenceScore: u.influenceScore,
          tags: u.tags,
          sourceConnectors: ['LinkedIn', 'Manual'],
          metadata: { verified: true, role: u.role || 'Member' },
          nodeType: NodeType.REAL,
        },
      });
      publicIdToUuidMap.set(u.publicId, user.id);
      return user;
    })
  );

  // 4. Seed DEMO NODES
  console.log(`Seeding ${demoNodes.length} DEMO nodes...`);
  const seededDemoUsers = await Promise.all(
    demoNodes.map(async (u: any) => {
      const username = u.fullName.toLowerCase().replace(/\s+/g, '_');
      const user = await prisma.user.create({
        data: {
          publicId: u.publicId,
          fullName: u.fullName,
          username,
          email: `${username}@demo.hopnet.io`,
          phone: `+1 555 019 ${pad(u.seq, 3)}`,
          linkedinUrl: `https://linkedin.com/in/demo-${username}`,
          twitterHandle: `@demo_${username}`,
          instagramHandle: `@demo_${username}_ig`,
          company: u.company,
          cluster: u.cluster,
          influenceScore: u.influenceScore,
          tags: u.tags,
          sourceConnectors: ['DemoGenerator'],
          metadata: { demoNode: true, simulated: true },
          nodeType: NodeType.DEMO,
        },
      });
      publicIdToUuidMap.set(u.publicId, user.id);
      return user;
    })
  );

  console.log(`✅ Created ${seededRealUsers.length} REAL nodes + ${seededDemoUsers.length} DEMO nodes`);

  // 5. Seed EDGES with dynamic weighted scoring
  console.log(`Seeding ${edges.length} edges...`);
  const seededEdges = await Promise.all(
    edges.map(async (e: any) => {
      const sourceId = publicIdToUuidMap.get(e.source);
      const targetId = publicIdToUuidMap.get(e.target);

      if (!sourceId || !targetId) {
        throw new Error(`Failed to find generated UUID for edge: ${e.source} -> ${e.target}`);
      }

      // Calculate weight based on formula: weight = trustScore * 0.6 + interactionFrequency * 0.4
      const weight = Math.round((e.trustScore * 0.6 + e.interactionFrequency * 0.4) * 100) / 100;

      return prisma.edge.create({
        data: {
          sourceId,
          targetId,
          relationshipType: e.relationshipType,
          trustScore: e.trustScore,
          interactionFrequency: e.interactionFrequency,
          connectorSource: e.connectorSource,
          edgeType: e.edgeType as EdgeType,
          weight,
        },
      });
    })
  );

  console.log(`✅ Created ${seededEdges.length} edges`);
  console.log('\n🎉 Seed complete!\n');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
