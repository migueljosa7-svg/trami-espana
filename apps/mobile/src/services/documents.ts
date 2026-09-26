// ===========================================
// TRAMI ESPANA - Mi Carpeta de Alertas y Caducidades (v1.3.1)
// ===========================================
// KILLER FEATURE #1: control local de fechas de caducidad de los documentos
// clave del usuario (DNI, Pasaporte, Carnet de Conducir, NIE/TIE y Certificado
// de Padron). Los datos NUNCA salen del dispositivo: se guardan en
// AsyncStorage, aislado por el sandbox de la app en Android. No hay subidas a
// Supabase ni PII en la nube, lo que mantiene coherente la politica de
// privacidad.
//
// Beneficio de negocio: genera uso RECURRENTE todo el ano (avisos a 3 meses,
// 1 mes, 24 h y el dia del vencimiento) frente a las apps de tramites
// "de consulta puntual".

import AsyncStorage from '@react-native-async-storage/async-storage';

const DOCUMENTS_KEY = 'trami_carpeta_documents_v1';

/** Tipos de documento soportados. */
export type DocumentKind =
  | 'dni'
  | 'pasaporte'
  | 'carnet'
  | 'nie'
  | 'padron'
  | 'otro';

export interface DocumentKindInfo {
  kind: DocumentKind;
  label: string;
  shortLabel: string;
  /** Nombre del icono en @expo/vector-icons/Ionicons. */
  icon: string;
  /** Enlace oficial de cita previa / tramitacion. */
  appointmentUrl: string;
  /** Slug del tramite en el catalogo, para el acceso directo en un clic. */
  procedureSlug: string;
  /** Nombre oficial de la tasa asociada (Modelo 790). */
  feeName: string;
}

/** Sede electronica central para pedir cita previa de identidad. */
const CITA_PREVIA_SEDE =
  'https://www.sede.administracionespublicas.gob.es/pagina/index/directorio/CiudadanosTramites/CitaPrevia/CitaPrevia.htm';

/** Catalogo de documentos soportados con su acceso directo a cita previa. */
export const DOCUMENT_KINDS: readonly DocumentKindInfo[] = [
  {
    kind: 'dni',
    label: 'DNI (Documento Nacional de Identidad)',
    shortLabel: 'DNI',
    icon: 'card-outline',
    appointmentUrl: CITA_PREVIA_SEDE,
    procedureSlug: 'dni',
    feeName: 'Tasa DNI',
  },
  {
    kind: 'pasaporte',
    label: 'Pasaporte ordinario',
    shortLabel: 'Pasaporte',
    icon: 'airplane-outline',
    appointmentUrl: CITA_PREVIA_SEDE,
    procedureSlug: 'pasaporte',
    feeName: 'Tasa Pasaporte',
  },
  {
    kind: 'carnet',
    label: 'Carnet de conducir',
    shortLabel: 'Carnet',
    icon: 'car-sport-outline',
    appointmentUrl:
      'https://www.sede.dgt.gob.es/es/permisos-de-conducir/conductores/renovacion/',
    procedureSlug: 'carnet-conducir-renovacion',
    feeName: 'Tasa permiso de conducir',
  },
  {
    kind: 'nie',
    label: 'NIE / TIE (Tarjeta de identidad de extranjero)',
    shortLabel: 'NIE/TIE',
    icon: 'id-outline',
    appointmentUrl:
      'https://www.extranjeros.inclusion.gob.es/es/autorizaciones-residencia/tarjeta-extranjero.html',
    procedureSlug: 'tie',
    feeName: 'Tasa TIE',
  },
  {
    kind: 'padron',
    label: 'Certificado de padron',
    shortLabel: 'Padron',
    icon: 'home-outline',
    appointmentUrl:
      'https://sede.administracion.gob.es/pagina/index/directorio/CiudadanosTramites/Certificados/padron/index.htm',
    procedureSlug: 'empadronamiento',
    feeName: 'Gratuito',
  },
  {
    kind: 'otro',
    label: 'Otro documento',
    shortLabel: 'Otro',
    icon: 'document-text-outline',
    appointmentUrl: CITA_PREVIA_SEDE,
    procedureSlug: 'certificados',
    feeName: 'Tasa variable',
  },
] as const;

