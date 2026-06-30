'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useGraphStore } from '@/store/graphStore';
import { GraphNode } from '@/types/graph';
import Link from 'next/link';
import PersonalProfileView from '@/components/profile/PersonalProfileView';

interface ProfilePageProps {
  params: Promise<{ publicId: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const router = useRouter();
  const { publicId } = use(params);
  const { databaseNodes, visibleLinks, refreshDatabase } = useGraphStore();

  const [profile, setProfile] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshDatabase();
  }, [refreshDatabase]);

  useEffect(() => {
    let active = true;
    async function loadNode() {
      setLoading(true);
      // Try databaseNodes first
      const found = databaseNodes.find(n => n.publicId === publicId || n.id === publicId);
      if (found) {
        if (active) { setProfile(found); setLoading(false); }
        return;
      }

      // Fetch from V2 API
      try {
        const { fetchPersonByPublicIdV2 } = await import('@/services/api');
        const { apiNodeV2ToGraph } = await import('@/store/graphStore');
        const apiData = await fetchPersonByPublicIdV2(publicId);
        if (active && apiData) {
          setProfile(apiNodeV2ToGraph(apiData));
        }
      } catch (err) {
        console.warn('Failed to load profile by publicId:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadNode();
    return () => { active = false; };
  }, [publicId, databaseNodes]);

  if (loading) {
    return (
      <div className="page-layout" style={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
            <span className="text-label" style={{ color: '#ffffff', fontSize: '13px' }}>Loading Profile Identity…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-layout" style={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
          <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', maxWidth: 420 }}>
            <h2 style={{ color: 'var(--silver-200)', marginBottom: '8px', fontSize: '18px', fontWeight: 700 }}>
              Profile Identity Not Found
            </h2>
            <p style={{ color: 'var(--silver-500)', fontSize: '13px', lineHeight: 1.5, marginBottom: '24px' }}>
              The profile for identifier <span style={{ color: '#ffffff', fontWeight: 600 }}>{publicId}</span> could not be found in Neo4j.
            </p>
            <Link href="/database">
              <button className="glass-button" style={{ margin: '0 auto' }}>
                ← Return to Directory
              </button>
            </Link>
          </div>
        </div>
