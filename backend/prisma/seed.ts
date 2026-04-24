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
