import type { PlayerLevel } from '@/types/database';

export const LEVELS: PlayerLevel[] = ['iniciacion', 'intermedio', 'avanzado'];

export const LEVEL_LABELS: Record<PlayerLevel, string> = {
  iniciacion: 'Beginner',
  intermedio: 'Intermediate',
  avanzado: 'Advanced',
};

export const LEVEL_DESCRIPTIONS: Record<PlayerLevel, string> = {
  iniciacion: 'New to padel or still learning the basics — rallies, scoring and court positioning.',
  intermedio: 'Comfortable with rallies and basic tactics, working on consistency and shot variety.',
  avanzado: 'Strong technique and tactical awareness, competes regularly at a high level.',
};