/** Devuelve la ficha del tipo de documento (o la de "otro" si no existe). */
export function getDocumentKindInfo(kind: DocumentKind): DocumentKindInfo {
  return (
    DOCUMENT_KINDS.find((d) => d.kind === kind) ??
    DOCUMENT_KINDS[DOCUMENT_KINDS.length - 1]
  );
}

/** Documento registrado por el usuario. */
export interface TrackedDocument {
  id: string;
  kind: DocumentKind;
  /** Nombre opcional para distinguir (p. ej. "Coche de Miguel"). */
  label: string;
  /** Fecha de caducidad en ISO completa. */
  expiresAt: string;
  createdAt: string;
}

/**
 * Semaforo de caducidad. Es la fuente de verdad del codigo de color de las
 * tarjetas: verde (>90 dias), ambar (90-30 dias), rojo (<30 dias) y
 * critico (ya caducado).
 */
export type ExpiryStatus = 'valid' | 'warning' | 'urgent' | 'expired';

/** Umbrales del semaforo, en dias. */
export const EXPIRY_THRESHOLDS = {
  /** >= 90 dias restantes -> verde. */
  safe: 90,
  /** <= 30 dias restantes -> rojo. Entre 31 y 89 -> ambar. */
  urgent: 30,
} as const;

/** Milisegundos por dia (para calculos de dias restantes). */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Normaliza cualquier fecha a las 00:00:00 hora local, evitando que un
 * documento caduche "un dia antes" por desfases de zona horaria.
 */
