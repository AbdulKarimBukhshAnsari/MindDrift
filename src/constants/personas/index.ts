import type { PersonaId } from '@/types/persona';
import type { PersonaRules } from '@/types/personaRules';
import { STANDARD_WORKER_RULES } from './standardWorker';

export { STANDARD_WORKER_RULES } from './standardWorker';

/**
 * Active persona → rule set. Deep Reader / Rapid Researcher land here next.
 * Until then, unresolved personas fall back to Standard Worker.
 */
export const PERSONA_RULES: Record<PersonaId, PersonaRules> = {
  'standard-worker': STANDARD_WORKER_RULES,
  'deep-reader': STANDARD_WORKER_RULES,
  'rapid-researcher': STANDARD_WORKER_RULES,
};

export function getPersonaRules(personaId: PersonaId): PersonaRules {
  return PERSONA_RULES[personaId];
}
