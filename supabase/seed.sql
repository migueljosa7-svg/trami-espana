-- ===========================================
-- TRAMI ESPAÑA - Datos DEMO
-- ===========================================
-- IMPORTANTE: Estos son datos de EJEMPLO para desarrollo
-- NO son información oficial real
-- Los datos reales deben ser verificados y actualizados desde fuentes oficiales

-- ===========================================
-- LIMPIAR DATOS EXISTENTES (solo para desarrollo)
-- ===========================================
-- DELETE FROM public.procedure_links;
-- DELETE FROM public.procedure_steps;
-- DELETE FROM public.procedure_documents;
-- DELETE FROM public.procedure_requirements;
-- DELETE FROM public.procedures;

-- ===========================================
-- TRÁMITES DEMO
-- ===========================================

-- Ejemplo 1: Renovación DNI
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Renovación del Documento Nacional de Identidad (DNI)',
    'renovacion-dni',
    'Guía de ejemplo para renovar tu DNI cuando caduca o lo has perdido.',
    'El Documento Nacional de Identidad (DNI) es el documento que acredita la identidad de los españoles. Debes renovarlo cuando caduque, lo hayas perdido o te lo hayan robado. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'identidad'),
    'estatal',
    true,
    'draft',
    'Policía Nacional - Ejemplo',
    'https://www.policia.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_dni_id;

-- Requisitos para DNI
INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_dni_id, 'Ser mayor de 14 años', 'Obligatorio para obtener el DNI', 1),
    (@demo_dni_id, 'Residir en España', 'Debes tener residencia en territorio español', 2),
    (@demo_dni_id, 'DNI anterior caducado', 'Debe estar caducado o a punto de caducar (últimos 3 meses)', 3),
    (@demo_dni_id, 'Fotografía reciente', 'Fotografía de carnet 32x40mm con fondo blanco', 4),
    (@demo_dni_id, 'Pagar la tasa', 'Tasa de 23€ (sujeto a cambios)', 5);

-- Documentos para DNI
INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
    (@demo_dni_id, 'DNI anterior', 'El DNI que quieres renovar', true, 1),
    (@demo_dni_id, 'Fotografía', 'Fotografía reciente de carnet', true, 2),
    (@demo_dni_id, 'Justificante de pago', 'Resguardo del pago de la tasa', true, 3),
    (@demo_dni_id, 'Certificado de empadronamiento', 'Opcional pero recomendado', false, 4);

-- Pasos para DNI
INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_dni_id, 'Solicitar cita previa', 'Pide cita previa en la web de la Policía Nacional', 1, true),
    (@demo_dni_id, 'Preparar documentación', 'Reúne todos los documentos necesarios', 2, true),
    (@demo_dni_id, 'Acudir a la oficina', 'Presenta la documentación el día de tu cita', 3, false),
    (@demo_dni_id, 'Recoger el nuevo DNI', 'Recoge tu DNI en 15-20 días hábiles', 4, false);

-- Enlaces para DNI
INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_dni_id, 'Sede Electrónica Policía Nacional', 'https://sede.policia.gob.es/', 'official', true, 'Solicita cita previa'),
    (@demo_dni_id, 'Información DNI', 'https://www.policia.es/dni.htm', 'information', true, 'Información completa sobre DNI');

-- ===========================================
-- Ejemplo 2: Empadronamiento
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Empadronamiento en el municipio',
    'empadronamiento',
    'Cómo empadronarse en un municipio español: requisitos y pasos.',
    'El empadronamiento es el acto por el cual un ciudadano se inscribe en el padrón municipal. Es obligatorio para todos los residentes. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'empadronamiento'),
    'municipal',
    true,
    'draft',
    'Ayuntamiento - Ejemplo',
    'https://www.ine.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_empadronamiento_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_empadronamiento_id, 'Ser mayor de 18 años', 'O estar emancipado', 1),
    (@demo_empadronamiento_id, 'Residir en el municipio', 'Debes vivir en el municipio donde te empadronas', 2);

INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
    (@demo_empadronamiento_id, 'DNI/NIE', 'Documento de identidad', true, 1),
    (@demo_empadronamiento_id, 'Justificante de domicilio', 'Contrato de alquiler o escritura', true, 2),
    (@demo_empadronamiento_id, 'Modelo 076', 'Formulario de alta en el padrón', true, 3);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_empadronamiento_id, 'Obtener formulario', 'Descarga el modelo 076', 1, false),
    (@demo_empadronamiento_id, 'Reunir documentación', 'Prepara todos los documentos', 2, true),
    (@demo_empadronamiento_id, 'Solicitar cita', 'Pide cita en el ayuntamiento', 3, false),
    (@demo_empadronamiento_id, 'Presentar solicitud', 'Acude con toda la documentación', 4, true);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_empadronamiento_id, 'INE - Padrón', 'https://www.ine.es/', 'information', true, 'Información sobre el padrón');

-- ===========================================
-- Ejemplo 3: Solicitud de paro
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Solicitud de prestación por desempleo',
    'solicitud-paro',
    'Cómo solicitar la prestación por desempleo: requisitos y pasos.',
    'La prestación por desempleo es una ayuda económica para trabajadores que han perdido su empleo. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'laboral'),
    'estatal',
    true,
    'draft',
    'SEPE - Ejemplo',
    'https://www.sepe.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_paro_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_paro_id, 'Haber trabajado 360 días', 'En los últimos 6 años', 1),
    (@demo_paro_id, 'Estar inscrito como demandante', 'En el SEPE', 2),
    (@demo_paro_id, 'No tener edad de jubilación', 'No haber alcanzado la edad legal', 3);

INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
    (@demo_paro_id, 'DNI/NIE', 'Documento de identidad', true, 1),
    (@demo_paro_id, 'Certificado de empresa', 'Contrato de trabajo', true, 2),
    (@demo_paro_id, 'Boletines de cotización', 'Últimos boletines', true, 3);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_paro_id, 'Solicitar prestación', 'A través de la sede electrónica del SEPE', 1, true),
    (@demo_paro_id, 'Esperar resolución', 'El SEPE tiene 15 días para resolver', 2, false),
    (@demo_paro_id, 'Cobrar prestación', 'Una vez aprobada, recibe el pago mensual', 3, false);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_paro_id, 'SEPE', 'https://www.sepe.es/', 'official', true, 'Sede electrónica del SEPE');

-- ===========================================
-- Ejemplo 4: Alta en Seguridad Social
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Alta en la Seguridad Social',
    'alta-seguridad-social',
    'Cómo darse de alta en la Seguridad Social como trabajador.',
    'El alta en la Seguridad Social es obligatoria para todos los trabajadores. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'seguridad-social'),
    'estatal',
    true,
    'draft',
    'Seguridad Social - Ejemplo',
    'https://www.seg-social.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_alta_ss_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_alta_ss_id, 'Ser trabajador', 'Por cuenta ajena o propia', 1),
    (@demo_alta_ss_id, 'Tener DNI/NIE', 'Documento de identidad válido', 2);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_alta_ss_id, 'Solicitar alta', 'La empresa debe solicitar tu alta', 1, true),
    (@demo_alta_ss_id, 'Confirmar datos', 'Verifica que tus datos son correctos', 2, false);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_alta_ss_id, 'Seguridad Social', 'https://www.seg-social.es/', 'official', true, 'Sede electrónica');

-- ===========================================
-- Ejemplo 5: Declaración de la Renta
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Declaración de la Renta (IRPF)',
    'declaracion-renta',
    'Cómo presentar la declaración de la renta (IRPF).',
    'La declaración de la renta es un trámite anual para declarar los ingresos del año anterior. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'impuestos'),
    'estatal',
    true,
    'draft',
    'Agencia Tributaria - Ejemplo',
    'https://www.agenciatributaria.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_renta_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_renta_id, 'Tener ingresos en España', 'Debes haber tenido ingresos en el año fiscal', 1),
    (@demo_renta_id, 'DNI/NIE', 'Documento de identidad', 2);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_renta_id, 'Obtener borrador', 'Descarga el borrador de la AEAT', 1, true),
    (@demo_renta_id, 'Completar datos', 'Añade o modifica los datos necesarios', 2, true),
    (@demo_renta_id, 'Presentar declaración', 'Envía la declaración antes del plazo', 3, true);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_renta_id, 'Agencia Tributaria', 'https://www.agenciatributaria.es/', 'official', true, 'Sede electrónica de la AEAT');

