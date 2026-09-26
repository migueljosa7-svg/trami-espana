// ===========================================
// TRAMI ESPANA - Calculadora de Tasas y Modelo 790 (v1.3.1)
// ===========================================
// KILLER FEATURE #2: consulta rapida de las tasas oficiales de los tramites
// mas frecuentes y comprobacion de exenciones del 100% antes de pagar.
//
// AVISO DE FIABILIDAD: las tasas se actualizan cada ano en el BOE y esta
// tabla se mantiene a mano. Por eso CADA importe lleva su `lastReviewed` y la
// UI muestra un aviso de "verifica el importe oficial" con acceso directo a la
// sede y a la pasarela del Modelo 790. La app NUNCA cobra: solo informa y
// redirige al pago oficial.

/** Una tasa oficial de un tramite. */
export interface OfficialFee {
  id: string;
  /** Nombre del tramite (para mostrar). */
  label: string;
  /** Importe en euros. `0` si el tramite es gratuito. */
  amount: number;
  /** Codigo de la tasa en el modelo 790. */
  feeCode: string;
  /** Organismo que cobra. */
  organism: string;
  /** Enlace a la sede electronica donde se tramita. */
  sedeUrl: string;
  /** Slug del tramite en el catalogo de la app. */
  procedureSlug: string;
  /** Fecha de la ultima revision manual del importe (ISO). */
  lastReviewed: string;
  /** true si el importe puede cambiar al menos una vez al ano. */
  updatedYearly: boolean;
  /** Nota oficial (gratuidad por edad, recargos, etc.). */
  note: string;
}

/** Enlace a la pasarela de pago oficial del modelo 790. */
export const MODELO_790_PAYMENT_URL =
  'https://sede.administracion.gob.es/pagina/index/directorio/Pagos/PagosTCIB/index.htm';

/** Tabla de tasas oficiales de los tramites mas consultados. */
export const OFFICIAL_FEES: readonly OfficialFee[] = [
  {
    id: 'dni',
    label: 'DNI (emision / renovacion)',
    amount: 3.7,
    feeCode: '001.001',
    organism: 'Ministerio del Interior',
    sedeUrl:
      'https://www.sede.administracionespublicas.gob.es/pagina/index/directorio/CiudadanosTramites/DNI/index.htm',
    procedureSlug: 'dni',
    lastReviewed: '2026-01-05',
    updatedYearly: true,
    note: 'Menores de 14 anos: gratuita. Mayores de 65 anos: gratuita.',
  },
  {
    id: 'pasaporte',
    label: 'Pasaporte ordinario',
    amount: 8.4,
    feeCode: '001.004',
    organism: 'Ministerio del Interior',
    sedeUrl:
      'https://www.sede.administracionespublicas.gob.es/pagina/index/directorio/CiudadanosTramites/Pasaporte/index.htm',
    procedureSlug: 'pasaporte',
    lastReviewed: '2026-01-05',
    updatedYearly: true,
    note: 'Menores de 16 anos: gratuita. La expedicion urgente (48 h) tiene recargo.',
  },
  {
    id: 'nie-tie',
    label: 'TIE (Tarjeta de identidad de extranjero)',
    amount: 9,
    feeCode: '001.008',
    organism: 'Secretaria de Estado de Migraciones',
    sedeUrl:
      'https://www.extranjeros.inclusion.gob.es/es/autorizaciones-residencia/tarjeta-extranjero.html',
    procedureSlug: 'tie',
    lastReviewed: '2026-01-05',
    updatedYearly: true,
    note: 'Prorrogacion y renovacion: mismo importe.',
  },
  {
    id: 'certificado-padron',
    label: 'Certificado de empadronamiento',
    amount: 0,
    feeCode: 'sin tasa',
    organism: 'Ayuntamiento',
    sedeUrl:
      'https://sede.administracion.gob.es/pagina/index/directorio/CiudadanosTramites/Certificados/padron/index.htm',
    procedureSlug: 'empadronamiento',
    lastReviewed: '2026-01-05',
    updatedYearly: false,
    note: 'Gratuito. Se puede descargar en el e-tramite o pedir en el ayuntamiento.',
  },
  {
    id: 'carnet-conducir',
    label: 'Renovacion del permiso de conducir',
    amount: 8.7,
    feeCode: '001.007',
    organism: 'Direccion General de Trafico',
    sedeUrl:
      'https://www.sede.dgt.gob.es/es/permisos-de-conducir/conductores/renovacion/',
    procedureSlug: 'carnet-conducir-renovacion',
    lastReviewed: '2026-01-05',
    updatedYearly: true,
    note: 'Gratuita si se cumple alguno de los supuestos de exencion de la DGT.',
  },
  {
    id: 'certificado-penal',
    label: 'Certificado de antecedentes penales',
    amount: 3.6,
    feeCode: '001.003',
    organism: 'Ministerio de Justicia',
    sedeUrl:
      'https://sede.administracion.gob.es/pagina/index/directorio/CiudadanosTramites/Certificados/antecedentes-penales/index.htm',
    procedureSlug: 'certificado-antecedentes-penales',
    lastReviewed: '2026-01-05',
    updatedYearly: true,
    note: 'Gratuito cuando se solicita a instancia de un organo publico.',
  },
  {
    id: 'certificado-seguridad-social',
    label: 'Certificado de Seguridad Social',
    amount: 0,
    feeCode: 'sin tasa',
    organism: 'Seguridad Social',
    sedeUrl: 'https://www.seg-social.es/',
    procedureSlug: 'certificado-seguridad-social',
    lastReviewed: '2026-01-05',
    updatedYearly: false,
    note: 'Gratuito. Se descarga directamente de la Seguridad Social sin cita.',
  },
  {
    id: 'caceria',
    label: 'Licencia de caza (anual, IIBBBB)',
    amount: 25,
    feeCode: 'IIBBBB',
    organism: 'Consejeria autonoma',
    sedeUrl: 'https://sede.administracion.gob.es/',
    procedureSlug: 'licencia-caza',
    lastReviewed: '2026-01-05',
    updatedYearly: true,
    note: 'El importe VARIA por comunidad autonoma y por tipo de licencia.',
  },
] as const;

