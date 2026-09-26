// ===========================================
// TRAMI ESPANA - Guia de Identidad Digital (v1.3.1)
// ===========================================
// KILLER FEATURE #3: miniasistente paso a paso para configurar Cl@ve PIN,
// Cl@ve Permanente y el Certificado Digital de la FNMT en el movil.
//
// Es el problema n.1 de los ciudadanos en Espana (configurar la identidad
// electronica) y resolverlo dentro de la app aporta un valor enorme, porque
// desbloquea TODOS los tramites online sin desplazamiento.

/** Tipo de metodo de identificacion que se configura. */
export type IdentityMethodId =
  | 'clave-permanente'
  | 'certificado-fnmt'
  | 'sms-verificacion';

export interface GuideStep {
  /** Numero de paso (1-based), se muestra como badge. */
  order: number;
  title: string;
  detail: string;
  /** Aviso o trampa frecuente en este paso. */
  tip?: string;
  /** Enlace de ayuda para este paso concreto. */
  helpUrl?: string;
}

export interface IdentityMethod {
  id: IdentityMethodId;
  label: string;
  /** Para que sirve: el titular lo elige. */
  purpose: string;
  /** Icono de @expo/vector-icons/Ionicons. */
  icon: string;
  /** Nivel de dificultad (1 = facil, 3 = avanzado). */
  difficulty: 1 | 2 | 3;
  /** Recomendado para el caso habitual. */
  recommended: boolean;
  steps: readonly GuideStep[];
  /** Donde se solicita. */
  requestUrl: string;
}

const SEDE_CLABE =
  'https://www.sede.administracionespublicas.gob.es/pagina/index/directorio/CiudadanosTramites/Identidad/Cl_ave/Registrar.aspx';
const SEDE_CITA =
  'https://www.sede.administracionespublicas.gob.es/pagina/index/directorio/CiudadanosTramites/CitaPrevia/CitaPrevia.htm';
const SEDE_CLABE_MOVIL =
  'https://www.sede.administracionespublicas.gob.es/pagina/index/directorio/CiudadanosTramites/Identidad/Cl_ave_Movil.html';

/** Metodo mas recomendado: la via que resuelve el 90% de los tramites. */
const CLAVE_PERMANENTE: IdentityMethod = {
  id: 'clave-permanente',
  label: 'Cl@ve Permanente',
  purpose:
    'La opcion mas recomendable para el movil: permite firmar tramites sin salir de casa.',
  icon: 'key',
  difficulty: 2,
  recommended: true,
  requestUrl: SEDE_CLABE,
  steps: [
    {
      order: 1,
      title: 'Pide cita previa para el DNI electronico',
      detail:
        'La Cl@ve Permanente necesita un DNI electronico (con chip) o un certificado vigente. Sin cita previa no se puede activar.',
      tip: 'La cita se pide en la sede de la DGT. Se necesita el DNI fisico y la huella ya registrada.',
      helpUrl: SEDE_CITA,
    },
    {
      order: 2,
      title: 'Solicita la Cl@ve Permanente por internet',
      detail:
        'Con el DNI electronico, accede a la sede y pulsa "Quiero pedir Cl@ve Permanente". Necesitas el numero de Seguridad Social (NSS) de 9 digitos.',
      tip: 'La solicitud puede quedar incompleta y retomarse en 3 dias si te falta algun requisito.',
      helpUrl: SEDE_CLABE,
    },
    {
      order: 3,
      title: 'Valida por SMS con un codigo',
      detail:
        'Recibiras un codigo de verificacion. Ademas, en el alta se te pide la clave de seguridad de 4 digitos que tu eliges.',
      tip: 'La clave de seguridad NO es el PIN de 6 digitos de la app: son dos cosas distintas.',
    },
    {
      order: 4,
      title: 'Activa la Cl@ve en tu movil',
      detail:
        'Descarga la app oficial "Cl@ve", accede con el DNI electronico y la clave de seguridad, y registra el dispositivo con la huella dactilar.',
      tip: 'Con varios telefonos, el PIN enviado a cada uno caduca rapido: no lo pidas si no lo vas a usar.',
      helpUrl: SEDE_CLABE_MOVIL,
    },
    {
      order: 5,
      title: 'Crea un PIN nuevo en la app (recomendado)',
      detail:
        'El PIN por defecto caduca a los 3 meses. En "Mi Cl@ve" > "Gestionar apps", crea uno nuevo de 6 a 8 digitos.',
      tip: 'Un PIN de 8 digitos en vez de 6 multiplica por 100 las combinaciones posibles: el mayor salto de seguridad en un minuto.',
    },
    {
      order: 6,
      title: 'Ya puedes firmar en la sede electronica',
      detail:
        'En cualquier tramite elige "Cl@ve" como metodo de identificacion, introduce el PIN y valida con la huella. No necesitas certificado.',
      tip: 'Si el tramite pide "nivel de seguridad alto", la app te pedira reautenticacion por SMS.',
    },
  ],
};

