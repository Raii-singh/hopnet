import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'HOPNet — Graph Intelligence Platform',
  description:
    'HOPNet is a graph intelligence system visualizing human relationship networks using graph traversal, trust-aware pathfinding, and interactive visualization.',
  keywords: ['graph', 'network', 'relationships', 'intelligence', 'HOPNet'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ height: '100%' }}>
      <body suppressHydrationWarning style={{ height: '100%', overflow: 'hidden', margin: 0 }}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
