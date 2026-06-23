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
    glow: 'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    status: 'Ready to import',
  },
  {
    id: 'google',
    name: 'Google Contacts',
    icon: '👥',
    desc: 'Import Google Contacts via standard Contacts.csv.',
    instructions: '1. In Google Contacts, click "Export" in the left-hand column.\n2. Choose "Google CSV" format.\n3. Save and drag the exported Contacts.csv file here.',
    glow: 'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    status: 'Ready to import',
  },
  {
    id: 'gmail',
    name: 'Gmail Header Log',
    icon: '✉️',
    desc: 'Extract interaction frequencies from email threads.',
    instructions: '1. Paste raw header lines containing From/To headers, or upload exported email thread header lists.\n2. We will infer communication frequencies and generate trust links.',
    glow: 'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    status: 'Ready to parse',
  },
  {
    id: 'twitter',
    name: 'Twitter / X Export',
    icon: '🐦',
    desc: 'Import handles from standard following.js archives.',
    instructions: '1. Go to Settings > Your Account > Download an archive of your data.\n2. In the following.js file, upload the raw file to extract followers.',
    glow: 'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
    status: 'Ready to parse',
  },
  {
    id: 'outlook',
    name: 'Outlook Contacts',
    icon: '📅',
    desc: 'Upload Outlook Contacts CSV file exports.',
    instructions: '1. In Outlook Web, go to People > Manage > Export contacts.\n2. Save as Outlook CSV and drop the file here to parse contacts.',
    glow: 'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.12)',
    color: '#ffffff',
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
