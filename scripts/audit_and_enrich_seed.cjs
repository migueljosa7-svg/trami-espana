// =====================================================================
// TRAMI ESPAÑA - Script de Auditoría, Corrección y Enriquecimiento
// Base de datos de trámites administrativos oficiales
// =====================================================================

const fs = require('fs');
const path = require('path');

const SEED_DATA_PATH = path.join(__dirname, '..', 'supabase', 'seed-data.cjs');
const existingData = require(SEED_DATA_PATH);

console.log(`Cargados ${existingData.length} trámites existentes.`);

// Mapeo de actualizaciones específicas a trámites existentes
const updatesBySlug = {
    'primera-expedicion-dni': {
        cost: '12,00 € (tasa oficial fija)',
        req: [
            'Tener nacionalidad española.',
            'Acudir en persona a la oficina de expedición de la Policía Nacional con cita previa.',
            'Ser mayor de 14 años (los menores deben ir acompañados por progenitor o tutor legal provisto de DNI).',
            'Abonar la tasa de expedición (en efectivo o mediante pago telemático previo).'
        ],
        links: [
            ['Cita previa DNI y Pasaporte (Policía Nacional)', 'https://www.citapreviadnie.es', 'appointment'],
            ['Portal oficial del DNI electrónico', 'https://www.dnielectronico.es', 'official']
        ]
    },
    'expedicion-pasaporte': {
        cost: '30,00 € (tasa oficial) / Gratuito para familias numerosas',
        req: [
            'Tener nacionalidad española y acudir personalmente a la oficina de expedición de Policía Nacional.',
            'Presentar el DNI en vigor.',
            'Abonar la tasa de expedición (salvo exención por familia numerosa acreditada).',
            'En caso de renovación, entregar el pasaporte anterior (salvo pérdida, sustracción o deterioro con denuncia).'
        ],
        links: [
            ['Cita previa Pasaporte y DNI (Policía Nacional)', 'https://www.citapreviadnie.es', 'appointment'],
            ['Policía Nacional - Pasaportes', 'https://www.policia.es', 'official']
        ]
    },
    'registro-clave': {
        t: 'Registro y activación en Cl@ve (Cl@ve Móvil y Cl@ve Permanente)',
        sd: 'Date de alta en Cl@ve, la plataforma oficial de identificación para trámites con la Administración.',
        d: 'Cl@ve es la plataforma unificada de identificación, autenticación y firma electrónica de las Administraciones Públicas españolas. Integra Cl@ve Móvil (a través de la app Cl@ve), Cl@ve PIN y Cl@ve Permanente, permitiendo acceder a la AEAT, Seguridad Social, DGT, SEPE y carpetas ciudadanas sin necesidad de certificado digital.',
        links: [
            ['Portal oficial de Cl@ve', 'https://clave.gob.es', 'official'],
            ['Descarga App Cl@ve (Agencia Tributaria)', 'https://sede.agenciatributaria.gob.es', 'download']
        ]
    },
    'certificado-digital-fnmt': {
        cost: 'Gratuito (acreditación presencial o DNIe) / 2,99 € + IVA (vídeo identificación)',
        sd: 'Solicita tu certificado digital de persona física FNMT para firmar telemáticamente con validez legal.',
        d: 'El Certificado de Persona Física de la Fábrica Nacional de Moneda y Timbre (FNMT-RCM) es la certificación digital que acredita electrónicamente tu identidad. Permite realizar trámites de forma segura ante la AEAT, Seguridad Social, SEPE, DGT y Administraciones Autonómicas y Locales. Se puede obtener con acreditación presencial, DNIe o vídeo identificación.',
        req: [
            'Tener DNI o NIE válido.',
            'Realizar la solicitud online desde el navegador del equipo.',
            'Acreditar la identidad: presencialmente en oficina de registro, con DNI electrónico o mediante vídeo identificación online.',
            'Descargar e instalar el certificado en el mismo equipo o navegador.'
        ],
        links: [
            ['Sede Electrónica FNMT-RCM (Certificados)', 'https://www.sede.fnmt.gob.es', 'official']
        ]
    },
    'vida-laboral': {
        t: 'Informe de Vida Laboral (Seguridad Social - Import@ss)',
        url: 'https://portal.seg-social.gob.es',
        sd: 'Descarga al instante tu informe de vida laboral oficial a través del portal Import@ss de la TGSS.',
        d: 'El informe de vida laboral acredita todo tu historial de cotizaciones en el sistema de la Seguridad Social española: empresas contratantes, días en alta, grupos de cotización y coeficientes de parcialidad. Se obtiene de forma instantánea en PDF a través del portal oficial Import@ss de la Tesorería General de la Seguridad Social (TGSS).',
        links: [
            ['Portal Import@ss - Informe de Vida Laboral', 'https://portal.seg-social.gob.es', 'official'],
            ['Sede Electrónica de la Seguridad Social', 'https://sede.seg-social.gob.es', 'official']
        ]
    },
    'inscripcion-demandante-empleo': {
        t: 'Inscripción como demandante de empleo (Servicios Autonómicos / SEPE)',
        sd: 'Date de alta como demandante de empleo, requisito indispensable para ofertas y prestaciones.',
        d: 'La inscripción como demandante de empleo (popularmente «apuntarse al paro») habilita la búsqueda activa de empleo a través de los Servicios Públicos de Empleo y es requisito previo imprescindible para solicitar cualquier prestación o subsidio por desempleo ante el SEPE. La competencia de gestión corresponde a las Comunidades Autónomas (SOC, SAE, Lanbide, SERVEF, etc.) y al SEPE en Ceuta y Melilla.',
        links: [
            ['SEPE - Sede Electrónica', 'https://sede.sepe.gob.es', 'official'],
            ['Portal Empléate (Ministerio de Trabajo)', 'https://www.empleate.gob.es', 'official']
        ]
    },
    'subsidio-mayores-52-anos': {
        sd: 'Solicita el subsidio asistencial del SEPE para desempleados mayores de 52 años.',
        d: 'El subsidio para mayores de 52 años es la ayuda asistencial del SEPE más protectora: se percibe hasta alcanzar la edad ordinaria de jubilación y la entidad gestora cotiza por jubilación a la Seguridad Social (por el 125 % del tope mínimo de cotización vigente). Requiere carencia de rentas individuales.',
        links: [
            ['SEPE - Subsidio para mayores de 52 años', 'https://sede.sepe.gob.es', 'official']
        ]
    },
    'subsidio-desempleo-agotamiento': {
        t: 'Subsidio por desempleo por agotamiento (SEPE - Reforma RDL 2/2024)',
        sd: 'Solicita el subsidio asistencial del SEPE tras agotar tu prestación contributiva de paro.',
        d: 'Tras la entrada en vigor del Real Decreto-ley 2/2024 de simplificación de subsidios por desempleo, se elimina el mes de espera obligatorio tras el paro y se amplía el acceso a menores de 45 años sin responsabilidades familiares. Requiere carencia de rentas individuales (inferiores al 75 % del SMI).',
        links: [
            ['SEPE - Trámites de Protección por Desempleo', 'https://sede.sepe.gob.es', 'official']
        ]
    },
    'baja-medica-incapacidad-temporal': {
        t: 'Baja médica por incapacidad temporal (Seguridad Social / RDL 1060/2022)',
        sd: 'Gestión telemática de la baja médica sin obligación de entrega en papel a la empresa.',
        d: 'Desde la entrada en vigor del Real Decreto 1060/2022, el facultativo del Servicio Público de Salud o Mutua expide el parte de baja de forma telemática y lo remite directamente al INSS, quien a su vez lo traslada automáticamente a la empresa. El trabajador ya no está obligado a entregar ninguna copia física a su empleador.',
        req: [
            'Estar en situación médica de imposibilidad temporal para trabajar reconocida por facultativo.',
            'Avisar a la empresa de la situación de baja médica a la mayor brevedad.',
            'Seguir el tratamiento médico prescrito y acudir a las revisiones de seguimiento programadas.'
        ],
        docs: [
            ['Copia del parte de baja para el trabajador (expedido por el médico)', true],
            ['Tarjeta Sanitaria Individual (TSI) y DNI/NIE', true],
            ['Informes clínicos justificativos del proceso patológico', false]
        ],
        steps: [
            ['Acude al centro de salud o mutua', 'El facultativo evalúa la patología y emite el parte de baja telemático.'],
            ['Comunica la baja a tu empresa', 'El INSS notifica telemáticamente a la empresa, pero debes comunicar tu ausencia por los canales internos habituales.'],
            ['Acude a las revisiones', 'Pasa los reconocimientos médicos de confirmación en las fechas fijadas.'],
            ['Emisión del alta médica', 'El médico de cabecera, mutua o inspector emite el alta con incorporación al puesto al día siguiente hábil.']
        ],
        links: [
            ['Sede Electrónica de la Seguridad Social', 'https://sede.seg-social.gob.es', 'official']
        ]
    },
    'tarjeta-sanitaria-europea': {
        url: 'https://sede.seg-social.gob.es',
        links: [
            ['Seguridad Social - Solicitud de la TSE', 'https://sede.seg-social.gob.es', 'official']
        ]
    },
    'libro-familia': {
        t: 'Certificado de Registro Civil y Hoja Individual (DICIREG / Ley 20/2011)',
        s: 'libro-familia',
        sd: 'Obtén certificaciones registrales de matrimonio y nacimiento tras el fin del Libro de Familia físico.',
        d: 'Con la implantación de la Ley 20/2011 del Registro Civil (DICIREG), el tradicional Libro de Familia en papel físico dejó de expedirse el 30 de abril de 2021. Las relaciones de parentesco, matrimonio y filiación se acreditan actualmente mediante la Hoja Individual registral y los Certificados Literales electrónicos con Código Seguro de Verificación (CSV) emitidos por el Ministerio de Justicia.',
        req: [
            'Haber inscrito el hecho (nacimiento, matrimonio, defunción) en el Registro Civil.',
            'Identificarse mediante Cl@ve, certificado digital o DNI electrónico para obtención telemática instantánea.',
            'En caso presencial, solicitar cita previa en la oficina consular o Registro Civil correspondiente.'
        ],
        docs: [
            ['DNI, NIE o pasaporte en vigor del solicitante', true],
            ['Datos identificativos del hecho: nombres, fechas y tomo/página o código DICIREG', true]
        ],
        steps: [
            ['Accede a la sede de Justicia', 'Entra en sede.mjusticia.gob.es con Cl@ve o certificado digital.'],
            ['Selecciona el certificado', 'Elige certificado literal de nacimiento, matrimonio o defunción.'],
            ['Indica la finalidad', 'Especifica el motivo de la expedición oficial.'],
            ['Descarga el PDF con CSV', 'El documento electrónico tiene plena validez jurídica inmediata ante cualquier organismo.']
        ],
        links: [
            ['Sede Electrónica del Ministerio de Justicia', 'https://sede.mjusticia.gob.es', 'official']
        ]
    },
    'renovacion-permiso-conducir': {
        cost: '24,58 € (tasa DGT 4.4) / Gratuito para mayores de 70 años (+ coste psicotécnico)',
        links: [
            ['DGT - Renovación de permisos de conducir', 'https://sede.dgt.gob.es', 'official'],
            ['Centros Médicos Autorizados DGT', 'https://www.dgt.gob.es', 'official']
        ]
    },
    'cambio-titularidad-vehiculo': {
        cost: '55,70 € (tasa DGT 1.5) + Impuesto de Transmisiones (ITP autonómico)',
        req: [
            'Haber liquidado previamente el Impuesto sobre Transmisiones Patrimoniales (ITP Modelo 620 o 621) en la Comunidad Autónoma compradora.',
            'Realizar el trámite en la DGT en los 30 días posteriores a la firma del contrato.',
            'Estar el vehículo libre de precintos, embargos o reservas de dominio, y al corriente del IVTM del año anterior.',
            'Abonar la tasa oficial 1.5 de la DGT.'
        ],
        links: [
            ['DGT - Cambio de titularidad de vehículos', 'https://sede.dgt.gob.es', 'official']
        ]
    },
    'nacionalidad-espanola-residencia': {
        cost: '104,05 € (tasa modelo 790 código 026) + exámenes Instituto Cervantes',
        links: [
            ['Ministerio de Justicia - Nacionalidad por Residencia', 'https://sede.mjusticia.gob.es', 'official'],
            ['Instituto Cervantes - Pruebas CCSE y DELE', 'https://examenes.cervantes.es', 'official']
        ]
    },
    'primera-expedicion-tie': {
        cost: '16,08 € (tasa modelo 790 código 012 - primera concesión)',
        links: [
            ['Cita previa Extranjería (Toma de huellas)', 'https://icp.administracionelectronica.gob.es/icpplus/index.html', 'appointment'],
            ['Policía Nacional - Extranjería y Documentación', 'https://www.policia.es', 'official']
        ]
    }
};

