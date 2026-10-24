// ===========================================
// TRAMI ESPAÑA - Portales oficiales (v1.5.1)
// ===========================================
// Lista única de URLs oficiales de nivel primario. Las páginas profundas de
// las sedes cambian a menudo y acaban en 404; los portales raíz no. Las
// pantallas legales y las fuentes del Asistente solo enlazan a estas URLs.

export interface OfficialPortal {
    id: string;
    label: string;
    url: string;
    /** Sufijos de dominio que pertenecen a este organismo. */
    hosts: readonly string[];
}

export const OFFICIAL_PORTALS: readonly OfficialPortal[] = [
    { id: 'administracion', label: 'Punto de Acceso General', url: 'https://administracion.gob.es', hosts: ['administracion.gob.es', 'administracionespublicas.gob.es'] },
    { id: 'sepe', label: 'SEPE', url: 'https://www.sepe.es', hosts: ['sepe.es', 'sepe.gob.es'] },
    { id: 'seg-social', label: 'Seguridad Social', url: 'https://www.seg-social.es', hosts: ['seg-social.es', 'seg-social.gob.es', 'seguridadsocial.gob.es', 'seguimiento-seguridadsocial.es'] },
    { id: 'aeat', label: 'Agencia Tributaria', url: 'https://sede.agenciatributaria.gob.es', hosts: ['agenciatributaria.gob.es', 'agenciatributaria.es'] },
    { id: 'dgt', label: 'DGT', url: 'https://www.dgt.es', hosts: ['dgt.es', 'dgt.gob.es'] },
    { id: 'policia', label: 'Policía Nacional', url: 'https://www.policia.es', hosts: ['policia.es', 'dnielectronico.es', 'citapreviadnie.es'] },
    { id: 'extranjeria', label: 'Extranjería', url: 'https://extranjeros.inclusion.gob.es', hosts: ['extranjeros.inclusion.gob.es'] },
    { id: 'fnmt', label: 'FNMT', url: 'https://www.fnmt.es', hosts: ['fnmt.es', 'fnmt.gob.es', 'cert.fnmt.es'] },
    { id: 'clave', label: 'Cl@ve', url: 'https://clave.gob.es', hosts: ['clave.gob.es'] },
    { id: 'boe', label: 'BOE', url: 'https://www.boe.es', hosts: ['boe.es'] },
    { id: 'becas', label: 'Becas Educación', url: 'https://www.becaseducacion.gob.es', hosts: ['becaseducacion.gob.es'] },
] as const;

const FALLBACK_URL = 'https://administracion.gob.es';

function hostOf(url: string): string | null {
    const match = /^https?:\/\/([^/?#:]+)/i.exec(url.trim());
    return match ? match[1].toLowerCase() : null;
}

/**
 * Devuelve el portal primario del organismo al que pertenece `url`.
 * Si el dominio no es de un organismo conocido, devuelve el Punto de Acceso
 * General (administracion.gob.es).
 */
export function resolveOfficialPortal(url: string | null | undefined): OfficialPortal {
    const host = url ? hostOf(url) : null;
    if (host) {
        for (const portal of OFFICIAL_PORTALS) {
            if (portal.hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
                return portal;
            }
        }
    }
    return OFFICIAL_PORTALS.find((p) => p.url === FALLBACK_URL) ?? OFFICIAL_PORTALS[0];
}

/** URL primaria oficial para `url` (ver `resolveOfficialPortal`). */
export function resolveOfficialUrl(url: string | null | undefined): string {
    return resolveOfficialPortal(url).url;
}