function startOfDay(date: Date): Date {
  const normalized = new Date(date.getTime());
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Dias que faltan para la caducidad (negativo si ya caducado).
 * Se compara a granularidad de DIA, no de milisegundo, para que el usuario
 * no vea "0 dias" a las 23:59 del ultimo dia valido.
 */
export function daysUntilExpiry(
  expiresAt: string | Date,
  now: Date = new Date(),
): number {
  const target = startOfDay(new Date(expiresAt));
  if (Number.isNaN(target.getTime())) return 0;
  return Math.round(
    (target.getTime() - startOfDay(now).getTime()) / MS_PER_DAY,
  );
}

/** Clasifica el documento en el semaforo de caducidad. */
export function getExpiryStatus(
  expiresAt: string | Date,
  now: Date = new Date(),
): ExpiryStatus {
  const days = daysUntilExpiry(expiresAt, now);
  if (days < 0) return 'expired';
  if (days <= EXPIRY_THRESHOLDS.urgent) return 'urgent';
  if (days < EXPIRY_THRESHOLDS.safe) return 'warning';
  return 'valid';
}

/** Etiqueta corta de los dias restantes, lista para pintar. */
export function formatDaysRemaining(
  expiresAt: string | Date,
  now: Date = new Date(),
): string {
  const days = daysUntilExpiry(expiresAt, now);
  if (days < 0) {
    const elapsed = Math.abs(days);
    return elapsed === 1
      ? 'Caducado ayer'
      : `Caducado hace ${elapsed} dias`;
  }
  if (days === 0) return 'Caduca hoy';
  if (days === 1) return 'Caduca manana';
  if (days <= 60) return `Quedan ${days} dias`;
  const months = Math.floor(days / 30);
  return `Quedan ${days} dias (~${months} meses)`;
}

/** Formatea la fecha de caducidad en formato espanol legible. */
export function formatExpiryDate(expiresAt: string | Date): string {
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return 'Fecha no valida';
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Ordena por urgencia: primero lo caducado, luego lo mas proximo. */
export function sortByUrgency(
  documents: TrackedDocument[],
): TrackedDocument[] {
  return [...documents].sort(
    (a, b) => daysUntilExpiry(a.expiresAt) - daysUntilExpiry(b.expiresAt),
  );
}

/** Genera un identificador local estable para un documento nuevo. */
function createId(): string {
  return `doc-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/** Lee todos los documentos guardados (devuelve [] si no hay o hay error). */
export async function loadDocuments(): Promise<TrackedDocument[]> {
  try {
    const raw = await AsyncStorage.getItem(DOCUMENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filtro defensivo: solo objetos con los campos minimos validos.
    return parsed.filter(
      (item): item is TrackedDocument =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as TrackedDocument).id === 'string' &&
        typeof (item as TrackedDocument).expiresAt === 'string',
    );
  } catch {
    return [];
  }
}

/** Persiste la lista completa de documentos. */
async function persist(documents: TrackedDocument[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
  } catch {
    // Silencioso: la persistencia es un extra, la UI sigue funcionando.
  }
}

/** Anade un documento y persiste. Devuelve el documento creado. */
export async function addDocument(input: {
  kind: DocumentKind;
  label?: string;
  expiresAt: Date;
}): Promise<TrackedDocument> {
  const info = getDocumentKindInfo(input.kind);
  const document: TrackedDocument = {
    id: createId(),
    kind: input.kind,
    label: input.label?.trim() || info.shortLabel,
    expiresAt: startOfDay(input.expiresAt).toISOString(),
    createdAt: new Date().toISOString(),
  };
  const existing = await loadDocuments();
  await persist([...existing, document]);
  return document;
}

/** Actualiza un documento existente por su id. */
export async function updateDocument(
  id: string,
  patch: Partial<Pick<TrackedDocument, 'kind' | 'label' | 'expiresAt'>>,
): Promise<void> {
  const existing = await loadDocuments();
  const next = existing.map((doc) => {
    if (doc.id !== id) return doc;
    return {
      ...doc,
      ...(patch.kind ? { kind: patch.kind } : {}),
      ...(patch.label !== undefined ? { label: patch.label.trim() } : {}),
      ...(patch.expiresAt
        ? { expiresAt: startOfDay(new Date(patch.expiresAt)).toISOString() }
        : {}),
    };
  });
  await persist(next);
}

/** Elimina un documento por su id. */
export async function removeDocument(id: string): Promise<void> {
  const existing = await loadDocuments();
  await persist(existing.filter((doc) => doc.id !== id));
}

/** Borra TODOS los documentos de "Mi Carpeta". */
export async function clearDocuments(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DOCUMENTS_KEY);
  } catch {
    // Silencioso.
  }
}

/** Resumen para la cabecera de la pantalla. */
export interface FolderSummary {
  total: number;
  expired: number;
  urgent: number;
  warning: number;
  valid: number;
  /** Documento mas proximo a caducar (no caducado), si existe. */
  nextExpiry: TrackedDocument | null;
}

/** Calcula el resumen del semaforo para un conjunto de documentos. */
export function summarizeDocuments(
  documents: TrackedDocument[],
  now: Date = new Date(),
): FolderSummary {
  const summary: FolderSummary = {
    total: documents.length,
    expired: 0,
    urgent: 0,
    warning: 0,
    valid: 0,
    nextExpiry: null,
  };
  let nearestDays = Number.POSITIVE_INFINITY;

  for (const doc of documents) {
    switch (getExpiryStatus(doc.expiresAt, now)) {
      case 'expired':
        summary.expired += 1;
        break;
      case 'urgent':
        summary.urgent += 1;
        break;
      case 'warning':
        summary.warning += 1;
        break;
      default:
        summary.valid += 1;
        break;
    }
    const days = daysUntilExpiry(doc.expiresAt, now);
    if (days >= 0 && days < nearestDays) {
      nearestDays = days;
      summary.nextExpiry = doc;
    }
  }
  return summary;
}
