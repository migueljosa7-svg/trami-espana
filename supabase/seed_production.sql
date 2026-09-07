-- ===========================================
-- TRAMI ESPAÑA - Seed de Producción
-- Primer trámite oficial real y verificado
-- ===========================================
-- Fuente oficial primaria: https://sede.policia.gob.es/ (Policía Nacional)
-- Fuente oficial secundaria: https://www.policia.es/dni.htm
-- Cita previa oficial DNI: https://www.citapreviadnie.es/
-- Categoría: Identidad y Nacionalidad
-- Ámbito: Estatal
--
-- ANTES DE EJECUTAR:
-- 1. UUID del administrador verificador: f327b75a-b43a-4be1-a636-68f7c102f682 (ya configurado — migueljosa7@gmail.com).
-- 2. Asegúrate de que la categoría 'identidad' existe (proviene de migration 0000).
-- 3. Confirma manualmente que la fuente oficial responde y los datos son vigentes.
--
-- Este archivo NO es una migración. Se ejecuta una sola vez desde Supabase Dashboard → SQL Editor.
-- Estrategia: bloque DO $$ DECLARE para mantener el UUID recién creado y relacionar tablas hijas.
-- ===========================================

DO $$
DECLARE
    proc_dni_id UUID;
BEGIN
    -- ===========================================
    -- Procedimiento oficial: Renovación del DNI
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
        verified_by,
        cost,
        estimated_duration,
        created_at,
        updated_at
    ) VALUES (
        'Renovación del Documento Nacional de Identidad (DNI)',
        'renovacion-dni',
        'Guía oficial para renovar tu DNI cuando caduca, lo has perdido o te lo han robado.',
        'El Documento Nacional de Identidad (DNI) es el documento personal que acredita la identidad de los españoles. Debes renovarlo cuando caduque, lo hayas perdido o sufrido robo. El trámite se gestiona a través de la Policía Nacional: solicita cita previa en su sede electrónica, paga la tasa correspondiente (modelo 790) y acude a la oficina con la documentación requerida. Una vez tramitado, el nuevo DNI se envía al domicilio por correo certificado en 15-20 días hábiles.',
        (SELECT id FROM public.procedure_categories WHERE slug = 'identidad'),
        'estatal',
        true,
        'verified',
        'Policía Nacional',
        'https://sede.policia.gob.es/',
        NOW(),
        'f327b75a-b43a-4be1-a636-68f7c102f682', -- admin: migueljosa7@gmail.com (UUID verificado en prod)
        '12 € (tasa modelo 790 código 012). Gratuito por cambio de domicilio (con DNI en vigor) o familia numerosa.',
        'En el acto (cita presencial en oficina de expedición)',
        NOW(),
        NOW()
    ) RETURNING id INTO proc_dni_id;

    -- ===========================================
    -- Requisitos
    -- ===========================================
    INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
        (proc_dni_id, 'Ser mayor de 14 años', 'Obligatorio para renovación u obtención por primera vez', 1),
        (proc_dni_id, 'Residir en España', 'Empadronamiento en cualquier municipio español', 2),
        (proc_dni_id, 'DNI anterior caducado o próximo a caducar', 'Caducidad en los últimos 180 días, o pérdida/robo', 3),
        (proc_dni_id, 'Fotografía reciente', '32x40mm, fondo blanco, color, reciente y con rostro despejado', 4),
        (proc_dni_id, 'Pago de la tasa oficial de 12 €', 'Tasa de 12 € (modelo 790 código 012). Exención gratuita para familia numerosa o cambio de domicilio con DNI en vigor', 5);

    -- ===========================================
    -- Documentación
    -- ===========================================
    INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
        (proc_dni_id, 'DNI anterior', 'DNI que quieres renovar (o denuncia en caso de pérdida o sustracción)', true, 1),
        (proc_dni_id, 'Fotografía de carnet', '32x40mm, fondo blanco, reciente', true, 2),
        (proc_dni_id, 'Justificante de pago de tasa de 12 €', 'Resguardo del pago de 12 € o acreditación de exención (título de familia numerosa)', true, 3),
        (proc_dni_id, 'Certificado de empadronamiento', 'Obligatorio únicamente si ha cambiado el domicilio respecto al DNI anterior', false, 4);

    -- ===========================================
    -- Pasos
    -- ===========================================
    INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
        (proc_dni_id, 'Solicitar cita previa', 'Pedir cita en la sede electrónica de la Policía Nacional o en https://www.citapreviadnie.es/', 1, true),
        (proc_dni_id, 'Pagar la tasa de 12 € o preparar exención', 'Pago telemático en citapreviadnie.es o en efectivo/tarjeta en la oficina de expedición', 2, true),
        (proc_dni_id, 'Acudir a la oficina', 'Presentar documentación el día y hora de la cita', 3, true),
        (proc_dni_id, 'Expedición y entrega del DNI', 'El nuevo DNI se imprime y entrega en el acto en la propia oficina', 4, false);

    -- ===========================================
    -- Enlaces oficiales
    -- ===========================================
    INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official, description) VALUES
        (proc_dni_id, 'Sede Electrónica Policía Nacional', 'https://sede.policia.gob.es/', 'official', true, 'Cita previa y solicitud'),
        (proc_dni_id, 'Información DNI - Policía Nacional', 'https://www.policia.es/dni.htm', 'information', true, 'Guía completa del trámite'),
        (proc_dni_id, 'Cita previa DNI', 'https://www.citapreviadnie.es/', 'appointment', true, 'Sistema oficial de reserva de cita previa');
END $$;

-- ===========================================
-- Fin de la carga del primer trámite oficial
-- ===========================================


