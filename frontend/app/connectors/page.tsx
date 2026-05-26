'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchImportHistory, previewConnectorImport, ApiImportLog } from '@/services/api';
import Link from 'next/link';
import ImportPreviewModal from '@/components/modals/ImportPreviewModal';

const CONNECTORS = [
  {
    id: 'linkedin',
    name: 'LinkedIn Connections',
    icon: '🔗',
    desc: 'Upload standard Connections.csv export.',
    instructions: '1. In LinkedIn, go to Settings & Privacy > Data Privacy.\n2. Click "Get a copy of your data" and select "Connections".\n3. Export data and upload the Connections.csv file directly.',
    glow: 'rgba(6,182,212,0.15)',
    border: 'rgba(6,182,212,0.4)',
    color: 'var(--neon-cyan)',
    status: 'Ready to import',
  },
  {
    id: 'google',
    name: 'Google Contacts',
    icon: '👥',
    desc: 'Import Google Contacts via standard Contacts.csv.',
    instructions: '1. In Google Contacts, click "Export" in the left-hand column.\n2. Choose "Google CSV" format.\n3. Save and drag the exported Contacts.csv file here.',
    glow: 'rgba(59,130,246,0.15)',
    border: 'rgba(59,130,246,0.4)',
    color: 'var(--neon-blue)',
    status: 'Ready to import',
  },
  {
    id: 'gmail',
    name: 'Gmail Header Log',
    icon: '✉️',
    desc: 'Extract interaction frequencies from email threads.',
    instructions: '1. Paste raw header lines containing From/To headers, or upload exported email thread header lists.\n2. We will infer communication frequencies and generate trust links.',
    glow: 'rgba(139,92,246,0.15)',
    border: 'rgba(139,92,246,0.4)',
    color: 'var(--neon-violet)',
    status: 'Ready to parse',
  },
  {
    id: 'twitter',
    name: 'Twitter / X Export',
    icon: '🐦',
    desc: 'Import handles from standard following.js archives.',
    instructions: '1. Go to Settings > Your Account > Download an archive of your data.\n2. In the following.js file, upload the raw file to extract followers.',
    glow: 'rgba(100,116,139,0.15)',
    border: 'rgba(100,116,139,0.4)',
    color: '#94a3b8',
    status: 'Ready to parse',
  },
  {
    id: 'outlook',
    name: 'Outlook Contacts',
    icon: '📅',
    desc: 'Upload Outlook Contacts CSV file exports.',
    instructions: '1. In Outlook Web, go to People > Manage > Export contacts.\n2. Save as Outlook CSV and drop the file here to parse contacts.',
    glow: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.3)',
    color: 'var(--neon-cyan)',
    status: 'Ready to import',
  },
];

