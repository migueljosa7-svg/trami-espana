// ===========================================
// TRAMI ESPAÑA - Contenido Legal compartido
// ===========================================
// Fuente única de textos legales y de privacidad para WEB y MÓVIL.
//
// IMPORTANTE DE PRIVACIDAD/LEGAL:
// - No inventar datos reales (nombre legal, NIF, domicilio, proveedor LLM,
//   plazos de conservación, transferencias). Los campos que requieren un dato
//   real no disponible se marcan con el literal [REQUIERE DATO REAL: ...].
// - El correo contacto@tramiespana.es es PROVISIONAL (aparece en el README).
//   No verificado: el dominio definitivo aún no está operativo.
// - Este contenido es de preparación; no sustituye una revisión jurídica.

import { LEGAL_DISCLAIMER } from './constants';

/** Correo de contacto PROVISIONAL (aparece en README). NO verificado. */
export const LEGAL_EMAIL_CONTACT = 'contacto@tramiespana.es';

/** Marcador para el dominio web definitivo (aún no operativo). */
export const LEGAL_DOMAIN_DEFINITIVE = '[REQUIERE DATO REAL: DOMINIO DEFINITIVO]';

/** Texto oficial de independencia. Fuente única. */
export const INDEPENDENCE_DISCLAIMER =
  'Trami España es un servicio independiente y no oficial de las Administraciones Públicas de España. No proporcionamos asesoramiento jurídico profesional.';

/** Texto de limitación del asistente de IA. */
export const ASSISTANT_DISCLAIMER =
  'El asistente de Trami España es una herramienta de orientación basada en trámites verificados. Puede equivocarse, no constituye asesoramiento jurídico profesional y no sustituye la información oficial. Comprueba los trámites importantes en las fuentes oficiales. No facilites datos personales sensibles que no sean necesarios. Este asistente no es un funcionario ni representa a ninguna Administración.';

