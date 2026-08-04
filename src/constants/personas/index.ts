import type { PersonaId } from '@/types/persona';
import type { PersonaRules } from '@/types/personaRules';
import { DEEP_READER_RULES } from './deepReader';
import { RAPID_RESEARCHER_RULES } from './rapidResearcher';
import { STANDARD_WORKER_RULES } from './standardWorker';

export { DEEP_READER_RULES } from './deepReader';
export { RAPID_RESEARCHER_RULES } from './rapidResearcher';
export { STANDARD_WORKER_RULES } from './standardWorker';

/** Active persona → rule set. */
export const PERSONA_RULES: Record<PersonaId, PersonaRules> = {
  'deep-reader': DEEP_READER_RULES,
  'standard-worker': STANDARD_WORKER_RULES,
  'rapid-researcher': RAPID_RESEARCHER_RULES,
};

export function getPersonaRules(personaId: PersonaId): PersonaRules {
  return PERSONA_RULES[personaId] ?? STANDARD_WORKER_RULES;
}