/** Busca una tasa por su identificador. */
export function getFeeById(id: string): OfficialFee | null {
  return OFFICIAL_FEES.find((f) => f.id === id) ?? null;
}

/**
 * Formatea un importe en euros con el formato oficial espanol (coma decimal).
 */
export function formatFeeAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return 'Gratuito';
  return `${amount.toFixed(2).replace('.', ',')} EUR`;
}

// ===========================================
// EXENCIONES Y BONIFICACIONES
// ===========================================
// Estas reglas NO sustituyen a la decision de la Administracion: sirven
// para que el usuario sepa si PUEDE pedir la exencion y por que. La UI
// siempre muestra "verifica tu caso" con enlace a la sede oficial.

export type ExemptionId =
  | 'familia-numerosa'
  | 'discapacidad-33'
  | 'imv-ingreso-minimo-vital'
  | 'jovenes-18-24'
  | 'mayores-65'
  | 'victima-violencia-genero'
  | 'paro-inempleo'
  | 'estudiante'
  | 'europa-directiva';

export interface Exemption {
  id: ExemptionId;
  label: string;
  /** Descripcion de la condicion que hay que cumplir. */
  requirement: string;
  /** Ids de tasa (`OfficialFee.id`) a los que aplica. */
  appliesTo: readonly string[];
  /** true si cubre el 100% del importe. */
  fullExemption: boolean;
  /** true si hay que presentar justificante. */
  requiresJustification: boolean;
  /** Base normativa resumida. */
  legalBasis: string;
  /** Enlace a la pagina oficial que lo regula. */
  sourceUrl: string;
}

