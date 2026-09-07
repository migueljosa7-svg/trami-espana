-- ============================================================================
-- TRAMI ESPAÑA - Migración 20240101000013
-- Limpieza de trámites DEMO, datos oficiales reales y corrección de tasa DNI a 12€
-- ============================================================================

DO $$
DECLARE
    admin_uuid UUID := 'f327b75a-b43a-4be1-a636-68f7c102f682'; -- migueljosa7@gmail.com
    cat_identidad UUID;
    cat_vivienda UUID;
    cat_empleo UUID;
    cat_tributos UUID;
    cat_educacion UUID;
    cat_familia UUID;
    cat_movilidad UUID;

    id_dni UUID;
    id_padron UUID;
    id_paro UUID;
    id_seg_social UUID;
    id_renta UUID;
    id_beca UUID;
    id_matrimonio UUID;
    id_conducir UUID;
    id_nie UUID;
    id_alquiler UUID;
    id_autonomo UUID;
    id_nacimiento UUID;
BEGIN
    -- Obtener categorías
    SELECT id INTO cat_identidad FROM public.procedure_categories WHERE slug = 'identidad';
    SELECT id INTO cat_vivienda FROM public.procedure_categories WHERE slug = 'vivienda';
    SELECT id INTO cat_empleo FROM public.procedure_categories WHERE slug = 'empleo';
    SELECT id INTO cat_tributos FROM public.procedure_categories WHERE slug = 'tributos';
    SELECT id INTO cat_educacion FROM public.procedure_categories WHERE slug = 'educacion';
    SELECT id INTO cat_familia FROM public.procedure_categories WHERE slug = 'familia';
    SELECT id INTO cat_movilidad FROM public.procedure_categories WHERE slug = 'movilidad';

    -- Si alguna categoría no existe, asignar la primera disponible como fallback
    IF cat_movilidad IS NULL THEN SELECT id INTO cat_movilidad FROM public.procedure_categories LIMIT 1; END IF;

    -- =========================================================================
    -- 1. CORREGIR TRÁMITE DNI (renovacion-dni)
    -- Tasa oficial real: 12 € (tasa modelo 790 código 012). Gratuito familia numerosa o cambio domicilio.
    -- =========================================================================
    SELECT id INTO id_dni FROM public.procedures WHERE slug = 'renovacion-dni';

    IF id_dni IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Renovación del Documento Nacional de Identidad (DNI)',
            short_description = 'Guía oficial para renovar tu DNI por caducidad, pérdida, sustracción, deterioro o cambio de datos.',
            description = 'El Documento Nacional de Identidad (DNI) acredita de forma personal la identidad y nacionalidad de los ciudadanos españoles. La tasa oficial de renovación es de 12,00 € (modelo 790 código 012), y es totalmente gratuita en caso de cambio de domicilio con DNI en vigor o acreditando condición de familia numerosa. El trámite se realiza presencialmente con cita previa en las comisarías y oficinas de expedición de la Policía Nacional, y el nuevo documento se expide y entrega en el acto.',
            cost = '12 € (tasa modelo 790 código 012). Gratuito por cambio de domicilio (con DNI en vigor) o acreditando condición de familia numerosa.',
            estimated_duration = 'En el acto (cita presencial en oficina de expedición)',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Policía Nacional - Ministerio del Interior',
            source_url = 'https://www.citapreviadnie.es/',
            updated_at = NOW()
        WHERE id = id_dni;

        -- Requisitos DNI
        DELETE FROM public.procedure_requirements WHERE procedure_id = id_dni;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_dni, 'DNI anterior o motivo de renovación', 'Presentar el DNI caducado, próximo a caducar (últimos 180 días), deteriorado o denuncia de pérdida/sustracción.', 1),
            (id_dni, 'Fotografía reciente', 'Una fotografía reciente en color (32x40 mm) con fondo uniforme blanco y liso, tomada de frente con el rostro despejado.', 2),
            (id_dni, 'Pago de la tasa oficial de 12 €', 'Abono de la tasa de 12 € (modelo 790 código 012). Exención del 100% para familias numerosas o cambio de domicilio con DNI en vigor.', 3),
            (id_dni, 'Presencia física del titular', 'La persona titular debe comparecer personalmente en la oficina de expedición (menores de 14 años acompañados de progenitor o tutor).', 4);

        -- Documentos DNI
        DELETE FROM public.procedure_documents WHERE procedure_id = id_dni;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_dni, 'DNI anterior', 'El documento que se renueva. En caso de pérdida o robo, presentar copia de la denuncia.', true, 1),
            (id_dni, 'Fotografía de carnet', '32x40 mm, fondo blanco, reciente, sin gafas oscuras ni prendas que oculten el óvalo de la cara.', true, 2),
            (id_dni, 'Justificante de pago de la tasa de 12 €', 'Resguardo del pago de 12 € (telemático en citapreviadnie.es o en efectivo/tarjeta en la oficina) o título de familia numerosa en vigor.', true, 3),
            (id_dni, 'Certificado de empadronamiento', 'Solo necesario si ha variado el domicilio respecto al DNI anterior. Expedido con un máximo de 3 meses de antelación.', false, 4);

        -- Pasos DNI
        DELETE FROM public.procedure_steps WHERE procedure_id = id_dni;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_dni, 'Solicitar cita previa', 'Pedir cita en www.citapreviadnie.es o a través del teléfono 060 indicando tu número de DNI y equipo expedidor deseado.', 1, true),
            (id_dni, 'Abonar la tasa de 12 € o preparar exención', 'Pagar 12 € online al solicitar la cita, o en efectivo/tarjeta física el día de la cita en la comisaría. Si eres familia numerosa o cambias domicilio con DNI vigente, el trámite es gratuito.', 2, true),
            (id_dni, 'Acudir a la oficina de expedición', 'Presentarse en la oficina seleccionada el día y hora con la fotografía y documentos físicos requeridos.', 3, true),
            (id_dni, 'Entrega del DNI en el acto', 'El nuevo DNIe 4.0 se imprime y entrega en mano en el acto tras la toma de huella dactilar, permitiendo activar los certificados digitales.', 4, false);

        -- Enlaces DNI
        DELETE FROM public.procedure_links WHERE procedure_id = id_dni;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_dni, 'Cita Previa Oficial DNI', 'https://www.citapreviadnie.es/', 'appointment', true, 'Portal oficial del Ministerio del Interior para solicitar cita'),
            (id_dni, 'Portal Oficial DNI Electrónico', 'https://www.dnielectronico.es/', 'official', true, 'Información oficial de la Policía Nacional sobre el DNIe'),
            (id_dni, 'Sede Electrónica Policía Nacional', 'https://sede.policia.gob.es/', 'information', true, 'Trámites de extranjería y documentación policial');
    END IF;

    -- =========================================================================
    -- 2. EMPADRONAMIENTO (empadronamiento)
    -- =========================================================================
    SELECT id INTO id_padron FROM public.procedures WHERE slug = 'empadronamiento';
    IF id_padron IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Empadronamiento en el municipio',
            short_description = 'Inscripción en el Padrón Municipal que acredita la residencia habitual en un municipio español.',
            description = 'El empadronamiento es la inscripción obligatoria en el padrón del municipio donde resides habitualmente. Es la prueba fehaciente del domicilio para acceder a servicios públicos (atención sanitaria, escolarización, votar, tramitar ayudas). El trámite es 100% gratuito y se realiza ante el Ayuntamiento correspondiente de forma presencial o por Sede Electrónica.',
            cost = 'Gratuito',
            estimated_duration = 'En el acto presencialmente, o 1-5 días hábiles vía Sede Electrónica',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Ayuntamiento / Instituto Nacional de Estadística (INE)',
            source_url = 'https://administracion.gob.es/',
            updated_at = NOW()
        WHERE id = id_padron;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_padron;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_padron, 'Residencia efectiva en el municipio', 'Vivir de forma habitual en la vivienda situada dentro del término municipal.', 1),
            (id_padron, 'Título de ocupación legítimo', 'Acreditar el derecho de uso de la vivienda (escritura de propiedad, contrato de alquiler o autorización del titular).', 2),
            (id_padron, 'Identificación oficial', 'Presentar DNI, NIE o pasaporte en vigor de todos los miembros mayores de edad que se empadronan.', 3);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_padron;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_padron, 'Documento de identidad (DNI/NIE/Pasaporte)', 'Original del documento identificativo en vigor.', true, 1),
            (id_padron, 'Hoja de inscripción padronal', 'Formulario oficial del Ayuntamiento cumplimentado y firmado por todos los empadronados mayores de edad.', true, 2),
            (id_padron, 'Documento acreditativo de la vivienda', 'Contrato de alquiler en vigor con último recibo, o escritura de propiedad del inmueble.', true, 3),
            (id_padron, 'Libro de Familia o certificado de nacimiento', 'Obligatorio en caso de empadronar a menores de edad junto con sus progenitores.', false, 4);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_padron;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_padron, 'Solicitar cita previa en el Ayuntamiento', 'Pedir cita en la Oficina de Atención al Ciudadano municipal o entrar con Cl@ve a la sede electrónica.', 1, true),
            (id_padron, 'Preparar la documentación de la vivienda', 'Reunir el contrato de arrendamiento o escritura y autorizaciones de convivencia.', 2, true),
            (id_padron, 'Presentar la solicitud', 'Entregar la documentación presencialmente o firmarla digitalmente a través del registro telemático.', 3, false),
            (id_padron, 'Obtener volante o certificado', 'Recibir el volante de empadronamiento que acredita tu inscripción oficial en el municipio.', 4, false);

        DELETE FROM public.procedure_links WHERE procedure_id = id_padron;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_padron, 'Punto de Acceso General (PAG)', 'https://administracion.gob.es/', 'official', true, 'Directorio de administraciones locales y autonómicas'),
            (id_padron, 'Instituto Nacional de Estadística - Padrón', 'https://www.ine.es/', 'information', true, 'Normativa y estadísticas oficiales del padrón');
    END IF;

    -- =========================================================================
    -- 3. PRESTACIÓN POR DESEMPLEO (solicitud-paro)
    -- =========================================================================
    SELECT id INTO id_paro FROM public.procedures WHERE slug = 'solicitud-paro';
    IF id_paro IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Solicitud de prestación por desempleo (SEPE)',
            short_description = 'Solicitud de la prestación contributiva por desempleo tras perder el empleo de forma involuntaria.',
            description = 'La prestación contributiva por desempleo protege la situación de quienes han perdido involuntariamente su empleo habiendo cotizado al menos 360 días en los últimos 6 años. La solicitud es gratuita y debe presentarse obligatoriamente dentro de los 15 días hábiles siguientes al cese laboral, tras haber causado alta como demandante de empleo en el servicio público autonómico.',
            cost = 'Gratuito',
            estimated_duration = 'Resolución en 15 días hábiles desde la solicitud',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Servicio Público de Empleo Estatal (SEPE)',
            source_url = 'https://sede.sepe.gob.es/',
            updated_at = NOW()
        WHERE id = id_paro;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_paro;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_paro, 'Situación legal de desempleo', 'Haber cesado por despido, fin de contrato o causa no voluntaria (las bajas voluntarias no dan derecho a paro).', 1),
            (id_paro, 'Cotización mínima de 360 días', 'Tener cotizados al menos 360 días por desempleo en los 6 años anteriores a la pérdida del empleo.', 2),
            (id_paro, 'Inscrito como demandante de empleo', 'Estar inscrito en el servicio autonómico de empleo y suscribir el compromiso de actividad.', 3),
            (id_paro, 'Plazo de 15 días hábiles', 'Presentar la solicitud dentro de los 15 días hábiles posteriores a la finalización del trabajo o vacaciones no disfrutadas.', 4);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_paro;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_paro, 'DNI o NIE en vigor', 'Documento de identidad del solicitante y familiares a su cargo.', true, 1),
            (id_paro, 'Certificado de empresa', 'Enviado telemáticamente por la empresa al SEPE (verificar en Sede que consta recibido).', true, 2),
            (id_paro, 'Tarjeta de demanda de empleo (DARDE)', 'Justificante de alta como demandante de empleo expedido por la Comunidad Autónoma.', true, 3),
            (id_paro, 'Cuenta bancaria (IBAN)', 'Certificado o justificante bancario donde el solicitante figure como titular para recibir el abono mensual.', true, 4);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_paro;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_paro, 'Inscribirse como demandante de empleo', 'Darse de alta en el servicio autonómico de empleo de tu comunidad y obtener la tarjeta DARDE.', 1, true),
            (id_paro, 'Pedir cita previa o acceder con Cl@ve', 'Solicitar cita en la Sede Electrónica del SEPE o tramitar online con certificado digital / Cl@ve.', 2, true),
            (id_paro, 'Cumplimentar y enviar la solicitud', 'Revisar datos de cotización, hijos a cargo e introducir cuenta bancaria antes de enviar la solicitud.', 3, true),
            (id_paro, 'Recepción de la resolución', 'El SEPE resolverá la cuantía y duración asignada, abonando la prestación los días 10 de cada mes.', 4, false);

        DELETE FROM public.procedure_links WHERE procedure_id = id_paro;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_paro, 'Sede Electrónica del SEPE', 'https://sede.sepe.gob.es/', 'official', true, 'Trámites telemáticos de prestaciones por desempleo'),
            (id_paro, 'Cita Previa SEPE', 'https://sede.sepe.gob.es/citaprevia/', 'appointment', true, 'Reserva de cita previa en oficinas del SEPE');
    END IF;

    -- =========================================================================
    -- 4. ALTA EN LA SEGURIDAD SOCIAL (alta-seguridad-social)
    -- =========================================================================
    SELECT id INTO id_seg_social FROM public.procedures WHERE slug = 'alta-seguridad-social';
    IF id_seg_social IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Alta y asignación del Número de la Seguridad Social (NUSS)',
            short_description = 'Obtención del Número de la Seguridad Social obligatorio para trabajar o cotizar en España.',
            description = 'El Número de la Seguridad Social (NUSS) identifica al ciudadano en sus relaciones con la Seguridad Social. Es obligatorio para iniciar cualquier actividad laboral por cuenta ajena o propia, o para recibir prestaciones. Es único y válido para toda la vida. Se obtiene de manera inmediata y gratuita por internet a través de Import@ss.',
            cost = 'Gratuito',
            estimated_duration = 'Inmediato online a través del portal Import@ss',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Tesorería General de la Seguridad Social (TGSS)',
            source_url = 'https://portal.seguridad-social.gob.es/',
            updated_at = NOW()
        WHERE id = id_seg_social;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_seg_social;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_seg_social, 'Identificación legal', 'Disponer de DNI (españoles) o NIE y Pasaporte en vigor (extranjeros).', 1),
            (id_seg_social, 'No disponer de NUSS previo', 'El NUSS es vitalicio; si ya tuviste contrato o prácticas no debes solicitar uno nuevo.', 2);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_seg_social;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_seg_social, 'DNI o NIE en vigor', 'Documento oficial de identificación con fotografía.', true, 1),
            (id_seg_social, 'Teléfono móvil registrado', 'Para verificación mediante código SMS de un solo uso.', true, 2);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_seg_social;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_seg_social, 'Acceder a Import@ss', 'Entrar en el portal Import@ss de la Tesorería General de la Seguridad Social con Cl@ve, Certificado o SMS.', 1, true),
            (id_seg_social, 'Solicitar el número NUSS', 'Verificar datos personales y confirmar la solicitud telemática.', 2, true),
            (id_seg_social, 'Descargar resolución', 'Descargar de forma inmediata el documento oficial en PDF con el número asignado.', 3, false);

        DELETE FROM public.procedure_links WHERE procedure_id = id_seg_social;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_seg_social, 'Portal Import@ss de la Seguridad Social', 'https://portal.seguridad-social.gob.es/', 'official', true, 'Portal oficial de la TGSS para ciudadanos');
    END IF;

    -- =========================================================================
    -- 5. DECLARACIÓN DE LA RENTA (declaracion-renta)
    -- =========================================================================
    SELECT id INTO id_renta FROM public.procedures WHERE slug = 'declaracion-renta';
    IF id_renta IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Declaración de la Renta (IRPF - Campaña anual)',
            short_description = 'Presentación anual del Impuesto sobre la Renta de las Personas Físicas ante la Agencia Tributaria.',
            description = 'La Campaña de la Renta (IRPF) permite regularizar el impuesto anual sobre los ingresos percibidos por trabajo, capital y actividades económicas. Se realiza entre los meses de abril y junio/julio de cada ejercicio a través del servicio Renta WEB de la Agencia Tributaria. El trámite es completamente gratuito.',
            cost = 'Gratuito',
            estimated_duration = 'Tramitación inmediata online; devoluciones en un plazo de entre 1 semana y 6 meses',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Agencia Estatal de Administración Tributaria (AEAT)',
            source_url = 'https://sede.agenciatributaria.gob.es/',
            updated_at = NOW()
        WHERE id = id_renta;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_renta;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_renta, 'Superar los límites legales de ingresos', 'Superar 22.000 € anuales con un solo pagador, o 15.000 € con dos o más pagadores (si el segundo supera 1.500 €).', 1),
            (id_renta, 'Identificación digital', 'Contar con certificado electrónico, DNIe, Cl@ve Móvil/PIN o número de referencia (casilla 505 del año anterior).', 2);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_renta;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_renta, 'Datos fiscales oficiales', 'Borrador y datos fiscales facilitados por la AEAT.', true, 1),
            (id_renta, 'Justificantes de deducciones', 'Recibos de alquiler de vivienda habitual, donaciones, planes de pensiones o cuotas sindicales.', false, 2),
            (id_renta, 'Número de cuenta IBAN', 'Para la devolución o domiciliación del pago fraccionado.', true, 3);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_renta;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_renta, 'Acceder a Renta WEB', 'Entrar en el portal de la Agencia Tributaria e identificarse con Cl@ve o número de referencia.', 1, true),
            (id_renta, 'Revisar el borrador y datos fiscales', 'Comprobar ingresos del trabajo, circunstancias familiares y deducciones autonómicas.', 2, true),
            (id_renta, 'Presentar la declaración', 'Confirmar el borrador y descargar el justificante de presentación con código seguro de verificación.', 3, true);

        DELETE FROM public.procedure_links WHERE procedure_id = id_renta;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_renta, 'Campaña de Renta - Agencia Tributaria', 'https://sede.agenciatributaria.gob.es/Sede/Renta.html', 'official', true, 'Portal oficial de Renta WEB de la AEAT');
    END IF;

    -- =========================================================================
    -- 6. SOLICITUD DE BECA (solicitud-beca)
    -- =========================================================================
    SELECT id INTO id_beca FROM public.procedures WHERE slug = 'solicitud-beca';
    IF id_beca IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Solicitud de Beca General del Ministerio de Educación (MEC)',
            short_description = 'Ayudas y becas para estudiantes de niveles postobligatorios (Bachillerato, FP, Universidad y Máster).',
            description = 'Convocatoria anual de becas de carácter general del Ministerio de Educación, Formación Profesional y Deportes para estudiantes que cursan enseñanzas postobligatorias oficiales. Cubre cuantías fijas vinculadas a renta, residencia, excelencia académica y matrícula. El trámite es 100% gratuito y se realiza en la Sede Electrónica del Ministerio.',
            cost = 'Gratuito',
            estimated_duration = 'Resolución en 3-5 meses (resolución económica provisional y académica definitiva)',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Ministerio de Educación, Formación Profesional y Deportes',
            source_url = 'https://www.becaseducacion.gob.es/',
            updated_at = NOW()
        WHERE id = id_beca;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_beca;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_beca, 'Requisitos generales y de nacionalidad', 'Ser español o ciudadano de la UE con residencia legal continuada en España.', 1),
            (id_beca, 'Matriculación en estudios oficiales', 'Cursar Bachillerato, FP Grado Medio o Superior, Grado Universitario o Máster Oficial.', 2),
            (id_beca, 'Requisitos económicos de renta', 'No superar los umbrales de patrimonio y renta familiar fijados anualmente en el BOE.', 3),
            (id_beca, 'Requisitos académicos', 'Superar la nota media y porcentaje de créditos mínimos aprobados en el curso precedente.', 4);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_beca;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_beca, 'DNI o NIE de la unidad familiar', 'Datos de identificación de todos los convivientes mayores de 14 años.', true, 1),
            (id_beca, 'Cuenta bancaria con el estudiante de titular', 'IBAN de cuenta española donde el solicitante debe ser titular o cotitular.', true, 2);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_beca;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_beca, 'Entrar en la Sede Electrónica del Ministerio', 'Acceder dentro del plazo de apertura (habitualmente entre marzo y mayo) con Cl@ve o registro.', 1, true),
            (id_beca, 'Rellenar la solicitud telemática', 'Indicar datos de los convivientes, domicilio durante el curso y datos bancarios.', 2, true),
            (id_beca, 'Firmar y registrar la solicitud', 'Enviar telemáticamente y guardar el justificante oficial con registro de entrada.', 3, false);

        DELETE FROM public.procedure_links WHERE procedure_id = id_beca;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_beca, 'Portal de Becas de Educación', 'https://www.becaseducacion.gob.es/', 'official', true, 'Portal oficial con guías, plazos y acceso a la Sede');
    END IF;

    -- =========================================================================
    -- 7. MATRIMONIO CIVIL (matrimonio-civil)
    -- =========================================================================
    SELECT id INTO id_matrimonio FROM public.procedures WHERE slug = 'matrimonio-civil';
    IF id_matrimonio IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Celebración de matrimonio civil',
            short_description = 'Tramitación del expediente previo y celebración del matrimonio civil en Registro Civil, Ayuntamiento o Notaría.',
            description = 'El matrimonio civil une legalmente a dos personas con capacidad matrimonial. Requiere la tramitación obligatoria de un expediente o acta previa que acredite la capacidad y ausencia de impedimentos legales. El trámite en el Registro Civil es completamente gratuito; en Ayuntamientos puede aplicarse tasa municipal y ante Notario rige arancel regulado.',
            cost = 'Gratuito en el Registro Civil. En Ayuntamientos puede requerir tasa municipal (30 € - 300 € según ordenanza). En Notaría arancel notarial regulado (150 € - 250 €).',
            estimated_duration = 'Expediente previo: 1 a 4 meses según carga de trabajo del organismo',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Ministerio de la Presidencia, Justicia y Relaciones con las Cortes / Notariado',
            source_url = 'https://sede.mjusticia.gob.es/',
            updated_at = NOW()
        WHERE id = id_matrimonio;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_matrimonio;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_matrimonio, 'Mayoría de edad o emancipación', 'Tener 18 años cumplidos o estar legalmente emancipado.', 1),
            (id_matrimonio, 'Ausencia de impedimentos', 'No estar casado previamente y no tener parentesco en línea recta ni colateral hasta tercer grado.', 2),
            (id_matrimonio, 'Empadronamiento en el partido judicial', 'Al menos uno de los dos cónyuges debe estar empadronado en el partido judicial donde se tramita el expediente.', 3);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_matrimonio;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_matrimonio, 'DNI, NIE o Pasaporte', 'Documento de identidad original en vigor de ambos contrayentes.', true, 1),
            (id_matrimonio, 'Certificado literal de nacimiento', 'Expedido por el Registro Civil con menos de 6 meses de antigüedad.', true, 2),
            (id_matrimonio, 'Certificado de empadronamiento histórico', 'Acreditativo de los dos últimos años de residencia, expedido en los últimos 3 meses.', true, 3),
            (id_matrimonio, 'Sentencia de divorcio o defunción anterior', 'Solo si alguno de los contrayentes estuvo casado con anterioridad.', false, 4);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_matrimonio;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_matrimonio, 'Apertura del expediente matrimonial', 'Iniciar el expediente en el Registro Civil del domicilio o ante Notaría de libre elección.', 1, true),
            (id_matrimonio, 'Audiencia reservada con testigos', 'Comparecer ambos contrayentes junto con dos testigos mayores de edad para ratificar el consentimiento.', 2, true),
            (id_matrimonio, 'Celebración de la boda y firma del acta', 'Celebrar el matrimonio ante el Juez, Alcalde, Concejal o Notario y recibir el Libro de Familia o certificación registral.', 3, false);

        DELETE FROM public.procedure_links WHERE procedure_id = id_matrimonio;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_matrimonio, 'Sede Judicial Electrónica', 'https://sede.mjusticia.gob.es/', 'official', true, 'Trámites de Registro Civil del Ministerio de Justicia');
    END IF;

    -- =========================================================================
    -- 8. PERMISO DE CONDUCIR (permiso-conducir)
    -- =========================================================================
    SELECT id INTO id_conducir FROM public.procedures WHERE slug = 'permiso-conducir';
    IF id_conducir IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Obtención del permiso de conducir de la clase B (DGT)',
            short_description = 'Obtención de la autorización administrativa para conducir turismos en España (permiso B).',
            description = 'El permiso de conducir de la clase B habilita para conducir turismos y vehículos de hasta 3.500 kg. Para obtenerlo es obligatorio superar una prueba psicofísica en un centro médico autorizado, un examen teórico de 30 preguntas y una prueba práctica de circulación en vías abiertas al tráfico.',
            cost = '94,05 € (tasa oficial DGT 4.1 para pruebas de aptitud, válida para dos convocatorias). Gastos externos: informe médico (~30-60 €) y autoescuela.',
            estimated_duration = '2 a 6 meses según preparación y convocatorias de examen',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Dirección General de Tráfico (DGT) - Ministerio del Interior',
            source_url = 'https://sede.dgt.gob.es/',
            updated_at = NOW()
        WHERE id = id_conducir;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_conducir;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_conducir, 'Edad mínima', 'Tener 18 años cumplidos (es posible presentarse al examen teórico 3 meses antes).', 1),
            (id_conducir, 'Residencia legal en España', 'Residir legalmente en territorio español.', 2),
            (id_conducir, 'Aptitud psicofísica', 'Superar el reconocimiento médico en un Centro de Reconocimiento de Conductores autorizado.', 3),
            (id_conducir, 'Superación de exámenes', 'Aprobar el examen teórico general y la prueba práctica de circulación en vías públicas.', 4);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_conducir;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_conducir, 'DNI o NIE en vigor', 'Documento oficial acreditativo de identidad.', true, 1),
            (id_conducir, 'Informe médico psicofísico', 'Emitido telemáticamente por centro médico autorizado con fotografía digital.', true, 2),
            (id_conducir, 'Tasa DGT 4.1 pagada (94,05 €)', 'Justificante de abono de la tasa de examen que otorga derecho a dos convocatorias.', true, 3);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_conducir;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_conducir, 'Realizar reconocimiento médico', 'Obtener el informe psicotécnico en un centro médico de conductores autorizado.', 1, true),
            (id_conducir, 'Superar el examen teórico', 'Aprobar el test teórico de 30 preguntas de la DGT (máximo 3 errores permitidos).', 2, true),
            (id_conducir, 'Superar el examen práctico', 'Realizar y superar la prueba de conducción en vías abiertas con examinador de la DGT.', 3, true),
            (id_conducir, 'Permiso provisional y carnet definitivo', 'Descargar el permiso provisional en la app miDGT hasta recibir el carnet físico por correo.', 4, false);

        DELETE FROM public.procedure_links WHERE procedure_id = id_conducir;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_conducir, 'Sede Electrónica de la DGT', 'https://sede.dgt.gob.es/', 'official', true, 'Portal oficial de la Dirección General de Tráfico'),
            (id_conducir, 'Cita Previa DGT', 'https://sedeclave.dgt.gob.es/WEB_NCIT_CONSULTA/solicitarCita.faces', 'appointment', true, 'Cita previa en Jefaturas Provinciales de Tráfico');
    END IF;

    -- =========================================================================
    -- 9. SOLICITUD DE NIE (solicitud-nie)
    -- =========================================================================
    SELECT id INTO id_nie FROM public.procedures WHERE slug = 'solicitud-nie';
    IF id_nie IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Solicitud de NIE para extranjeros (Número de Identidad de Extranjero)',
            short_description = 'Asignación del Número de Identidad de Extranjero para personas no comunitarias o comunitarias con intereses en España.',
            description = 'El NIE (Número de Identidad de Extranjero) es un código único, personal y exclusivo que se asigna a los extranjeros con intereses económicos, profesionales o sociales en España. No acredita residencia legal por sí mismo, sino identificación ante la administración tributaria y laboral. La tasa oficial es de 9,84 € (modelo 790 código 012).',
            cost = '9,84 € (tasa modelo 790 código 012 para asignación de NIE a instancia del interesado) o 10,71 € para certificados.',
            estimated_duration = 'En el acto o 5 a 15 días hábiles según la oficina de extranjería o consulado',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Dirección General de la Policía / Ministerio de Política Territorial',
            source_url = 'https://sede.administracionespublicas.gob.es/',
            updated_at = NOW()
        WHERE id = id_nie;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_nie;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_nie, 'No estar en situación irregular', 'No hallarse en situación de estancia irregular en territorio español.', 1),
            (id_nie, 'Motivos justificados', 'Acreditar documentalmente causas económicas, profesionales o sociales (compra de vivienda, herencia, contrato, cuenta bancaria).', 2),
            (id_nie, 'Cita previa obligatoria', 'Obtener cita presencial en la Comisaría de Policía u Oficina de Extranjería correspondiente.', 3);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_nie;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_nie, 'Formulario oficial EX-15', 'Cumplimentado y firmado por duplicado indicando los motivos de la solicitud.', true, 1),
            (id_nie, 'Pasaporte o documento de identidad en vigor', 'Original y copia completa del pasaporte o tarjeta de identidad de su país.', true, 2),
            (id_nie, 'Tasa modelo 790 código 012 pagada (9,84 €)', 'Resguardo bancario que acredita el abono de la tasa oficial.', true, 3),
            (id_nie, 'Documentación justificativa de los motivos', 'Contrato de arras, aceptación de herencia, precontrato laboral u oferta bancaria.', true, 4);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_nie;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_nie, 'Pedir cita previa de extranjería', 'Solicitar cita previa en la sede electrónica seleccionando provincia y trámite "Policía - Asignación de NIE".', 1, true),
            (id_nie, 'Cumplimentar formulario EX-15 y pagar tasa', 'Liquidar la tasa de 9,84 € en cualquier banco antes de acudir a la cita.', 2, true),
            (id_nie, 'Comparecer en Comisaría de Extranjería', 'Entregar documentación original y copias en ventanilla el día asignado.', 3, true),
            (id_nie, 'Recoger certificado de NIE', 'Recibir el documento oficial en formato folio blanco con el número asignado.', 4, false);

        DELETE FROM public.procedure_links WHERE procedure_id = id_nie;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_nie, 'Cita Previa Extranjería', 'https://sede.administracionespublicas.gob.es/icpplus/index.html', 'appointment', true, 'Sistema de reserva de cita en oficinas de extranjería'),
            (id_nie, 'Portal de Inmigración de España', 'https://inclusion.seg-social.gob.es/emigracion-inmigracion', 'information', true, 'Guía oficial de trámites y modelos de extranjería');
    END IF;

    -- =========================================================================
    -- 10. AYUDA AL ALQUILER (ayuda-alquiler)
    -- =========================================================================
    SELECT id INTO id_alquiler FROM public.procedures WHERE slug = 'ayuda-alquiler';
    IF id_alquiler IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Solicitud del Bono Alquiler Joven y Ayudas al Alquiler de Vivienda',
            short_description = 'Subvenciones públicas para facilitar el acceso a la vivienda en régimen de alquiler para jóvenes y familias.',
            description = 'Ayudas autonómicas financiadas por el Plan Estatal de Vivienda y el Bono Alquiler Joven (hasta 250 € al mes para menores de 35 años). Subvenciona el pago del alquiler habitual en función del nivel de ingresos y el coste mensual de la vivienda o habitación.',
            cost = 'Gratuito',
            estimated_duration = 'Resolución en 3 a 6 meses según la convocatoria de la Comunidad Autónoma',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Ministerio de Vivienda y Agenda Urbana / Comunidades Autónomas',
            source_url = 'https://www.mivau.gob.es/',
            updated_at = NOW()
        WHERE id = id_alquiler;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_alquiler;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_alquiler, 'Edad y residencia legal', 'Tener entre 18 y 35 años para el Bono Joven o cumplir requisitos de vulnerabilidad en la ayuda general.', 1),
            (id_alquiler, 'Contrato de alquiler en vigor', 'Ser titular de un contrato de arrendamiento formalizado conforme a la LAU.', 2),
            (id_alquiler, 'Límites de renta de la vivienda e ingresos', 'Renta mensual de alquiler por debajo del límite autonómico (600 € - 900 €) e ingresos familiares regulares inferiores a 3 veces el IPREM.', 3);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_alquiler;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_alquiler, 'DNI o NIE de los convivientes', 'Identificación de todos los miembros residentes en la vivienda.', true, 1),
            (id_alquiler, 'Contrato de alquiler', 'Contrato completo firmado y con el depósito de fianza depositado en el organismo autonómico.', true, 2),
            (id_alquiler, 'Certificado de empadronamiento colectivo', 'Que demuestre la residencia habitual en la vivienda objeto de la ayuda.', true, 3),
            (id_alquiler, 'Recibos bancarios del alquiler pagado', 'Comprobantes bancarios de las transferencias del pago del alquiler.', true, 4);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_alquiler;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_alquiler, 'Consultar convocatoria autonómica abierta', 'Verificar plazos de apertura en la web de Vivienda de tu Comunidad Autónoma.', 1, true),
            (id_alquiler, 'Presentar solicitud telemática', 'Acceder a la sede electrónica con certificado digital o Cl@ve adjuntando contrato y empadronamiento.', 2, true),
            (id_alquiler, 'Aportar justificantes periódicos', 'Subir los recibos bancarios mensuales para el abono de la subvención concedida.', 3, false);

        DELETE FROM public.procedure_links WHERE procedure_id = id_alquiler;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_alquiler, 'Ministerio de Vivienda y Agenda Urbana', 'https://www.mivau.gob.es/', 'official', true, 'Planes estatales y directrices del Bono Alquiler Joven');
    END IF;

    -- =========================================================================
    -- 11. ALTA COMO AUTÓNOMO (alta-autonomo)
    -- =========================================================================
    SELECT id INTO id_autonomo FROM public.procedures WHERE slug = 'alta-autonomo';
    IF id_autonomo IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Alta como trabajador autónomo en Hacienda (036/037) y RETA',
            short_description = 'Inicio de actividad por cuenta propia: alta censal en la Agencia Tributaria y afiliación en el RETA.',
            description = 'El alta como trabajador autónomo comprende dos trámites simultáneos obligatorios: la declaración censal en Hacienda (modelo 036 o 037) seleccionando el epígrafe IAE y el alta en el Régimen Especial de Trabajadores Autónomos (RETA) de la Seguridad Social. Los nuevos autónomos pueden acogerse a la Tarifa Plana reducida de 80 €/mes durante el primer año.',
            cost = 'Gratuito el trámite administrativo de alta. El trabajador abona la cuota mensual del RETA (Tarifa Plana de 80 €/mes el primer año para nuevos autónomos; posteriormente por tramos de rendimientos netos).',
            estimated_duration = 'Inmediato online; obligatorio tramitar antes o el mismo día del inicio de actividad',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Agencia Tributaria (AEAT) y Tesorería General de la Seguridad Social (TGSS)',
            source_url = 'https://portal.seguridad-social.gob.es/',
            updated_at = NOW()
        WHERE id = id_autonomo;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_autonomo;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_autonomo, 'Mayoría de edad y permiso de trabajo', 'Tener al menos 18 años y permiso para trabajar por cuenta propia en España.', 1),
            (id_autonomo, 'Doble alta obligatoria', 'Darse de alta en el censo tributario (Hacienda) y en la Seguridad Social (RETA) antes o en el mismo día del inicio.', 2),
            (id_autonomo, 'Certificado digital o Cl@ve', 'Imprescindible para la realización de declaraciones trimestrales y notificaciones telemáticas obligatorias.', 3);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_autonomo;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_autonomo, 'DNI o NIE en vigor', 'Identificación oficial del titular de la actividad.', true, 1),
            (id_autonomo, 'Número de la Seguridad Social (NUSS)', 'Número de afiliación del trabajador.', true, 2),
            (id_autonomo, 'Cuenta bancaria (IBAN)', 'Para domiciliar las cuotas mensuales a la Seguridad Social.', true, 3);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_autonomo;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_autonomo, 'Alta censal en la Agencia Tributaria', 'Presentar telemáticamente el modelo 036 o 037 eligiendo el epígrafe del IAE y régimen de IVA e IRPF.', 1, true),
            (id_autonomo, 'Alta en el RETA de la Seguridad Social', 'Entrar en Import@ss dentro de los plazos reglamentarios y seleccionar Mutua y base de cotización.', 2, true),
            (id_autonomo, 'Solicitar Tarifa Plana bonificada', 'Marcar la opción de tarifa plana bonificada de 80 €/mes si no has sido autónomo en los últimos dos años.', 3, false);

        DELETE FROM public.procedure_links WHERE procedure_id = id_autonomo;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_autonomo, 'Alta RETA en Import@ss', 'https://portal.seguridad-social.gob.es/', 'official', true, 'Portal de la Seguridad Social para autónomos'),
            (id_autonomo, 'Modelos Censales AEAT', 'https://sede.agenciatributaria.gob.es/', 'official', true, 'Trámite de modelos 036 y 037 en la Agencia Tributaria');
    END IF;

    -- =========================================================================
    -- 12. CERTIFICADO DE NACIMIENTO (certificado-nacimiento)
    -- =========================================================================
    SELECT id INTO id_nacimiento FROM public.procedures WHERE slug = 'certificado-nacimiento';
    IF id_nacimiento IS NOT NULL THEN
        UPDATE public.procedures SET
            title = 'Certificado de nacimiento (Registro Civil)',
            short_description = 'Documento oficial que da fe del hecho del nacimiento, fecha, hora, lugar, sexo y filiación del inscrito.',
            description = 'El certificado de nacimiento es el documento oficial expedido por el Registro Civil que acredita el nacimiento de una persona y sus datos de filiación. Es imprescindible para obtener el primer DNI, pasaporte, contraer matrimonio o tramitar herencias. Su expedición por el Registro Civil es totalmente gratuita.',
            cost = 'Gratuito',
            estimated_duration = 'Inmediato (descarga electrónica con Cl@ve/DNIe si el tomo está digitalizado) o 3-10 días hábiles por correo postal',
            is_published = true,
            verification_status = 'verified',
            verified_by = admin_uuid,
            last_verified_at = NOW(),
            source = 'Ministerio de la Presidencia, Justicia y Relaciones con las Cortes / Registro Civil',
            source_url = 'https://sede.mjusticia.gob.es/',
            updated_at = NOW()
        WHERE id = id_nacimiento;

        DELETE FROM public.procedure_requirements WHERE procedure_id = id_nacimiento;
        INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
            (id_nacimiento, 'Estar inscrito en un Registro Civil español', 'Haber nacido en España o estar inscrito en el Registro Civil Consular de España en el extranjero.', 1),
            (id_nacimiento, 'Interés legítimo', 'El titular o persona legalmente apoderada/legitimada.', 2);

        DELETE FROM public.procedure_documents WHERE procedure_id = id_nacimiento;
        INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
            (id_nacimiento, 'DNI, NIE o pasaporte', 'Documento de identidad del solicitante.', true, 1),
            (id_nacimiento, 'Datos de la inscripción de nacimiento', 'Municipio del Registro Civil, fecha de nacimiento, tomo y página registral si se conocen.', true, 2);

        DELETE FROM public.procedure_steps WHERE procedure_id = id_nacimiento;
        INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
            (id_nacimiento, 'Acceder a la Sede Judicial Electrónica', 'Entrar en el portal del Ministerio de Justicia en el trámite "Certificado de Nacimiento".', 1, true),
            (id_nacimiento, 'Seleccionar tipo de certificado', 'Indicar certificado literal (si es para primer DNI debe marcarse la casilla específica).', 2, true),
            (id_nacimiento, 'Descargar el certificado con CSV', 'Descarga inmediata del documento electrónico con Código Seguro de Verificación oficial.', 3, false);

        DELETE FROM public.procedure_links WHERE procedure_id = id_nacimiento;
        INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
            (id_nacimiento, 'Sede Judicial Electrónica - Certificados', 'https://sede.mjusticia.gob.es/es/tramites/certificado-nacimiento', 'official', true, 'Portal oficial del Ministerio de Justicia para solicitar certificados de nacimiento');
    END IF;
END $$;
