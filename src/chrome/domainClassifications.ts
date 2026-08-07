import { STORAGE_KEYS, type DomainClassification, type DistractionPromptStatus } from '@/constants';
import { storageGet, storageSet } from '@/chrome/storage';
import {
  clearDomainKind,
  listClassifiedDomains,
  setDomainKind,
} from '@/lib/domainClassifications';
import { acceptDistractionDomain } from '@/lib/distractionControl';

export async function loadDomainClassifications(): Promise<
  Record<string, DomainClassification>
> {
  return storageGet<Record<string, DomainClassification>>(
    STORAGE_KEYS.DOMAIN_CLASSIFICATIONS,
    {},
  );
}

export async function listStoredDomains(
  kind: DomainClassification,
): Promise<string[]> {
  const classifications = await loadDomainClassifications();
  return listClassifiedDomains(classifications, kind);
}

/** Mark domain productive — persona-independent. */
export async function addProductiveDomain(
  input: string,
): Promise<{ ok: true; domain: string } | { ok: false; reason: string }> {
  const classifications = await loadDomainClassifications();
  const result = setDomainKind(classifications, input, 'productive');
  if (!result.ok) return { ok: false, reason: 'Enter a valid website (e.g. github.com).' };
  await storageSet(STORAGE_KEYS.DOMAIN_CLASSIFICATIONS, result.classifications);
  return { ok: true, domain: result.domain };
}

/**
 * Mark domain distracting and sync Feature 3 prompt status so Engine B works.
 * Persona-independent.
 */
export async function addDistractingDomain(
  input: string,
): Promise<{ ok: true; domain: string } | { ok: false; reason: string }> {
  const [classifications, promptStatus] = await Promise.all([
    loadDomainClassifications(),
    storageGet<Record<string, DistractionPromptStatus>>(
      STORAGE_KEYS.DISTRACTION_PROMPT_STATUS,
      {},
    ),
  ]);
  const accepted = acceptDistractionDomain(input, promptStatus, classifications);
  if (!accepted) return { ok: false, reason: 'Enter a valid website (e.g. youtube.com).' };
  await Promise.all([
    storageSet(STORAGE_KEYS.DOMAIN_CLASSIFICATIONS, accepted.classifications),
    storageSet(STORAGE_KEYS.DISTRACTION_PROMPT_STATUS, accepted.promptStatus),
  ]);
  return { ok: true, domain: accepted.domain };
}

export async function removeClassifiedDomain(
  input: string,
): Promise<{ ok: true; domain: string } | { ok: false; reason: string }> {
  const [classifications, promptStatus] = await Promise.all([
    loadDomainClassifications(),
    storageGet<Record<string, DistractionPromptStatus>>(
      STORAGE_KEYS.DISTRACTION_PROMPT_STATUS,
      {},
    ),
  ]);
  const result = clearDomainKind(classifications, input);
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason === 'missing' ? 'Domain not on this list.' : 'Invalid domain.',
    };
  }
  const nextPrompt = { ...promptStatus };
  delete nextPrompt[result.domain];
  await Promise.all([
    storageSet(STORAGE_KEYS.DOMAIN_CLASSIFICATIONS, result.classifications),
    storageSet(STORAGE_KEYS.DISTRACTION_PROMPT_STATUS, nextPrompt),
  ]);
  return { ok: true, domain: result.domain };
}