export default function ConnectorsPage() {
  const router = useRouter();

  const [history, setHistory] = useState<ApiImportLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Active connector state
  const [selectedConnector, setSelectedConnector] = useState<typeof CONNECTORS[0] | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressText, setProgressText] = useState('');
  const [fileDetails, setFileDetails] = useState<{ name: string; content: string } | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);

  // Success output console logs
  const [successLogs, setSuccessLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  async function loadHistory() {
    try {
      const res = await fetchImportHistory();
      if (res && res.logs) setHistory(res.logs);
    } catch (err) {
      console.warn('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (showConsole && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [successLogs, showConsole]);

  function handleConnectorSelect(connector: typeof CONNECTORS[0]) {
    setSelectedConnector(connector);
    setProgress(null);
    setProgressText('');
    setFileDetails(null);
    setPreviewData(null);
    setSuccessLogs([]);
    setShowConsole(false);

    // Trigger file picker
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedConnector) return;

    setProgress(0);
    setProgressText('Reading local exported file…');

    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 40);
        setProgress(pct);
      }
    };

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setFileDetails({
        name: file.name,
        content: text,
      });

      setProgress(50);
      setProgressText('Applying Identity Resolution checks…');

      try {
        const preview = await previewConnectorImport(selectedConnector.id, text);
        setProgress(100);
        setProgressText('Parsing complete.');
        setTimeout(() => {
          setPreviewData(preview);
          setProgress(null);
        }, 500);
      } catch (err: any) {
        setProgress(null);
        setProgressText('');
        alert(`Error parsing file: ${err.message || 'The data structure was non-compliant.'}`);
      }
    };

    reader.onerror = () => {
      setProgress(null);
      setProgressText('');
      alert('Failed to read file locally.');
    };

    reader.readAsText(file);
  }

  function handleIngestSuccess(logs: string[]) {
    setPreviewData(null);
    setSuccessLogs(logs);
    setShowConsole(true);
    // Reload history list
    loadHistory();
  }

  return (
    <div className="page-layout" style={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
      <div className="page-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px 48px' }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--silver-100)', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            Data Import & Platorm Connectors
          </h1>
          <p style={{ color: 'var(--silver-400)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
            Bridge your local contact ledgers and social networks into the HOPNet database. Upload files explicitly exported from external networks to expand your human relation graphs securely.
          </p>
        </div>

        {/* CONNECTORS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {CONNECTORS.map(connector => (
            <div
              key={connector.id}
              className="glass-panel"
              style={{
                padding: '20px',
                borderColor: connector.border,
                background: `linear-gradient(135deg, rgba(255,255,255,0.01), ${connector.glow})`,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 220,
              }}
            >
              <div>
                {/* Icon & title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ fontSize: '26px' }}>{connector.icon}</div>
                  <span
                    className="badge"
                    style={{
                      fontSize: '9.5px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--silver-400)',
                      padding: '2px 8px',
                    }}
                  >
                    {connector.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--silver-100)', margin: '0 0 6px' }}>
                  {connector.name}
                </h3>
                <p style={{ color: 'var(--silver-400)', fontSize: '11px', lineHeight: 1.4, margin: '0 0 12px' }}>
                  {connector.desc}
                </p>
                <div style={{
                  fontSize: '9.5px',
                  color: 'var(--silver-500)',
                  lineHeight: 1.3,
                  whiteSpace: 'pre-wrap',
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.02)',
                  borderRadius: '4px',
                  padding: '6px 8px',
                }}>
                  {connector.instructions}
                </div>
              </div>

              {/* Upload Action Button */}
              <button
                className="glass-button"
                onClick={() => handleConnectorSelect(connector)}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  borderColor: connector.border,
                  color: connector.color,
                }}
              >
                📥 Choose File to Import
              </button>
            </div>
          ))}
        </div>

        {/* Hidden File input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.js,.json,.txt"
          style={{ display: 'none' }}
        />

        {/* PROGRESS BOX */}
        {progress !== null && selectedConnector && (
          <div className="glass-panel animate-fade-in" style={{ padding: '20px 24px', marginBottom: '24px', border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="text-label" style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>
                {selectedConnector.name} Ingestion Active
              </span>
              <span className="text-mono animate-pulse" style={{ fontSize: '12px', color: 'var(--neon-cyan)', fontWeight: 700 }}>
                {progress}%
              </span>
            </div>
            <div className="progress-bar" style={{ height: 8, background: 'rgba(255,255,255,0.05)' }}>
              <div className="progress-fill progress-fill-cyan" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--silver-400)', marginTop: '8px', fontStyle: 'italic' }}>
              {progressText}
            </div>
          </div>
        )}

        {/* RUNNING SUCCESS CONSOLE LOGS */}
        {showConsole && successLogs.length > 0 && (
          <div className="glass-panel animate-fade-in" style={{ padding: '16px', marginBottom: '24px', border: '1px solid rgba(16,185,129,0.3)', background: '#03030a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'block', width: 6, height: 6, borderRadius: '50%', background: 'var(--neon-emerald)', boxShadow: '0 0 6px var(--neon-emerald)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--neon-emerald)', letterSpacing: '0.04em' }}>GRAPH INGESTION OUTPUT REPORT</span>
              </div>
              <button
                onClick={() => setShowConsole(false)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--silver-500)',
                  fontSize: '10px', cursor: 'pointer', textDecoration: 'underline'
                }}
              >
                Clear Console
              </button>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '6px',
              padding: '10px 14px',
              fontFamily: 'Consolas, monospace',
              fontSize: '11px',
              color: 'var(--neon-cyan)',
              maxHeight: 180,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              {successLogs.map((log, idx) => (
                <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                  {log.includes('Failed') || log.includes('Error') ? (
                    <span style={{ color: '#fb7185' }}>❌ {log}</span>
                  ) : log.includes('bridged') || log.includes('Success') || log.includes('established') ? (
                    <span style={{ color: 'var(--neon-emerald)' }}>✅ {log}</span>
                  ) : (
                    <span>🔹 {log}</span>
                  )}
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        )}

        {/* IMPORT HISTORY TABLE */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--silver-100)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📥 Platform Import History Logs
          </h3>

          {loadingHistory ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
              <div style={{ width: 22, height: 22, border: '2px solid var(--neon-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--silver-600)', padding: '24px 0', fontSize: '12px' }}>
              No platform imports have been performed yet. Drop a Connections.csv file above to begin.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((log) => (
                <div
                  key={log.id}
                  className="glass-panel"
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.005)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--silver-200)' }}>{log.connectorSource}</strong>
                      <span className="text-mono" style={{ fontSize: '10px', color: 'var(--silver-500)' }}>({log.filename})</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--silver-500)', marginTop: '4px' }}>
                      Timestamp: {new Date(log.createdAt).toLocaleString()} · Confidence: {Math.round(log.confidenceScore * 100)}%
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                        +{log.nodesCreated} Nodes
                      </div>
                      <div className="text-mono" style={{ fontSize: '11px', color: 'var(--neon-emerald)', marginTop: '2px' }}>
                        +{log.edgesCreated} Edges
                      </div>
                    </div>

                    <button
                      className="glass-button"
                      onClick={() => {
                        setSuccessLogs(log.importLogs);
                        setShowConsole(true);
                      }}
                      style={{ fontSize: '10.5px', padding: '4px 10px', alignSelf: 'center' }}
                    >
                      View Logs
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {previewData && selectedConnector && fileDetails && (
        <ImportPreviewModal
          connectorType={selectedConnector.name}
          filename={fileDetails.name}
          previewData={previewData}
          onClose={() => setPreviewData(null)}
          onSuccess={handleIngestSuccess}
        />
      )}
    </div>
  );
}
