import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding HOPNet database...\n');

  // Clean up first
  await prisma.edge.deleteMany();
  await prisma.user.deleteMany();

  // ── REAL NODES ──────────────────────────────────────────────
  const realUsers = await Promise.all([
    prisma.user.create({ data: { name: 'Aryan Singh',     type: 'REAL', cluster: 'Tech',     influenceScore: 94 } }),
    prisma.user.create({ data: { name: 'Priya Mehta',     type: 'REAL', cluster: 'Tech',     influenceScore: 78 } }),
    prisma.user.create({ data: { name: 'Rohan Verma',     type: 'REAL', cluster: 'Finance',  influenceScore: 72 } }),
    prisma.user.create({ data: { name: 'Sneha Kapoor',    type: 'REAL', cluster: 'Design',   influenceScore: 68 } }),
    prisma.user.create({ data: { name: 'Karan Nair',      type: 'REAL', cluster: 'Tech',     influenceScore: 65 } }),
    prisma.user.create({ data: { name: 'Ananya Rao',      type: 'REAL', cluster: 'Academia', influenceScore: 61 } }),
    prisma.user.create({ data: { name: 'Vikram Sharma',   type: 'REAL', cluster: 'Business', influenceScore: 59 } }),
    prisma.user.create({ data: { name: 'Meera Joshi',     type: 'REAL', cluster: 'Marketing',influenceScore: 54 } }),
    prisma.user.create({ data: { name: 'Aditya Kumar',    type: 'REAL', cluster: 'Tech',     influenceScore: 50 } }),
    prisma.user.create({ data: { name: 'Ishaan Malhotra', type: 'REAL', cluster: 'Finance',  influenceScore: 47 } }),
    prisma.user.create({ data: { name: 'Divya Patel',     type: 'REAL', cluster: 'Design',   influenceScore: 44 } }),
    prisma.user.create({ data: { name: 'Rahul Bose',      type: 'REAL', cluster: 'Academia', influenceScore: 42 } }),
    prisma.user.create({ data: { name: 'Neha Gupta',      type: 'REAL', cluster: 'Tech',     influenceScore: 39 } }),
    prisma.user.create({ data: { name: 'Siddharth Rao',   type: 'REAL', cluster: 'Business', influenceScore: 36 } }),
    prisma.user.create({ data: { name: 'Tanvi Shah',      type: 'REAL', cluster: 'Marketing',influenceScore: 33 } }),
  ]);

  const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15] = realUsers;

  // ── DEMO NODES ──────────────────────────────────────────────
  const demoUsers = await Promise.all([
    prisma.user.create({ data: { name: 'Alex Chen',       type: 'DEMO', cluster: 'Tech',     influenceScore: 55 } }),
    prisma.user.create({ data: { name: 'Maria Rodriguez', type: 'DEMO', cluster: 'Business', influenceScore: 48 } }),
    prisma.user.create({ data: { name: 'James Wright',    type: 'DEMO', cluster: 'Finance',  influenceScore: 41 } }),
    prisma.user.create({ data: { name: 'Yuki Tanaka',     type: 'DEMO', cluster: 'Design',   influenceScore: 38 } }),
    prisma.user.create({ data: { name: 'Lena Müller',     type: 'DEMO', cluster: 'Academia', influenceScore: 35 } }),
    prisma.user.create({ data: { name: 'Omar Hassan',     type: 'DEMO', cluster: 'Tech',     influenceScore: 33 } }),
    prisma.user.create({ data: { name: 'Sofia Andreev',   type: 'DEMO', cluster: 'Marketing',influenceScore: 30 } }),
    prisma.user.create({ data: { name: 'Carlos Lima',     type: 'DEMO', cluster: 'Business', influenceScore: 28 } }),
    prisma.user.create({ data: { name: 'Nina Popova',     type: 'DEMO', cluster: 'Finance',  influenceScore: 26 } }),
    prisma.user.create({ data: { name: 'Thomas Bauer',    type: 'DEMO', cluster: 'Tech',     influenceScore: 24 } }),
    prisma.user.create({ data: { name: 'Aiko Watanabe',   type: 'DEMO', cluster: 'Academia', influenceScore: 22 } }),
    prisma.user.create({ data: { name: 'Lucas Petit',     type: 'DEMO', cluster: 'Design',   influenceScore: 20 } }),
  ]);

  const [d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12] = demoUsers;

  console.log(`✅ Created ${realUsers.length} REAL nodes + ${demoUsers.length} DEMO nodes`);

  // ── EDGES ────────────────────────────────────────────────────
  // Helper
  const edge = (sourceId: string, targetId: string, edgeType: string, weight: number) =>
    prisma.edge.create({ data: { sourceId, targetId, edgeType, weight } });

  // REAL ↔ REAL edges
  const realEdges = await Promise.all([
    edge(r1.id, r2.id, 'REAL_EDGE', 0.92),
    edge(r1.id, r3.id, 'REAL_EDGE', 0.78),
    edge(r1.id, r4.id, 'REAL_EDGE', 0.85),
    edge(r1.id, r5.id, 'REAL_EDGE', 0.71),
    edge(r1.id, r7.id, 'REAL_EDGE', 0.76),
    edge(r2.id, r4.id, 'REAL_EDGE', 0.67),
    edge(r2.id, r7.id, 'REAL_EDGE', 0.63),
    edge(r3.id, r10.id,'REAL_EDGE', 0.74),
    edge(r3.id, r7.id, 'REAL_EDGE', 0.60),
    edge(r4.id, r11.id,'REAL_EDGE', 0.62),
    edge(r5.id, r6.id, 'REAL_EDGE', 0.69),
    edge(r6.id, r12.id,'REAL_EDGE', 0.58),
    edge(r7.id, r8.id, 'REAL_EDGE', 0.55),
    edge(r8.id, r9.id, 'REAL_EDGE', 0.51),
    edge(r9.id, r11.id,'REAL_EDGE', 0.48),
    edge(r9.id, r13.id,'REAL_EDGE', 0.52),
    edge(r10.id,r14.id,'REAL_EDGE', 0.44),
    edge(r12.id,r13.id,'REAL_EDGE', 0.46),
    edge(r13.id,r14.id,'REAL_EDGE', 0.43),
    edge(r14.id,r15.id,'REAL_EDGE', 0.40),
  ]);

  // REAL → DEMO edges (allowed)
  const mixedEdges = await Promise.all([
    edge(r1.id, d1.id, 'DEMO_EDGE', 0.45),
    edge(r2.id, d2.id, 'DEMO_EDGE', 0.40),
    edge(r3.id, d3.id, 'DEMO_EDGE', 0.38),
    edge(r4.id, d4.id, 'DEMO_EDGE', 0.36),
    edge(r5.id, d1.id, 'DEMO_EDGE', 0.35),
    edge(r6.id, d5.id, 'DEMO_EDGE', 0.33),
    edge(r7.id, d2.id, 'DEMO_EDGE', 0.32),
    edge(r8.id, d7.id, 'DEMO_EDGE', 0.30),
    edge(r9.id, d6.id, 'DEMO_EDGE', 0.28),
    edge(r10.id,d3.id, 'DEMO_EDGE', 0.26),
    edge(r11.id,d4.id, 'DEMO_EDGE', 0.24),
    edge(r12.id,d5.id, 'DEMO_EDGE', 0.22),
    edge(r13.id,d6.id, 'DEMO_EDGE', 0.20),
    edge(r14.id,d7.id, 'DEMO_EDGE', 0.18),
    edge(r15.id,d8.id, 'DEMO_EDGE', 0.16),
  ]);

  // DEMO ↔ DEMO edges
  const demoEdges = await Promise.all([
    edge(d1.id, d6.id,  'DEMO_EDGE', 0.50),
    edge(d1.id, d10.id, 'DEMO_EDGE', 0.42),
    edge(d1.id, d2.id,  'DEMO_EDGE', 0.46),
    edge(d2.id, d8.id,  'DEMO_EDGE', 0.44),
    edge(d2.id, d7.id,  'DEMO_EDGE', 0.38),
    edge(d3.id, d9.id,  'DEMO_EDGE', 0.39),
    edge(d3.id, d8.id,  'DEMO_EDGE', 0.34),
    edge(d4.id, d12.id, 'DEMO_EDGE', 0.35),
    edge(d5.id, d11.id, 'DEMO_EDGE', 0.32),
    edge(d6.id, d10.id, 'DEMO_EDGE', 0.30),
    edge(d7.id, d8.id,  'DEMO_EDGE', 0.28),
    edge(d9.id, d3.id,  'DEMO_EDGE', 0.26),
  ]);

  const totalEdges = realEdges.length + mixedEdges.length + demoEdges.length;
  console.log(`✅ Created ${totalEdges} edges (${realEdges.length} REAL, ${mixedEdges.length} REAL→DEMO, ${demoEdges.length} DEMO)`);
  console.log('\n🎉 Seed complete!\n');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
