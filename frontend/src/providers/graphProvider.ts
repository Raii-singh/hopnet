/**
 * HOPNet Frontend Graph Provider System
 * ─────────────────────────────────────────────────────────────
 * Frontend mirror of graph-providers/registry.ts
 * Used by the store, Navbar switcher, and all page components
 * to determine what features are available for the active provider.
 */

export type ProviderId = 'live';

export interface ProviderCapabilities {
  readOnly: boolean;
  hasPersonalProfiles: boolean;
  hasCRUD: boolean;
  hasConnectors: boolean;
  hasWorkspaceMode: boolean;
  hasTrustAnalysis: boolean;
  hasCollaborationAnalysis: boolean;
  hasClustering: boolean;
  hasPathfinding: boolean;
  hasCentrality: boolean;
  hasDemoNodes: boolean;
  nodeLabel: string;
  edgeLabel: string;
  displayName: string;
  icon: string;
  description: string;
  accentColor: string;
  available: boolean;
}

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderCapabilities> = {
  live: {
    readOnly: false,
    hasPersonalProfiles: true,
    hasCRUD: true,
    hasConnectors: true,
    hasWorkspaceMode: true,
    hasTrustAnalysis: true,
    hasCollaborationAnalysis: false,
    hasClustering: true,
    hasPathfinding: true,
    hasCentrality: true,
    hasDemoNodes: true,
    nodeLabel: 'Person',
    edgeLabel: 'Connection',
    displayName: 'Live Graph',
    icon: '🌐',
    description: 'Rai Singh Authentic Network — verified trust relationships',
    accentColor: '#60a5fa',
    available: true,
  },
};

export const DEFAULT_PROVIDER: ProviderId = 'live';

export function getCapabilities(providerId: ProviderId): ProviderCapabilities {
  return PROVIDER_REGISTRY[providerId];
}

export function getAllProviders(): ProviderId[] {
  return Object.keys(PROVIDER_REGISTRY) as ProviderId[];
}

/** Navigation items per-provider capability */
export interface NavItem {
  href: string;
  label: string;
  requiredCapability?: keyof ProviderCapabilities;
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Graph View' },
  { href: '/personal', label: 'Personal Database', requiredCapability: 'hasPersonalProfiles' },
  { href: '/database', label: 'Universal Database' },
  { href: '/connectors', label: 'Integrations', requiredCapability: 'hasConnectors' },
];

/** Returns nav items visible for the given provider */
export function getNavItemsForProvider(providerId: ProviderId): NavItem[] {
  const caps = getCapabilities(providerId);
  return ALL_NAV_ITEMS.filter(item => {
    if (!item.requiredCapability) return true;
    return !!caps[item.requiredCapability];
  });
}