/** Secciones de la política de privacidad (visible al usuario). */
export const PRIVACY_SECTIONS = [
  {
    title: '1. Responsable del tratamiento',
    body:
      'Trami España es un servicio informativo privado e independiente. ' +
      LEGAL_DISCLAIMER + ' ' +
      LEGAL_DOMAIN_DEFINITIVE +
      ' para la identificación legal completa del responsable.'
  },
  {
    title: '2. Qué es Trami España',
    body:
      'Aplicación (web y móvil) para encontrar y entender trámites administrativos de España ' +
      'a partir de fuentes oficiales. No somos una Administración Pública ni un servicio oficial.'
  },
  {
    title: '3. Datos que recopilamos',
    body:
      'Solo tratamos los datos estrictamente necesarios para el funcionamiento del servicio: ' +
      'correo electrónico (al crear cuenta), nombre opcional del perfil, favoritos, recordatorios y ' +
      'conversaciones con el asistente. No recopilamos ubicación, contactos, fotos, cámara ni otros ' +
      'datos del dispositivo.'
  },
  {
    title: '4. Cuenta y correo electrónico',
    body:
      'Al registrarte almacenamos tu correo electrónico y un identificador de usuario generado por el ' +
      'servicio de autenticación (Supabase Auth). El correo se usa para la autenticación y, en su caso, ' +
      'para la recuperación de contraseña o confirmación de cuenta.'
  },
  {
    title: '5. Favoritos y recordatorios',
    body:
      'Los favoritos y recordatorios se asocian a tu cuenta y solo son accesibles por ti. No se comparten ' +
      'con terceros ni se usan para publicidad.'
  },
  {
    title: '6. Conversaciones con el asistente',
    body:
      'Las consultas que realizas y las respuestas del asistente se almacenan asociadas a tu cuenta ' +
      '(o como conversación anónima si no has iniciado sesión). Se usan exclusivamente para prestarte el ' +
      'servicio. Evita incluir datos personales sensibles innecesarios en tus consultas.'
  },
  {
    title: '7. Datos enviados a servicios externos',
    body:
      'Para generar respuestas, algunas consultas del asistente pueden enviarse a un proveedor de IA ' +
      '(' + LEGAL_DOMAIN_DEFINITIVE + ' para identificar el proveedor). El resto de tus datos permanece en el almacenamiento del servicio.'
  },
  {
    title: '8. Supabase',
    body:
      'La autenticación y el almacenamiento de datos utilizan Supabase (BaaS). ' +
      LEGAL_DOMAIN_DEFINITIVE + ' para confirmar la versión de los términos y el tratamiento del subencargado.'
  },
  {
    title: '9. Finalidades',
    body:
      'Prestar el servicio, mantener tu cuenta, gestionar favoritos/recordatorios y ofrecerte el asistente. ' +
      'No usamos tus datos para publicidad ni perfilado publicitario.'
  },
  {
    title: '10. Bases jurídicas',
    body:
      'Consentimiento (registro y uso) e interés legítimo (mejora del servicio), conforme al RGPD y la LOPDGDD. ' +
      LEGAL_DOMAIN_DEFINITIVE + ' para la base jurídica concreta definitiva.'
  },
  {
    title: '11. Conservación',
    body:
      'Conservamos tus datos mientras tu cuenta esté activa. ' +
      LEGAL_DOMAIN_DEFINITIVE + ' para los plazos de conservación definitivos.'
  },
  {
    title: '12. Seguridad',
    body:
      'Cifrado en tránsito y en reposo (Supabase). Acceso mediante token; en el cliente solo se usa la clave ' +
      'pública (anon key). Nunca se expone la clave de servicio en el frontend.'
  },
  {
    title: '13. Tus derechos',
    body:
      'Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad ' +
      'contactando con nosotros (ver sección Contacto). Puedes eliminar tus datos locales y, cuando corresponda, ' +
      'solicitar la eliminación de tu cuenta.'
  },
  {
    title: '14. Eliminación',
    body:
      'Existe la opción "Eliminar cuenta" que borra tus datos asociados. ' +
      LEGAL_DOMAIN_DEFINITIVE + ' para el flujo de eliminación definitivo si requiere acción administrativa.'
  },
  {
    title: '15. Menores',
    body:
      'El servicio está pensado para mayores de 14 años. ' +
      LEGAL_DOMAIN_DEFINITIVE + ' para confirmar la política de menores definitiva.'
  },
  {
    title: '16. Transferencias internacionales',
    body:
      'El proveedor de infraestructura puede almacenar datos fuera de la UE. ' +
      LEGAL_DOMAIN_DEFINITIVE + ' para confirmar las garantías de transferencia internacional.'
  },
  {
    title: '17. Cambios de política',
    body:
      'Notificaremos cambios significativos en esta política mediante un aviso dentro de la aplicación.'
  },
  {
    title: '18. Contacto',
    body:
      'Para ejercer tus derechos o cualquier duda, escribe a ' + LEGAL_EMAIL_CONTACT +
      ' (' + LEGAL_DOMAIN_DEFINITIVE + ' para verificar el email definitivo).'
  }
];


/** Secciones de los términos y condiciones (texto visible al usuario). */
export const TERMS_SECTIONS = [
  {
    title: '1. Finalidad y funcionamiento',
    body: 'Trami España es un servicio informativo privado e independiente que ayuda a entender trámites administrativos de España.'
  },
  {
    title: '2. Carácter informativo',
    body: 'Toda la información es orientativa. ' + INDEPENDENCE_DISCLAIMER
  },
  {
    title: '3. Independencia de las Administraciones',
    body: LEGAL_DISCLAIMER + ' Ninguna afirmación del servicio tiene carácter oficial.'
  },
  {
    title: '4. Responsabilidad',
    body: 'No asumimos responsabilidad por decisiones tomadas a partir de la información del servicio. Verifica siempre en las fuentes oficiales.'
  },
  {
    title: '5. Actualización de la información',
    body: 'Los trámites y requisitos pueden cambiar. La información se actualiza periódicamente desde fuentes oficiales sin garantía de exhaustividad.'
  },
  {
    title: '6. Fuentes oficiales',
    body: 'Cuando el servicio indica fuentes oficiales, se enlazan para que el usuario pueda contrastar la información.'
  },
  {
    title: '7. Asistente de IA',
    body: ASSISTANT_DISCLAIMER
  },
  {
    title: '8. Limitaciones de la IA',
    body: 'Las respuestas del asistente pueden contener errores u omisiones y carecen de valor jurídico vinculante.'
  },
  {
    title: '9. Cuentas y uso permitido',
    body: 'Debes usar el servicio de forma responsable, legal y con tus propias credenciales.'
  },
  {
    title: '10. Uso prohibido',
    body: 'Queda prohibido el uso ilícito, fraudulento, la suplantación de identidad y la recogida automatizada indebida de datos.'
  },
  {
    title: '11. Propiedad intelectual',
    body: 'El software y los textos propios son de sus respectivos titulares. La información de trámites proviene de fuentes públicas y oficiales.'
  },
  {
    title: '12. Disponibilidad y suspensión',
    body: 'Podemos modificar, limitar o suspender el servicio, total o parcialmente. ' + LEGAL_DOMAIN_DEFINITIVE + ' para los términos de suspensión definitivos.'
  },
  {
    title: '13. Modificaciones',
    body: 'Podemos actualizar estos términos y te lo notificaremos mediante un aviso en la aplicación.'
  },
  {
    title: '14. Legislación aplicable',
    body: 'Estos términos se rigen por la legislación española. ' + LEGAL_DOMAIN_DEFINITIVE + ' para indicar la jurisdicción competente definitiva.'
  },
  {
    title: '15. Contacto',
    body: 'Para cualquier cuestión, escribe a ' + LEGAL_EMAIL_CONTACT + '.'
  }
];