/** Nivel mas avanzado: vale para firmar desde el ordenador. */
const CERTIFICADO_FNMT: IdentityMethod = {
  id: 'certificado-fnmt',
  label: 'Certificado Digital de la FNMT',
  purpose:
    'Sirve para firmar en el ordenador y tambien en el movil, con nivel de seguridad muy alto.',
  icon: 'shield-checkmark',
  difficulty: 3,
  recommended: false,
  requestUrl: 'https://www.sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml',
  steps: [
    {
      order: 1,
      title: 'Solicita cita previa en la AEAT',
      detail:
        'El certificado se solicita con cita previa en la delegacion de la Agencia Tributaria mas cercana, o por video-seguridad si estas fuera.',
      helpUrl: 'https://www.sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml',
    },
    {
      order: 2,
      title: 'Acredita tu identidad con el documento y la huella',
      detail:
        'Lleva el DNI o NIE vigente y, en algunos casos, el certificado anterior. Se verifica la identidad de forma presencial o remota.',
      tip: 'Si te han sustraido el DNI, al renovar tendras que acreditar de nuevo la identidad.',
    },
    {
      order: 3,
      title: 'Firma la solicitud de emision',
      detail:
        'Se firma digitalmente en el dispositivo que emite el certificado. Ahi se genera la clave privada.',
      tip: 'La clave privada NUNCA sale del dispositivo: por eso resiste bien frente a malware.',
    },
    {
      order: 4,
      title: 'Recibe el certificado por correo',
      detail:
        'Recibiras un email con el archivo del certificado. Descargalo y anota la clave que tu eliges para usarlo.',
      tip: 'Guarda el archivo de forma segura: sin la clave no podras volver a usarlo.',
    },
    {
      order: 5,
      title: 'Instalalo en el movil (Android)',
      detail:
        'Abre el archivo descargado, elige "Instalar tipo de credencial" y guarda la clave. Quedara disponible para la app Cl@ve y para la sede.',
      tip: 'Comprueba que tu antivirus no bloquea el almacenamiento de credenciales.',
      helpUrl: 'https://sede.agenciatributaria.gob.es/Sede/ayuda-certificados.html',
    },
  ],
};

/** Via de arranque sin cita previa: util como solucion inmediata. */
const SMS_VERIFICATION: IdentityMethod = {
  id: 'sms-verificacion',
  label: 'Cl@ve basico por SMS (arranque rapido)',
  purpose:
    'La via mas rapida para empezar hoy mismo, aunque caduca cada 5 anos y ofrece menos seguridad.',
  icon: 'chatbubble-ellipses',
  difficulty: 1,
  recommended: false,
  requestUrl:
    'https://www.sede.administracionespublicas.gob.es/pagina/index/directorio/CiudadanosTramites/Identidad/Cl_ave_basico.html',
  steps: [
    {
      order: 1,
      title: 'Date de alta con el NSS y tu telefono',
      detail:
        'Accede al alta de Cl@ve basico e indica tu NSS (9 digitos), el numero de telefono movil y el codigo postal.',
      tip: 'El telefono debe ser el que ya consta en la AEAT: si lo has cambiado, actualizalo antes.',
    },
    {
      order: 2,
      title: 'Valida con un codigo de SMS',
      detail:
        'Recibiras un codigo por SMS. Introducelo y espera el aviso de activacion.',
    },
    {
      order: 3,
      title: 'Usa la app Cl@ve con PIN de 6 digitos',
      detail:
        'Descarga la app, accede con el PIN y ya podras firmar tramites de nivel basico.',
      tip: 'Esta via caduca cada 5 anos: usala como arranque mientras solicitas la Cl@ve Permanente.',
    },
  ],
};

/** Catalogo de metodos de identidad digital. */
export const IDENTITY_METHODS: readonly IdentityMethod[] = [
  CLAVE_PERMANENTE,
  CERTIFICADO_FNMT,
  SMS_VERIFICATION,
] as const;

/** Devuelve el metodo de identidad por su id. */
export function getIdentityMethod(id: IdentityMethodId): IdentityMethod {
  return IDENTITY_METHODS.find((m) => m.id === id) ?? IDENTITY_METHODS[0];
}

/** Etiqueta de dificultad legible. */
export function getDifficultyLabel(difficulty: 1 | 2 | 3): string {
  if (difficulty === 1) return 'Facil';
  if (difficulty === 2) return 'Intermedio';
  return 'Avanzado';
}