// Aplicar actualizaciones
const updatedData = existingData.map((item) => {
    if (updatesBySlug[item.s]) {
        return { ...item, ...updatesBySlug[item.s] };
    }
    return item;
});

// Trámites nuevos para enriquecer la base de datos (institucionales y de máxima demanda)
const newProcedures = [
    {
        cat: 'identidad',
        t: 'Renovación del Documento Nacional de Identidad (DNI)',
        s: 'renovacion-dni',
        sd: 'Renueva tu DNI por caducidad, pérdida, sustracción o cambio de domicilio.',
        d: 'La renovación del DNI debe realizarse de forma presencial en las oficinas de expedición de la Policía Nacional con cita previa. Puede solicitarse dentro de los últimos 180 días de vigencia. Es gratuita si se debe exclusivamente a un cambio de domicilio o por acreditar la condición de familia numerosa.',
        cost: '12,00 € (tasa) / Gratuito por cambio de domicilio o familia numerosa',
        dur: '15 minutos (entrega en el acto)',
        url: 'https://www.dnielectronico.es',
        req: [
            'Tener nacionalidad española.',
            'Acudir presencialmente a la cita en el equipo de expedición de la Policía Nacional.',
            'Tramitar la renovación dentro de los 180 días previos a su caducidad (o con el documento ya caducado).',
            'En caso de cambio de domicilio, aportar volante de empadronamiento con menos de 3 meses de antigüedad.'
        ],
        docs: [
            ['DNI anterior (o denuncia policial en caso de pérdida o sustracción)', true],
            ['Fotografía reciente a color con fondo blanco liso (32x26 mm)', true],
            ['Volante o certificado de empadronamiento (solo si ha cambiado de domicilio)', false],
            ['Título de familia numerosa en vigor (para exención de tasa)', false]
        ],
        steps: [
            ['Solicita cita previa', 'Reserva fecha y hora en el portal citapreviadnie.es o llamando al 060.'],
            ['Prepara la documentación', 'Fotografía reciente, DNI anterior y empadronamiento si cambiaste de domicilio.'],
            ['Acude a la comisaría asignada', 'Paga la tasa de 12 € en efectivo en ventanilla o previamente por vía telemática.'],
            ['Entrega en el acto', 'Tras la toma de huellas dactilares y firma, el nuevo DNI 4.0 se entrega al momento.']
        ],
        links: [
            ['Cita previa DNI y Pasaporte', 'https://www.citapreviadnie.es', 'appointment'],
            ['Portal oficial del DNI electrónico (Policía Nacional)', 'https://www.dnielectronico.es', 'official']
        ]
    },
    {
        cat: 'empadronamiento',
        t: 'Alta inicial en el Padrón Municipal de Habitantes',
        s: 'alta-padron-municipal',
        sd: 'Inscríbete por primera vez en el padrón municipal al fijar tu residencia en una localidad.',
        d: 'Toda persona que viva en España está obligada a inscribirse en el Padrón del municipio donde resida habitualmente. El empadronamiento acredita el tiempo de permanencia en el país y es la llave de acceso a la sanidad pública, educación de menores, voto y trámites de extranjería.',
        cost: 'Gratuito',
        dur: '20 minutos (presencial o telemático)',
        url: 'https://administracion.gob.es',
        req: [
            'Residir habitualmente en el término municipal.',
            'Acreditar la identidad de todos los miembros de la unidad familiar que se inscriben.',
            'Disponer del título legal que justifica el uso de la vivienda (propiedad, arrendamiento o autorización).'
        ],
        docs: [
            ['DNI, NIE o pasaporte en vigor de todos los inscritos', true],
            ['Contrato de arrendamiento en vigor junto al último recibo de pago o escritura de propiedad', true],
            ['Hoja padronal municipal debidamente cumplimentada y firmada', true],
            ['Libro de familia o certificado de nacimiento para menores de edad', false]
        ],
        steps: [
            ['Pide cita o accede a la sede electrónica', 'En la Oficina de Atención a la Ciudadanía (OAC) de tu Ayuntamiento.'],
            ['Presenta el título de la vivienda', 'Contrato de alquiler, escritura o autorización expresa del titular empadronado.'],
            ['Firma la hoja padronal', 'Se inscriben simultáneamente todos los convivientes.'],
            ['Obtén el volante de empadronamiento', 'Certifica de inmediato tu residencia en el municipio.']
        ],
        links: [
            ['Portal de la Administración General del Estado', 'https://administracion.gob.es', 'official']
        ]
    },
    {
        cat: 'laboral',
        t: 'Prestación contributiva por desempleo (Paro - SEPE)',
        s: 'prestacion-contributiva-desempleo',
        sd: 'Solicita la prestación contributiva por desempleo tras cotizar un mínimo de 360 días.',
        d: 'La prestación contributiva por desempleo protege la situación de quienes, pudiendo y queriendo trabajar, pierden su empleo de forma involuntaria tras cotizar al menos 360 días en los 6 años anteriores. La cuantía equivale al 70 % de la base reguladora los primeros 180 días y al 60 % a partir del día 181.',
        cost: 'Gratuito',
        dur: '20 minutos (solicitud online)',
        url: 'https://sede.sepe.gob.es',
        req: [
            'Estar afiliado a la Seguridad Social en un régimen que cotice por desempleo.',
            'Estar en situación legal de desempleo (despido, fin de contrato temporal o ERE; no aplica baja voluntaria).',
            'Tener cotizados al menos 360 días dentro de los 6 años inmediatamente anteriores.',
            'Estar inscrito como demandante de empleo y solicitar en el plazo de 15 días hábiles desde el cese laboral.'
        ],
        docs: [
            ['Modelo oficial de solicitud de prestación por desempleo (SEPE)', true],
            ['DNI o NIE en vigor del solicitante', true],
            ['Certificado de empresa de los últimos 180 días cotizados (enviado telemáticamente por la empresa al SEPE)', false],
            ['Número de cuenta bancaria (IBAN) donde el solicitante sea titular', true]
        ],
        steps: [
            ['Inscríbete como demandante de empleo', 'En el servicio público de empleo autonómico de tu comunidad.'],
            ['Comprueba el Certificado de Empresa', 'Verifica en la sede del SEPE que tu exempleador ha enviado el certificado.'],
            ['Presenta la solicitud telemática', 'En sede.sepe.gob.es con Cl@ve, certificado digital o mediante presolicitud online.'],
            ['Cobro de la nómina', 'El SEPE abona la prestación mensual entre los días 10 y 15 de cada mes en tu cuenta bancaria.']
        ],
        links: [
            ['SEPE - Sede Electrónica de Prestaciones', 'https://sede.sepe.gob.es', 'official'],
            ['Cita previa en oficinas del SEPE', 'https://sede.sepe.gob.es/portalSede/procedimientos-y-servicios/personas/proteccion-por-desempleo/cita-previa', 'appointment']
        ]
    },
    {
        cat: 'seguridad-social',
        t: 'Asignación del Número de la Seguridad Social (NUSS / NAF)',
        s: 'solicitud-numero-seguridad-social-nuss',
        sd: 'Obtén tu Número de la Seguridad Social oficial por vía telemática en Import@ss.',
        d: 'El Número de la Seguridad Social (NUSS) identifica al ciudadano en sus relaciones con la Seguridad Social y pasa a ser Número de Afiliación (NAF) cuando se inicia una relación laboral. Es obligatorio para formalizar el primer contrato de trabajo, para prácticas universitarias o de FP, y para darse de alta como autónomo.',
        cost: 'Gratuito',
        dur: '5 minutos (resolución y descarga inmediata)',
        url: 'https://portal.seg-social.gob.es',
        req: [
            'Disponer de DNI, NIE o pasaporte en vigor.',
            'Identificarse en la plataforma mediante Cl@ve, Certificado digital o vía SMS (si el teléfono móvil está registrado en la TGSS).',
            'No haber tenido asignado previamente otro número de afiliación a la Seguridad Social.'
        ],
        docs: [
            ['DNI o NIE en vigor', true],
            ['Número de teléfono móvil personal para recepción de código de verificación', true],
            ['Dirección de correo electrónico válida', true]
        ],
        steps: [
            ['Entra en el portal Import@ss', 'Accede al servicio oficial «Solicitar el Número de la Seguridad Social».'],
            ['Identifícate digitalmente', 'Accede con Cl@ve Móvil, Cl@ve PIN, certificado digital o vía SMS.'],
            ['Confirma tus datos personales', 'Revisa el domicilio y los datos de contacto que constarán en el sistema.'],
            ['Descarga la resolución oficial', 'Obtén al instante el documento PDF con tu NUSS oficial y sello electrónico.']
        ],
        links: [
            ['Import@ss - Tesorería General de la Seguridad Social', 'https://portal.seg-social.gob.es', 'official'],
            ['Sede Electrónica de la Seguridad Social', 'https://sede.seg-social.gob.es', 'official']
        ]
    },
    {
        cat: 'impuestos',
        t: 'Declaración de la Renta y Borrador de IRPF (Renta WEB - AEAT)',
        s: 'declaracion-renta-irpf',
        sd: 'Accede a tu borrador, revisa deducciones y presenta la declaración del IRPF en Renta WEB.',
        d: 'La declaración del Impuesto sobre la Renta de las Personas Físicas (IRPF) es la autoliquidación tributaria anual obligatoria para contribuyentes que superen los límites de rendimientos de trabajo, capital o actividades económicas fijados por la Ley. Se tramita durante la Campaña de la Renta a través del servicio telemático Renta WEB de la Agencia Tributaria.',
        cost: 'Gratuito',
        dur: '25 minutos (online)',
        url: 'https://sede.agenciatributaria.gob.es',
        req: [
            'Haber percibido rentas sujetas a IRPF en el ejercicio fiscal anterior por encima de los límites de exención.',
            'Disponer de sistema de acceso: Cl@ve, certificado electrónico, DNIe o Número de Referencia (obtenido con la casilla 505 del año anterior).',
            'Presentar la declaración dentro del plazo oficial de la Campaña de la Renta (abril a junio/julio de cada año).'
        ],
        docs: [
            ['DNI o NIE del declarante, cónyuge e hijos convivientes', true],
            ['Datos fiscales del ejercicio suministrados por la AEAT', true],
            ['Certificados de retenciones de pagadores, bancos y entidades financieras', false],
            ['Justificantes de deducciones autonómicas aplicables (alquiler, maternidad, donaciones)', false]
        ],
        steps: [
            ['Accede al portal de Campaña de Renta', 'Entra en sede.agenciatributaria.gob.es y selecciona «Servicio tramitación de borrador / declaración (Renta WEB)».'],
            ['Identifícate y traslada datos', 'Valida tu identificación y revisa el traslado de datos fiscales a tu borrador.'],
            ['Aplica deducciones estatales y autonómicas', 'Revisa deducciones clave por alquiler de vivienda habitual, familia o planes de pensiones.'],
            ['Presenta y guarda el justificante', 'Firma y envía la autoliquidación; obtendrás el recibo oficial con CSV y resultado a devolver o ingresar.']
        ],
        links: [
            ['Campaña de la Renta - Agencia Tributaria', 'https://sede.agenciatributaria.gob.es', 'official'],
            ['Obtención de número de referencia (Casilla 505)', 'https://sede.agenciatributaria.gob.es', 'information']
        ]
    },
    {
        cat: 'vehiculos',
        t: 'Informe de antecedentes del vehículo (DGT)',
        s: 'informe-vehiculo-dgt',
        sd: 'Comprueba el historial, cargas, embargos y kilometraje de un vehículo antes de comprarlo.',
        d: 'El informe de vehículo de la Dirección General de Tráfico permite conocer la situación administrativa y técnica real de cualquier vehículo matriculado en España. Esencial para operaciones de compraventa de segunda mano: previene comprar vehículos con precintos, embargos, impagos de IVTM o con kilometraje manipulado en ITV.',
        cost: 'Gratuito (informe reducido) / 8,67 € (tasa DGT 4.1 para informe detallado)',
        dur: '5 minutos (consulta y descarga en el acto)',
        url: 'https://sede.dgt.gob.es',
        req: [
            'Conocer la matrícula o el número de bastidor (VIN) del vehículo a consultar.',
            'Para el informe completo detallado: disponer de certificado digital, Cl@ve o DNI electrónico.',
            'Abonar la tasa oficial 4.1 de la DGT (8,67 €) mediante tarjeta de débito/crédito o pasarela bancaria.'
        ],
        docs: [
            ['Número de matrícula o bastidor del vehículo', true],
            ['DNI o NIE del solicitante', true],
            ['Justificante del pago de la tasa 4.1 de la DGT (solo para informe detallado)', false]
        ],
        steps: [
            ['Accede a la sede de la DGT o app miDGT', 'Entra en el servicio de «Informe de vehículo» de la DGT.'],
            ['Introduce la matrícula', 'Consulta primero el Informe Reducido (es gratuito e indica si el vehículo está autorizado para circular o tiene incidencias).'],
            ['Solicita el Informe Completo', 'Si detectas avisos, abona la tasa 4.1 de 8,67 € con tarjeta bancaria.'],
            ['Descarga el informe oficial', 'Revisa la titularidad, historial de ITV con lecturas de kilometraje, bajas temporales y cargas financieras.']
        ],
        links: [
            ['DGT - Consulta e Informes de Vehículos', 'https://sede.dgt.gob.es', 'official'],
            ['App oficial miDGT (iOS y Android)', 'https://www.dgt.gob.es', 'download']
        ]
    },
    {
        cat: 'familia',
        t: 'Certificado de antecedentes penales (Ministerio de Justicia)',
        s: 'certificado-antecedentes-penales',
        sd: 'Solicita el certificado oficial que acredita la carencia o constancia de antecedentes penales.',
        d: 'El certificado de antecedentes penales es el documento oficial expedido por el Ministerio de la Presidencia, Justicia y Relaciones con las Cortes que acredita si una persona carece o tiene antecedentes en el Registro Central de Penados. Imprescindible para oposiciones, concesión de visados y autorizaciones de extranjería, y trámites de adopción.',
        cost: '3,86 € (tasa modelo 790 código 006)',
        dur: '10 minutos (online con Cl@ve o certificado)',
        url: 'https://sede.mjusticia.gob.es',
        req: [
            'Ser mayor de edad o estar representado legalmente.',
            'Identificarse digitalmente con Cl@ve, certificado digital o DNIe.',
            'Abonar la tasa oficial 790-006 mediante pasarela de pagos telemática de la AEAT.'
        ],
        docs: [
            ['DNI, NIE o pasaporte en vigor del solicitante', true],
            ['Justificante del pago telemático de la tasa 790 código 006', true],
            ['Poder notarial o documento de representación legal si actúa un tercero', false]
        ],
        steps: [
            ['Accede a la Sede del Ministerio de Justicia', 'Entra en el trámite de «Certificado de antecedentes penales».'],
            ['Paga la tasa telemática 790-006', 'Abona los 3,86 € con tarjeta o cargo en cuenta en la pasarela de la AEAT.'],
            ['Firma la solicitud con Cl@ve o certificado', 'El sistema comprueba al instante las bases de datos del Registro Central de Penados.'],
            ['Descarga el certificado en PDF', 'El documento incluye Código Seguro de Verificación (CSV) y tiene validez oficial de 3 meses.']
        ],
        links: [
            ['Sede Electrónica del Ministerio de Justicia - Penales', 'https://sede.mjusticia.gob.es', 'official'],
            ['Ministerio de Justicia - Información oficial', 'https://www.mjusticia.gob.es', 'information']
        ]
    },
    {
        cat: 'extranjeria',
        t: 'Cita previa de Extranjería y Toma de Huellas (TIE)',
        s: 'cita-previa-extranjeria-icp',
        sd: 'Reserva cita previa para trámites de extranjería y expedición de la TIE en comisarías.',
        d: 'El sistema oficial de Cita Previa de Administraciones Públicas permite reservar turno de atención presencial en las Oficinas de Extranjería y Comisarías de la Policía Nacional para expedición de la Tarjeta de Identidad de Extranjero (toma de huellas), recogida de TIE, asignación de NIE y cartas de invitación.',
        cost: 'Gratuito',
        dur: '10 minutos',
        url: 'https://icp.administracionelectronica.gob.es/icpplus/index.html',
        req: [
            'Estar en posesión de resolución favorable de residencia o estancia legal superior a 6 meses.',
            'Disponer de pasaporte en vigor o NIE asignado.',
            'Disponer de número de teléfono móvil nacional para la recepción del código SMS de confirmación.',
            'Solicitar la cita en la provincia donde esté empadronado el interesado.'
        ],
        docs: [
            ['Pasaporte original completo en vigor', true],
            ['Resolución de concesión de la autorización de residencia o número de expediente', true],
            ['Número de teléfono móvil activo para validación de la cita por SMS', true]
        ],
        steps: [
            ['Accede a la sede electrónica oficial', 'Entra en icp.administracionelectronica.gob.es/icpplus/index.html.'],
            ['Selecciona provincia y trámite', 'Elige tu provincia de empadronamiento y la opción «POLICÍA - TOMA DE HUELLA (EXPEDICIÓN DE TARJETA)».'],
            ['Introduce tus datos personales', 'Completa NIE o pasaporte, nombre y apellidos tal como constan en el documento.'],
            ['Confirma con código SMS', 'Selecciona el centro disponible, introduce el código SMS recibido y descarga el justificante de cita.']
        ],
        links: [
            ['Sede Oficial de Cita Previa de Extranjería', 'https://icp.administracionelectronica.gob.es/icpplus/index.html', 'appointment'],
            ['Portal de Inmigración (Ministerio de Inclusión)', 'https://extranjeros.inclusion.gob.es', 'official']
        ]
    }
];

// Unir trámites existentes corregidos y nuevos
const finalData = [...updatedData, ...newProcedures];

console.log(`Dataset final contiene: ${finalData.length} trámites (incremento de ${newProcedures.length} trámites nuevos).`);

// Guardar archivo seed-data.cjs actualizado
const fileContent = `// =====================================================================
// TRAMI ESPAÑA - Datos editoriales de trámites oficiales (Auditoría v9)
// Verificado con sedes oficiales: SEPE, Seguridad Social, DGT, AEAT,
// Registro Civil / Ministerio de Justicia, Policía Nacional y Extranjería.
// =====================================================================
module.exports = ${JSON.stringify(finalData, null, 2)};
`;

fs.writeFileSync(SEED_DATA_PATH, fileContent, 'utf8');
console.log(`Archivo ${SEED_DATA_PATH} actualizado exitosamente.`);

// Generar también archivo JSON exportable independiente
const JSON_OUT = path.join(__dirname, '..', 'supabase', 'seed_procedures_audited.json');
fs.writeFileSync(JSON_OUT, JSON.stringify(finalData, null, 2), 'utf8');
console.log(`Exportado JSON independiente: ${JSON_OUT}`);