-- ===========================================
-- Ejemplo 6: Solicitud de beca
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Solicitud de beca de estudios',
    'solicitud-beca',
    'Cómo solicitar becas de estudios del Ministerio de Educación.',
    'Las becas de estudios ayudan a estudiantes con recursos económicos. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'educacion'),
    'estatal',
    true,
    'draft',
    'Ministerio de Educación - Ejemplo',
    'https://www.educacion.gob.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_beca_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_beca_id, 'Estar matriculado', 'En un centro educativo oficial', 1),
    (@demo_beca_id, 'Cumplir requisitos económicos', 'Según renta familiar', 2);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_beca_id, 'Solicitar beca', 'Rellena el formulario online', 1, true),
    (@demo_beca_id, 'Esperar resolución', 'El ministerio resolverá en 3 meses', 2, false);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_beca_id, 'Ministerio de Educación', 'https://www.educacion.gob.es/', 'official', true, 'Sede del Ministerio');

-- ===========================================
-- Ejemplo 7: Matrimonio civil
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Celebración de matrimonio civil',
    'matrimonio-civil',
    'Cómo celebrar el matrimonio civil en España.',
    'El matrimonio civil es el acto jurídico que une a dos personas. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'familia'),
    'municipal',
    true,
    'draft',
    'Ayuntamiento - Ejemplo',
    'https://www.ine.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_matrimonio_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_matrimonio_id, 'Ser mayor de 18 años', 'O tener consentimiento parental', 1),
    (@demo_matrimonio_id, 'No estar casado', 'Certificado de soltería o divorcio', 2);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_matrimonio_id, 'Solicitar cita', 'En el ayuntamiento correspondiente', 1, true),
    (@demo_matrimonio_id, 'Presentar documentación', 'Lleva todos los documentos requeridos', 2, true),
    (@demo_matrimonio_id, 'Celebración', 'El juez o alcalde celebra el matrimonio', 3, true);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_matrimonio_id, 'INE - Matrimonios', 'https://www.ine.es/', 'information', true, 'Estadísticas de matrimonios');

-- ===========================================
-- Ejemplo 8: Permiso de conducir
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Obtención del permiso de conducir',
    'permiso-conducir',
    'Cómo obtener el permiso de conducir en España.',
    'El permiso de conducir autoriza a circular con vehículos. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'vehiculos'),
    'estatal',
    true,
    'draft',
    'DGT - Ejemplo',
    'https://www.dgt.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_permiso_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_permiso_id, 'Ser mayor de 18 años', 'Para permiso B', 1),
    (@demo_permiso_id, 'Aprobar examen teórico', 'Examen de conocimientos', 2),
    (@demo_permiso_id, 'Aprobar examen práctico', 'Examen de conducción', 3);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_permiso_id, 'Matricularse en autoescuela', 'Curso teórico y práctico', 1, true),
    (@demo_permiso_id, 'Examen teórico', 'Test de conocimientos', 2, true),
    (@demo_permiso_id, 'Examen práctico', 'Prueba de conducción', 3, true),
    (@demo_permiso_id, 'Recoger permiso', 'En la Jefatura de Tráfico', 4, false);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_permiso_id, 'DGT', 'https://www.dgt.es/', 'official', true, 'Dirección General de Tráfico');

-- ===========================================
-- Ejemplo 9: NIE para extranjeros
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Solicitud de NIE para extranjeros',
    'solicitud-nie',
    'Cómo obtener el Número de Identidad de Extranjero.',
    'El NIE es el documento de identificación para extranjeros en España. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'extranjeria'),
    'estatal',
    true,
    'draft',
    'Policía Nacional - Ejemplo',
    'https://www.policia.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_nie_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_nie_id, 'Ser extranjero', 'No tener nacionalidad española', 1),
    (@demo_nie_id, 'Motivo de solicitud', 'Trabajo, estudios, etc.', 2);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_nie_id, 'Solicitar cita previa', 'En la Policía Nacional', 1, true),
    (@demo_nie_id, 'Presentar solicitud', 'Con toda la documentación', 2, true),
    (@demo_nie_id, 'Esperar resolución', 'En 1-3 meses aproximadamente', 3, false);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_nie_id, 'Policía Nacional - Extranjería', 'https://www.policia.es/', 'official', true, 'Información sobre NIE');

