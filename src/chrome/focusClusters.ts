import { STORAGE_KEYS } from '@/constants';
import { storageGet, storageSet } from '@/chrome/storage';
import {
  effectiveFocusDomains,
  findFocusCluster,
  seedClusterFromAllowlist,
  upsertFocusCluster,
} from '@/lib/focusClusters';
import type { FocusCluster } from '@/types/focusCluster';

export async function loadFocusClusters(): Promise<{
  clusters: FocusCluster[];
  activeId: string | null;
}> {
  const [storedClusters, allowlist, activeId] = await Promise.all([
    storageGet<FocusCluster[]>(STORAGE_KEYS.FOCUS_CLUSTERS, []),
    storageGet<string[]>(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, []),
    storageGet<string | null>(STORAGE_KEYS.ACTIVE_FOCUS_CLUSTER_ID, null),
  ]);

  const clusters = seedClusterFromAllowlist(storedClusters, allowlist);
  if (clusters.length !== storedClusters.length) {
    await storageSet(STORAGE_KEYS.FOCUS_CLUSTERS, clusters);
  }

  const active = findFocusCluster(clusters, activeId) ?? clusters[0] ?? null;
  if (active && active.id !== activeId) {
    await applyFocusCluster(clusters, active.id);
    return { clusters, activeId: active.id };
  }

  return { clusters, activeId: active?.id ?? null };
}

/** Persist cluster list, mark active, and sync FOCUS_ALLOWED_DOMAINS. */
export async function applyFocusCluster(
  clusters: readonly FocusCluster[],
  clusterId: string,
): Promise<FocusCluster | null> {
  const cluster = findFocusCluster(clusters, clusterId);
  if (!cluster) return null;
  await Promise.all([
    storageSet(STORAGE_KEYS.FOCUS_CLUSTERS, [...clusters]),
    storageSet(STORAGE_KEYS.ACTIVE_FOCUS_CLUSTER_ID, cluster.id),
    storageSet(STORAGE_KEYS.FOCUS_ALLOWED_DOMAINS, effectiveFocusDomains(cluster)),
  ]);
  return cluster;
}

export async function saveNewFocusCluster(cluster: FocusCluster): Promise<FocusCluster[]> {
  const { clusters } = await loadFocusClusters();
  const next = upsertFocusCluster(clusters, cluster);
  await applyFocusCluster(next, cluster.id);
  return next;
}

/** Replace domains on the active cluster and re-sync the allowlist. */
export async function updateActiveClusterDomains(
  domains: readonly string[],
): Promise<FocusCluster | null> {
  const { clusters, activeId } = await loadFocusClusters();
  const active = findFocusCluster(clusters, activeId);
  if (!active) return null;
  const updated: FocusCluster = {
    ...active,
    domains: [...domains],
  };
  const next = upsertFocusCluster(clusters, updated);
  return applyFocusCluster(next, updated.id);
}