/** Catalogo de exenciones del 100% y bonificaciones parciales. */
export const EXEMPTIONS: readonly Exemption[] = [
  {
    id: 'familia-numerosa',
    label: 'Familia numerosa (titulo vigente)',
    requirement:
      'Familias con 3 o mas hijos, o 2 si alguno tiene discapacidad >= 33%.',
    appliesTo: ['dni', 'pasaporte', 'nie-tie'],
    fullExemption: true,
    requiresJustification: true,
    legalBasis: 'Ley 40/2006 y Ley 26/2015, de familias numerosas.',
    sourceUrl:
      'https://sede.administracion.gob.es/es/Centro-de-Inicio/Catalogo-de-tramites/Familias-numerosas/Exencion-de-tasas.html',
  },
  {
    id: 'discapacidad-33',
    label: 'Persona con discapacidad >= 33%',
    requirement: 'Grado de discapacidad igual o superior al 33%.',
    appliesTo: ['dni', 'pasaporte', 'nie-tie', 'carnet-conducir'],
    fullExemption: true,
    requiresJustification: true,
    legalBasis: 'Ley 5/2012 y normativa autonomica aplicable.',
    sourceUrl: 'https://sede.administracion.gob.es/',
  },
  {
    id: 'imv-ingreso-minimo-vital',
    label: 'Beneficiario del Ingreso Minimo Vital (IMV)',
    requirement:
      'Perceptor del IMV cuya cuantia no supere el umbral de exencion vigente.',
    appliesTo: ['dni', 'pasaporte', 'nie-tie'],
    fullExemption: true,
    requiresJustification: true,
    legalBasis: 'Real Decreto 1041/2020, del Ingreso Minimo Vital.',
    sourceUrl: 'https://www.seguimientoimv.seguimiento-seguridadsocial.es/',
  },
  {
    id: 'jovenes-18-24',
    label: 'Joven de 18 a 24 anos (bonificacion del 50%)',
    requirement: 'Edad entre 18 y 24 anos.',
    appliesTo: ['dni', 'pasaporte'],
    fullExemption: false,
    requiresJustification: true,
    legalBasis: 'Ley 14/2012, de exenciones para jovenes.',
    sourceUrl: 'https://sede.administracion.gob.es/',
  },
  {
    id: 'mayores-65',
    label: 'Mayor de 65 anos',
    requirement: 'Edad igual o superior a 65 anos (DNI y pasaporte).',
    appliesTo: ['dni', 'pasaporte'],
    fullExemption: true,
    requiresJustification: false,
    legalBasis: 'Real Decreto 1042/1993, de tasas del DNI.',
    sourceUrl: 'https://sede.administracion.gob.es/',
  },
  {
    id: 'victima-violencia-genero',
    label: 'Victima de violencia de genero',
    requirement: 'Titulo judicial o informe del Ministerio del Interior.',
    appliesTo: ['dni', 'carnet-conducir', 'certificado-penal'],
    fullExemption: true,
    requiresJustification: true,
    legalBasis: 'Ley 2/2015 y Ley 10/2022, de residencia.',
    sourceUrl: 'https://sede.administracion.gob.es/',
  },
  {
    id: 'paro-inempleo',
    label: 'Desempleado inscrito en el SEPE',
    requirement: 'Demandante de empleo inscrito (certificados).',
    appliesTo: ['certificado-penal', 'certificado-seguridad-social'],
    fullExemption: true,
    requiresJustification: true,
    legalBasis: 'Real Decreto 895/2001 y normativa del SEPE.',
    sourceUrl: 'https://www.sepe.es/HomeSepe/que-es-el-sepe/certificados.html',
  },
  {
    id: 'estudiante',
    label: 'Estudiante de educacion superior (permiso de conducir)',
    requirement: 'Matricula en educacion superior vigente.',
    appliesTo: ['carnet-conducir'],
    fullExemption: true,
    requiresJustification: true,
    legalBasis: 'Real Decreto 220/2006, guia para obtener el permiso.',
    sourceUrl: 'https://www.dgt.es/muevete-conducive/permiso-de-conducir/',
  },
  {
    id: 'europa-directiva',
    label: 'Documento electronico Directive eIDAS',
    requirement: 'Mutuo reconocimiento de documentos electronicos en la UE.',
    appliesTo: ['dni', 'pasaporte', 'nie-tie'],
    fullExemption: true,
    requiresJustification: true,
    legalBasis: 'Reglamento (UE) 910/2014, eIDAS.',
    sourceUrl:
      'https://www.sede.administracionespublicas.gob.es/pagina/index/directorio/CiudadanosTramites/Identidad/Que-es-Cl_ave.html',
  },
] as const;

/** Devuelve las exenciones/bonificaciones que aplican a un tramite. */
export function getExemptionsForFee(feeId: string): Exemption[] {
  return EXEMPTIONS.filter((e) => e.appliesTo.includes(feeId));
}

/** Resultado de la comprobacion de exencion. */
export interface ExemptionCheck {
  fee: OfficialFee;
  /** Importe a pagar segun la seleccion. */
  amountToPay: number;
  /** true si el usuario ha marcado exencion total. */
  isExempt: boolean;
  /** Exencion aplicada, si la hay. */
  appliedExemption: Exemption | null;
  /** Aviso de que la decision final es de la Administracion. */
  disclaimer: string;
}

/**
 * Calcula el importe a pagar segun la exencion seleccionada.
 *
 * @param feeId       Id de la tasa.
 * @param exemptionId Exencion elegida por el usuario (o null si paga).
 */
export function calculateFeeWithExemption(
  feeId: string,
  exemptionId: ExemptionId | null,
): ExemptionCheck | null {
  const fee = getFeeById(feeId);
  if (!fee) return null;

  const disclaimer =
    'Importes orientativos. La Administracion verifica la tasa y la exencion al cobrar: confirma siempre el importe oficial en la sede.';

  if (!exemptionId) {
    return {
      fee,
      amountToPay: fee.amount,
      isExempt: false,
      appliedExemption: null,
      disclaimer,
    };
  }

  const exemption = EXEMPTIONS.find((e) => e.id === exemptionId);
  // Si la exencion no existe o no aplica a esta tasa, se cobra entero.
  if (!exemption || !exemption.appliesTo.includes(fee.id)) {
    return {
      fee,
      amountToPay: fee.amount,
      isExempt: false,
      appliedExemption: null,
      disclaimer,
    };
  }

  if (exemption.fullExemption) {
    return {
      fee,
      amountToPay: 0,
      isExempt: true,
      appliedExemption: exemption,
      disclaimer,
    };
  }

  // Bonificacion parcial (p. ej. jovenes de 18 a 24 anos): 50% del importe.
  return {
    fee,
    amountToPay: Math.round(fee.amount * 50) / 100,
    isExempt: false,
    appliedExemption: exemption,
    disclaimer,
  };
}