-- ===========================================
-- Ejemplo 10: Ayuda alquiler
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Solicitud de ayuda al alquiler',
    'ayuda-alquiler',
    'Cómo solicitar ayudas al alquiler de vivienda.',
    'Las ayudas al alquiler facilitan el acceso a vivienda. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'vivienda'),
    'autonómico',
    true,
    'draft',
    'Comunidad Autónoma - Ejemplo',
    'https://www.vivienda.gob.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_alquiler_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_alquiler_id, 'Tener contrato de alquiler', 'Contrato registrado', 1),
    (@demo_alquiler_id, 'Cumplir requisitos económicos', 'Según ingresos familiares', 2);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_alquiler_id, 'Solicitar ayuda', 'Rellena el formulario de la comunidad', 1, true),
    (@demo_alquiler_id, 'Esperar resolución', 'En 2-3 meses', 2, false);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_alquiler_id, 'Ministerio de Vivienda', 'https://www.vivienda.gob.es/', 'information', true, 'Información sobre ayudas');

-- ===========================================
-- Ejemplo 11: Alta como autónomo
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Alta como trabajador autónomo',
    'alta-autonomo',
    'Cómo darse de alta como trabajador autónomo en España.',
    'El alta como autónomo permite trabajar por cuenta propia. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'empresas'),
    'estatal',
    true,
    'draft',
    'Seguridad Social - Ejemplo',
    'https://www.seg-social.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_autonomo_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_autonomo_id, 'Ser mayor de 18 años', 'O estar emancipado', 1),
    (@demo_autonomo_id, 'DNI/NIE', 'Documento de identidad', 2);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_autonomo_id, 'Darse de alta en Seguridad Social', 'Como trabajador autónomo', 1, true),
    (@demo_autonomo_id, 'Darse de alta en Hacienda', 'Para el IRPF', 2, true),
    (@demo_autonomo_id, 'Inscribirse en el Censo', 'En el Censo de Empresarios', 3, false);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_autonomo_id, 'Seguridad Social - Autónomos', 'https://www.seg-social.es/', 'official', true, 'Información para autónomos');

-- ===========================================
-- Ejemplo 12: Certificado de nacimiento
-- ===========================================
INSERT INTO public.procedures (
    title,
    slug,
    short_description,
    description,
    category_id,
    scope,
    is_published,
    verification_status,
    source,
    source_url,
    last_verified_at,
    created_at,
    updated_at
) VALUES (
    '[DEMO] Certificado de nacimiento',
    'certificado-nacimiento',
    'Cómo solicitar el certificado de nacimiento.',
    'El certificado de nacimiento acredita el nacimiento de una persona. Este es un ejemplo de trámite para desarrollo.',
    (SELECT id FROM public.procedure_categories WHERE slug = 'identidad'),
    'municipal',
    true,
    'draft',
    'Registro Civil - Ejemplo',
    'https://www.ine.es/',
    NOW(),
    NOW(),
    NOW()
) RETURNING id INTO @demo_nacimiento_id;

INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
    (@demo_nacimiento_id, 'DNI del solicitante', 'Documento de identidad', 1),
    (@demo_nacimiento_id, 'Datos del nacimiento', 'Nombre, fecha y lugar de nacimiento', 2);

INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
    (@demo_nacimiento_id, 'Solicitar certificado', 'En el Registro Civil o por internet', 1, true),
    (@demo_nacimiento_id, 'Recoger certificado', 'Presencialmente o por correo', 2, false);

INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
    (@demo_nacimiento_id, 'INE', 'https://www.ine.es/', 'information', true, 'Información sobre certificados');

-- ===========================================
-- NOTA IMPORTANTE
-- ===========================================
-- Todos estos trámites están marcados con [DEMO] en el título
-- y tienen verification_status = 'draft'
-- 
-- Esto indica que son datos de EJEMPLO para desarrollo
-- NO son información oficial real
-- 
-- Para producción:
-- 1. Verificar toda la información en fuentes oficiales
-- 2. Cambiar verification_status a 'verified'
-- 3. Actualizar last_verified_at con la fecha real de verificación
-- 4. Eliminar [DEMO] del título
-- ===========================================