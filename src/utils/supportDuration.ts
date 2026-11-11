/** Convierte horas de soporte a minutos para persistir en Tickets.actualTime */
export function hoursToActualMinutes(hoursInput: string): number | null {
  const trimmed = hoursInput.trim().replace(',', '.');
  if (!trimmed) return null;
  const hours = Number(trimmed);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return Math.round(hours * 60);
}

/** Formatea minutos guardados como texto en horas para la UI */
export function formatActualMinutesAsHours(
  minutes?: number | null
): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return String(hours);
  return String(Math.round(hours * 100) / 100);
}

export function isValidSupportHoursInput(hoursInput: string): boolean {
  return hoursToActualMinutes(hoursInput) !== null;
}
