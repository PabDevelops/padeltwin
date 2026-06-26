export const ELO_PROVISIONAL_MATCHES = 5;

export function isEloProvisional(played: number): boolean {
  return played < ELO_PROVISIONAL_MATCHES;
}