/** Descripción de tecnologías de almacenamiento (cookies / localStorage). */
export const COOKIE_TECHNOLOGIES = [
  { type: 'Almacenamiento técnico (localStorage/sessionStorage)', described: 'Necesario para funcionamiento (sesión, preferencias).', essential: true, tracker: false },
  { type: 'Cookies técnicas del sitio', described: 'Sesión y funcionamiento básico.', essential: true, tracker: false },
  { type: 'Análisis / publicidad / tracking', described: 'No se utilizan.', essential: false, tracker: false }
];

// ===========================================
// RENDERIZADO SEGURO DEL CONTENIDO LEGAL
// ===========================================
// Los textos legales de origen contienen marcadores [REQUIERE DATO REAL: ...]
// para señalar datos que exigen intervención humana (identidad legal, dominio,
// proveedor LLM, plazos de conservación, etc.). Cuando ese contenido se muestre
// al usuario final, se sustituye el marcador por un texto profesional neutro y
// no se muestra jamás el literal técnico sin advertencia.

/** Expresión que reconoce los marcadores de dato pendiente. */
const PENDING_DATA_RE = /\[REQUIERE DATO REAL(?::[^\]]*)?\]/g;

/**
 * Sustituye los marcadores técnicos [REQUIERE DATO REAL: ...] por un texto
 * neutro y legible ("[Dato pendiente de confirmación]") para su visualización
 * al usuario final.
 */
export function sanitizeLegalText(text: string): string {
  return text.replace(PENDING_DATA_RE, '[Dato pendiente de confirmación]');
}

/**
 * Extrae la lista de datos legales pendientes presentes en los textos legales
 * de origen. Se usa para documentar en docs/LEGAL_DATA_REQUIRED.md qué datos
 * reales debe proporcionar el responsable antes de la publicación.
 */
function extractPendingItems(texts: string[]): string[] {
  const labels = new Set<string>();
  for (const text of texts) {
    PENDING_DATA_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PENDING_DATA_RE.exec(text)) !== null) {
      const inner = match[0].replace(/^\[REQUIERE DATO REAL(?::\s*)?/, '').replace(/\]$/, '');
      labels.add(inner.trim() || 'Datos legales del responsable');
    }
  }
  return Array.from(labels).sort();
}

/** Lista única de datos legales pendientes de confirmación real. */
export const LEGAL_PENDING_ITEMS: string[] = extractPendingItems([
  ...PRIVACY_SECTIONS.map((s) => s.body),
  ...TERMS_SECTIONS.map((s) => s.body),
  LEGAL_DOMAIN_DEFINITIVE,
]);

/** Aviso estándar para las páginas legales mientras falten datos reales. */
export const LEGAL_PENDING_NOTICE =
  'Parte de la información jurídica de este documento está pendiente de confirmación por el responsable ' +
  'y se completará antes de la publicación del servicio. No se muestran aquí datos no verificados.';

/** Aviso de correo de contacto no verificado. */
export const LEGAL_EMAIL_UNVERIFIED_NOTICE =
  'El correo ' + LEGAL_EMAIL_CONTACT +
  ' es provisional y debe verificarse antes de la publicación (el dominio definitivo aún no está operativo).';
