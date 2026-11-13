import type { ParteSugerida } from '../types';

export function createEmptyParteSugerida(): ParteSugerida {
  return { parteNumero: '', descripcion: '', cantidad: 1 };
}

/** Normaliza filas válidas para guardar (opcional: lista vacía = sin recomendaciones). */
export function normalizePartesSugeridas(
  items: ParteSugerida[] | null | undefined
): ParteSugerida[] {
  if (!Array.isArray(items)) return [];

  return items
    .map(item => {
      const parteNumero = (item.parteNumero ?? '').toString().trim().slice(0, 120);
      const descripcion = (item.descripcion ?? '').toString().trim().slice(0, 500);
      const rawQty = Number(item.cantidad);
      const cantidad =
        Number.isFinite(rawQty) && rawQty > 0 ? Math.round(rawQty) : 0;
      return { parteNumero, descripcion, cantidad };
    })
    .filter(
      item =>
        item.cantidad > 0 &&
        (item.parteNumero.length > 0 || item.descripcion.length > 0)
    );
}

export function parsePartesSugeridas(raw: unknown): ParteSugerida[] {
  if (raw == null || raw === '') return [];
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return normalizePartesSugeridas(
    parsed.map(item => {
      if (!item || typeof item !== 'object') {
        return createEmptyParteSugerida();
      }
      const row = item as Record<string, unknown>;
      return {
        parteNumero: String(row.parteNumero ?? ''),
        descripcion: String(row.descripcion ?? ''),
        cantidad: Number(row.cantidad ?? 0),
      };
    })
  );
}
