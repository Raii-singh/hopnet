import 'dotenv/config';
import { PrismaClient, NodeType, EdgeType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding HOPNet V2 database...\n');

  // Clean up first
  await prisma.edge.deleteMany();
  await prisma.user.deleteMany();

  // Helper to pad numbers
  const pad = (num: number, size: number) => {
    let s = num + '';
    while (s.length < size) s = '0' + s;
    return s;
  };

  // ── REAL NODES (30 Nodes) ───────────────────────────────────
  const realUserData = [
    { name: 'Aryan Singh',     cluster: 'Tech',     influence: 94, company: 'HOPNet Technologies', tags: ['Graph Engines', 'AI Architecture', 'SaaS'], linkedin: 'aryan-singh-dev', twitter: 'aryan_dev' },
    { name: 'Priya Mehta',     cluster: 'Tech',     influence: 78, company: 'Nexus AI',           tags: ['Data Science', 'Machine Learning', 'NextJS'], linkedin: 'priyamehta', twitter: 'priya_ml' },
    { name: 'Rohan Verma',     cluster: 'Finance',  influence: 72, company: 'Vertex Capital',     tags: ['Venture Capital', 'Fintech', 'Advisory'], linkedin: 'rohanverma', twitter: 'rohan_vc' },
    { name: 'Sneha Kapoor',    cluster: 'Design',   influence: 68, company: 'Deco Creative',      tags: ['UX Strategy', 'Product Design', 'Figma'], linkedin: 'snehakapoor', twitter: 'sneha_ux' },
    { name: 'Karan Nair',      cluster: 'Tech',     influence: 65, company: 'CyberSafe',          tags: ['Cybersecurity', 'Networks', 'Cryptography'], linkedin: 'karannair', twitter: 'karan_sec' },
    { name: 'Ananya Rao',      cluster: 'Academia', influence: 61, company: 'Stanford University',tags: ['Research', 'Algorithms', 'Network Science'], linkedin: 'ananyarao', twitter: 'ananya_research' },
    { name: 'Vikram Sharma',   cluster: 'Business', influence: 59, company: 'ScaleUp Ventures',  tags: ['Operations', 'Growth Strategy', 'Strategy'], linkedin: 'vikramsharma', twitter: 'vikram_biz' },
    { name: 'Meera Joshi',     cluster: 'Marketing',influence: 54, company: 'AdGlow Digital',     tags: ['Growth Hacking', 'Branding', 'SEO'], linkedin: 'meerajoshi', twitter: 'meera_mktg' },
    { name: 'Aditya Kumar',    cluster: 'Tech',     influence: 50, company: 'HOPNet Technologies', tags: ['Backend Systems', 'PostgreSQL', 'ExpressJS'], linkedin: 'adityakumar', twitter: 'aditya_pg' },
    { name: 'Ishaan Malhotra', cluster: 'Finance',  influence: 47, company: 'Alpha Trading Group',tags: ['Algorithms', 'Hedge Funds', 'Quant'], linkedin: 'ishaanmalhotra', twitter: 'ishaan_quant' },
    { name: 'Divya Patel',     cluster: 'Design',   influence: 44, company: 'Deco Creative',      tags: ['Visual Arts', 'UI Prototyping', 'Design Systems'], linkedin: 'divyapatel', twitter: 'divya_ui' },
    { name: 'Rahul Bose',      cluster: 'Academia', influence: 42, company: 'IIT Bombay',         tags: ['Graph Theory', 'Discrete Maths', 'Teaching'], linkedin: 'rahulbose', twitter: 'rahul_math' },
    { name: 'Neha Gupta',      cluster: 'Tech',     influence: 39, company: 'Nexus AI',           tags: ['Frontend Apps', 'React Native', 'TypeScript'], linkedin: 'nehagupta', twitter: 'neha_front' },
    { name: 'Siddharth Rao',   cluster: 'Business', influence: 36, company: 'ScaleUp Ventures',  tags: ['Partnerships', 'Legal Compliance', 'BizDev'], linkedin: 'siddharthrao', twitter: 'sid_biz' },
    { name: 'Tanvi Shah',      cluster: 'Marketing',influence: 33, company: 'AdGlow Digital',     tags: ['Public Relations', 'Copywriting', 'Campaigns'], linkedin: 'tanvishah', twitter: 'tanvi_pr' },
    { name: 'Kabir Sen',       cluster: 'Tech',     influence: 30, company: 'CloudCore Inc.',     tags: ['DevOps', 'Docker', 'Kubernetes'], linkedin: 'kabirsen', twitter: 'kabir_devops' },
    { name: 'Aisha Siddiqui',  cluster: 'Design',   influence: 28, company: 'Studio 99',          tags: ['Motion Design', 'Cinema 4D', 'Creative Direction'], linkedin: 'aishasiddiqui', twitter: 'aisha_creative' },
    { name: 'Neil Malhotra',   cluster: 'Finance',  influence: 26, company: 'Vertex Capital',     tags: ['Equity Research', 'Valuation', 'M&A'], linkedin: 'neilmalhotra', twitter: 'neil_val' },
    { name: 'Riya Sen',        cluster: 'Marketing',influence: 24, company: 'BrandFocus',         tags: ['Influencer Marketing', 'Events', 'Social Media'], linkedin: 'riyasen', twitter: 'riya_social' },
    { name: 'Sameer Dixit',    cluster: 'Business', influence: 22, company: 'Prestige Advisory',  tags: ['Corporate Structuring', 'Turnaround', 'Taxation'], linkedin: 'sameerdixit', twitter: 'sameer_tax' },
    { name: 'Tara Deshmukh',   cluster: 'Academia', influence: 20, company: 'IISc Bangalore',     tags: ['Neural Networks', 'AI Ethics', 'Bioinformatics'], linkedin: 'taradeshmukh', twitter: 'tara_bio' },
    { name: 'Dev Sharma',      cluster: 'Tech',     influence: 18, company: 'CloudCore Inc.',     tags: ['SRE', 'Server Performance', 'AWS'], linkedin: 'devsharma', twitter: 'dev_aws' },
    { name: 'Avani Patel',     cluster: 'Design',   influence: 16, company: 'Studio 99',          tags: ['Brand Identity', 'Typography', 'Illustration'], linkedin: 'avanipatel', twitter: 'avani_art' },
    { name: 'Yash Vardhan',    cluster: 'Finance',  influence: 15, company: 'Vertex Capital',     tags: ['Angel Investing', 'Pitch Decks', 'Dealflow'], linkedin: 'yashvardhan', twitter: 'yash_invest' },
    { name: 'Zoya Khan',       cluster: 'Marketing',influence: 14, company: 'BrandFocus',         tags: ['B2B Marketing', 'Lead Generation', 'HubSpot'], linkedin: 'zoyakhan', twitter: 'zoya_lead' },
    { name: 'Arjun Mehta',     cluster: 'Business', influence: 12, company: 'ScaleUp Ventures',  tags: ['Incubation', 'Founders Support', 'Talent'], linkedin: 'arjunmehta', twitter: 'arjun_ventures' },
    { name: 'Nikita Roy',      cluster: 'Academia', influence: 10, company: 'IIT Bombay',         tags: ['Graph Database', 'SQL Optimization', 'Semantic Web'], linkedin: 'nikitaroy', twitter: 'nikita_web' },
    { name: 'Varun Dhawan',    cluster: 'Tech',     influence: 8,  company: 'Vertex Capital',     tags: ['Automation', 'Python Scripting', 'QA Engineering'], linkedin: 'varundhawan', twitter: 'varun_qa' },
    { name: 'Kavya Iyer',      cluster: 'Design',   influence: 6,  company: 'Deco Creative',      tags: ['Interaction Design', 'Storyboarding', 'User Testing'], linkedin: 'kavyaiyer', twitter: 'kavya_ixd' },
    { name: 'Shreya Ghoshal',  cluster: 'Marketing',influence: 5,  company: 'AdGlow Digital',     tags: ['Content Strategy', 'SEO Audit', 'Copy'], linkedin: 'shreyaghoshal', twitter: 'shreya_write' },
  ];

  const realUsers = await Promise.all(
    realUserData.map((u, i) => {
      const seq = pad(i + 1, 6);
      const publicId = `HNP-${seq}`;
      const username = u.name.toLowerCase().replace(/\s+/g, '_');
      return prisma.user.create({
        data: {
          publicId,
          fullName: u.name,
          username,
          email: `${username}@hopnet.io`,
          phone: `+91 98300 ${pad(i + 1, 5)}`,
          linkedinUrl: `https://linkedin.com/in/${u.linkedin}`,
          twitterHandle: `@${u.twitter}`,
          instagramHandle: `@${username}_ig`,
          company: u.company,
          cluster: u.cluster,
          influenceScore: u.influence,
          tags: u.tags,
          sourceConnectors: ['LinkedIn', 'Manual'],
          metadata: { verified: true, role: u.name === 'Aryan Singh' ? 'Root Administrator' : 'Member' },
          nodeType: NodeType.REAL,
        },
      });
    })
  );

  const [
    r1, r2, r3, r4, r5, r6, r7, r8, r9, r10,
    r11, r12, r13, r14, r15, r16, r17, r18, r19, r20,
    r21, r22, r23, r24, r25, r26, r27, r28, r29, r30
  ] = realUsers;

  // ── DEMO NODES (15 Nodes) ───────────────────────────────────
  const demoUserData = [
    { name: 'Alex Chen',       cluster: 'Tech',     influence: 55, company: 'SynthCorp Demo', tags: ['Virtual Agents', 'APIs', 'Simulations'] },
    { name: 'Maria Rodriguez', cluster: 'Business', influence: 48, company: 'Global Solutions',tags: ['Cross Border Sales', 'Integration', 'Franchise'] },
    { name: 'James Wright',    cluster: 'Finance',  influence: 41, company: 'Delta Assets',   tags: ['Risk Management', 'Fixed Income', 'Real Estate'] },
    { name: 'Yuki Tanaka',     cluster: 'Design',   influence: 38, company: 'Pixel Craft',    tags: ['3D Modeling', 'Rendering', 'VR Interface'] },
    { name: 'Lena Müller',     cluster: 'Academia', influence: 35, company: 'Munich Science', tags: ['Cognitive Systems', 'Humanities', 'Data Analytics'] },
    { name: 'Omar Hassan',     cluster: 'Tech',     influence: 33, company: 'Middle East Tech',tags: ['Cloud Strategy', 'FaaS', 'Microservices'] },
    { name: 'Sofia Andreev',   cluster: 'Marketing',influence: 30, company: 'MediaSphere',    tags: ['Ad Campaigns', 'Conversion Rate', 'Funnel Optimization'] },
    { name: 'Carlos Lima',     cluster: 'Business', influence: 28, company: 'LatAm Partners', tags: ['Regional Scale', 'Operations', 'Negotiation'] },
    { name: 'Nina Popova',     cluster: 'Finance',  influence: 26, company: 'Neva Capital',   tags: ['Venture Capital', 'Liquidity Pools', 'Defi'] },
    { name: 'Thomas Bauer',    cluster: 'Tech',     influence: 24, company: 'Munich Science', tags: ['Embedded Systems', 'IoT Nodes', 'C++'] },
    { name: 'Aiko Watanabe',   cluster: 'Academia', influence: 22, company: 'Tokyo Graph Lab',tags: ['Algorithmic Geometry', 'Heuristics', 'Citations'] },
    { name: 'Lucas Petit',     cluster: 'Design',   influence: 20, company: 'Parisian Design',tags: ['Aesthetics', 'Ergonomics', 'Material Science'] },
    { name: 'Emily Watson',    cluster: 'Marketing',influence: 18, company: 'MediaSphere',    tags: ['Media Relations', 'Crisis PR', 'Copy'] },
    { name: 'Hans Schmidt',    cluster: 'Business', influence: 15, company: 'Munich Science', tags: ['Project Management', 'Agile', 'ScrumMaster'] },
    { name: 'Chloe Dubois',    cluster: 'Design',   influence: 12, company: 'Parisian Design',tags: ['Haute Couture', 'Jewelry Styling', 'Luxury Branding'] },
  ];

  const demoUsers = await Promise.all(
    demoUserData.map((u, i) => {
      const seq = pad(i + 1, 6);
      const publicId = `DNP-${seq}`;
      const username = u.name.toLowerCase().replace(/\s+/g, '_');
      return prisma.user.create({
        data: {
          publicId,
          fullName: u.name,
          username,
          email: `${username}@demo.hopnet.io`,
          phone: `+1 555 019 ${pad(i + 1, 3)}`,
          linkedinUrl: `https://linkedin.com/in/demo-${username}`,
          twitterHandle: `@demo_${username}`,
          instagramHandle: `@demo_${username}_ig`,
          company: u.company,
          cluster: u.cluster,
          influenceScore: u.influence,
          tags: u.tags,
          sourceConnectors: ['DemoGenerator'],
          metadata: { demoNode: true, simulated: true },
          nodeType: NodeType.DEMO,
        },
      });
    })
  );

  const [
    d1, d2, d3, d4, d5, d6, d7, d8, d9, d10,
    d11, d12, d13, d14, d15
  ] = demoUsers;

  console.log(`✅ Created ${realUsers.length} REAL nodes + ${demoUsers.length} DEMO nodes`);

  // ── EDGES WITH METRICS & SCORING (Dynamic Weighted Scoring) ────
  // Formula: weight = trustScore * 0.6 + interactionFrequency * 0.4
  const edge = (
    sourceId: string,
    targetId: string,
    relationshipType: string,
    trustScore: number,
    interactionFrequency: number,
    connectorSource: string,
    edgeType: EdgeType
  ) => {
    const weight = Math.round((trustScore * 0.6 + interactionFrequency * 0.4) * 100) / 100;
    return prisma.edge.create({
      data: {
        sourceId,
        targetId,
        relationshipType,
        trustScore,
        interactionFrequency,
        connectorSource,
        edgeType,
        weight,
      },
    });
  };

  // REAL ↔ REAL edges (35 edges)
  const realEdges = await Promise.all([
    edge(r1.id, r2.id, 'cofounder', 0.95, 0.90, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r1.id, r3.id, 'advisor',   0.85, 0.60, 'Manual',   EdgeType.REAL_EDGE),
    edge(r1.id, r4.id, 'colleague', 0.88, 0.80, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r1.id, r5.id, 'friend',    0.75, 0.50, 'Manual',   EdgeType.REAL_EDGE),
    edge(r1.id, r7.id, 'partner',   0.80, 0.70, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r1.id, r9.id, 'colleague', 0.90, 0.95, 'LinkedIn', EdgeType.REAL_EDGE),
    
    edge(r2.id, r4.id, 'friend',    0.70, 0.60, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r2.id, r7.id, 'colleague', 0.75, 0.50, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r2.id, r13.id,'partner',   0.82, 0.70, 'LinkedIn', EdgeType.REAL_EDGE),
    
    edge(r3.id, r10.id,'investor',  0.90, 0.50, 'Manual',   EdgeType.REAL_EDGE),
    edge(r3.id, r7.id, 'partner',   0.68, 0.40, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r3.id, r18.id,'colleague', 0.85, 0.75, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r3.id, r24.id,'advisor',   0.92, 0.60, 'Manual',   EdgeType.REAL_EDGE),
    
    edge(r4.id, r11.id,'colleague', 0.88, 0.85, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r4.id, r29.id,'friend',    0.65, 0.30, 'Manual',   EdgeType.REAL_EDGE),
    
    edge(r5.id, r6.id, 'advisor',   0.72, 0.40, 'Manual',   EdgeType.REAL_EDGE),
    edge(r5.id, r22.id,'colleague', 0.90, 0.88, 'LinkedIn', EdgeType.REAL_EDGE),
    
    edge(r6.id, r12.id,'partner',   0.80, 0.60, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r6.id, r21.id,'colleague', 0.78, 0.50, 'LinkedIn', EdgeType.REAL_EDGE),
    
    edge(r7.id, r8.id, 'friend',    0.60, 0.40, 'Manual',   EdgeType.REAL_EDGE),
    edge(r7.id, r14.id,'colleague', 0.85, 0.80, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r7.id, r26.id,'partner',   0.88, 0.70, 'LinkedIn', EdgeType.REAL_EDGE),
    
    edge(r8.id, r9.id, 'colleague', 0.65, 0.30, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r8.id, r15.id,'friend',    0.72, 0.60, 'Manual',   EdgeType.REAL_EDGE),
    edge(r8.id, r30.id,'colleague', 0.80, 0.75, 'LinkedIn', EdgeType.REAL_EDGE),
    
    edge(r9.id, r11.id,'partner',   0.55, 0.40, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r9.id, r13.id,'colleague', 0.78, 0.70, 'LinkedIn', EdgeType.REAL_EDGE),
    
    edge(r10.id,r14.id,'investor',  0.88, 0.40, 'Manual',   EdgeType.REAL_EDGE),
    edge(r12.id,r13.id,'friend',    0.60, 0.30, 'Manual',   EdgeType.REAL_EDGE),
    edge(r13.id,r14.id,'colleague', 0.70, 0.50, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r14.id,r15.id,'partner',   0.65, 0.40, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r16.id,r22.id,'colleague', 0.85, 0.90, 'LinkedIn', EdgeType.REAL_EDGE),
    edge(r17.id,r23.id,'friend',    0.78, 0.50, 'Manual',   EdgeType.REAL_EDGE),
    edge(r18.id,r24.id,'advisor',   0.90, 0.70, 'Manual',   EdgeType.REAL_EDGE),
    edge(r19.id,r25.id,'colleague', 0.80, 0.60, 'LinkedIn', EdgeType.REAL_EDGE),
  ]);

  // REAL → DEMO edges (Allowed entry - 15 edges)
  const mixedEdges = await Promise.all([
    edge(r1.id, d1.id, 'acquaintance', 0.50, 0.30, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r2.id, d2.id, 'acquaintance', 0.45, 0.20, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r3.id, d3.id, 'acquaintance', 0.48, 0.40, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r4.id, d4.id, 'acquaintance', 0.40, 0.30, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r5.id, d1.id, 'acquaintance', 0.52, 0.20, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r6.id, d5.id, 'acquaintance', 0.42, 0.35, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r7.id, d2.id, 'acquaintance', 0.40, 0.15, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r8.id, d7.id, 'acquaintance', 0.38, 0.20, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r9.id, d6.id, 'acquaintance', 0.35, 0.10, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r10.id,d3.id, 'acquaintance', 0.45, 0.25, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r11.id,d4.id, 'acquaintance', 0.40, 0.30, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r12.id,d5.id, 'acquaintance', 0.38, 0.10, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r13.id,d6.id, 'acquaintance', 0.35, 0.20, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r14.id,d7.id, 'acquaintance', 0.30, 0.15, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(r15.id,d8.id, 'acquaintance', 0.32, 0.10, 'DemoGenerator', EdgeType.DEMO_EDGE),
  ]);

  // DEMO ↔ DEMO edges (15 edges)
  const demoEdges = await Promise.all([
    edge(d1.id, d6.id,  'synthetic', 0.55, 0.40, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d1.id, d10.id, 'synthetic', 0.48, 0.30, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d1.id, d2.id,  'synthetic', 0.50, 0.50, 'DemoGenerator', EdgeType.DEMO_EDGE),
    
    edge(d2.id, d8.id,  'synthetic', 0.46, 0.40, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d2.id, d7.id,  'synthetic', 0.42, 0.20, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d2.id, d14.id, 'synthetic', 0.40, 0.30, 'DemoGenerator', EdgeType.DEMO_EDGE),
    
    edge(d3.id, d9.id,  'synthetic', 0.52, 0.35, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d3.id, d8.id,  'synthetic', 0.45, 0.20, 'DemoGenerator', EdgeType.DEMO_EDGE),
    
    edge(d4.id, d12.id, 'synthetic', 0.48, 0.45, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d5.id, d11.id, 'synthetic', 0.44, 0.30, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d6.id, d10.id, 'synthetic', 0.42, 0.25, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d7.id, d8.id,  'synthetic', 0.38, 0.20, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d9.id, d3.id,  'synthetic', 0.40, 0.30, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d10.id,d15.id, 'synthetic', 0.45, 0.35, 'DemoGenerator', EdgeType.DEMO_EDGE),
    edge(d11.id,d12.id, 'synthetic', 0.38, 0.20, 'DemoGenerator', EdgeType.DEMO_EDGE),
  ]);

  const totalEdges = realEdges.length + mixedEdges.length + demoEdges.length;
  console.log(`✅ Created ${totalEdges} edges (${realEdges.length} REAL, ${mixedEdges.length} REAL→DEMO, ${demoEdges.length} DEMO)`);
  console.log('\n🎉 Seed complete!\n');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
