/** Whether a hostname belongs to the workspace cluster. */
export function isDomainInCluster(
  domain: string,
  cluster: readonly string[],
): boolean {
  if (!domain) return false;
  const host = domain.toLowerCase();
  return cluster.some((entry) => {
    const c = entry.toLowerCase();
    if (c === 'localhost') {
      return host === 'localhost' || host.endsWith('.localhost');
    }
    return host === c || host.endsWith(`.${c}`);
  });
}

/**
 * Switch leaves or stays outside the cluster (counts for Rapid Researcher).
 * Both endpoints inside the cluster → ignored.
 */
export function isOutsideClusterSwitch(
  fromDomain: string,
  toDomain: string,
  cluster: readonly string[],
): boolean {
  const fromIn = isDomainInCluster(fromDomain, cluster);
  const toIn = isDomainInCluster(toDomain, cluster);
  return !(fromIn && toIn);
}
