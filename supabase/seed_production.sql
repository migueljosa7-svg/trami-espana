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
        '23 € (tasa modelo 790 código 012)',
        '15-20 días hábiles',
        NOW(),
        NOW()
    ) RETURNING id INTO proc_dni_id;

    -- ===========================================
    -- Requisitos
    -- ===========================================
    INSERT INTO public.procedure_requirements (procedure_id, title, description, order_index) VALUES
        (proc_dni_id, 'Ser mayor de 14 años', 'Obligatorio para renovación u obtención por primera vez', 1),
        (proc_dni_id, 'Residir en España', 'Empadronamiento en cualquier municipio español', 2),
        (proc_dni_id, 'DNI anterior caducado o próximo a caducar', 'Caducidad en los últimos 3 meses, o pérdida/robo', 3),
        (proc_dni_id, 'Fotografía reciente', '32x40mm, fondo blanco, color, tomada en los últimos 2 meses', 4),
        (proc_dni_id, 'Pago de la tasa', 'Tasa de 23€ (modelo 790 código 012)', 5);

    -- ===========================================
    -- Documentación
    -- ===========================================
    INSERT INTO public.procedure_documents (procedure_id, name, description, is_required, order_index) VALUES
        (proc_dni_id, 'DNI anterior', 'DNI que quieres renovar (si aplica)', true, 1),
        (proc_dni_id, 'Fotografía de carnet', '32x40mm, fondo blanco, reciente', true, 2),
        (proc_dni_id, 'Justificante de pago de tasa', 'Resguardo del pago de 23€', true, 3),
        (proc_dni_id, 'Certificado de empadronamiento', 'Opcional pero recomendado', false, 4);

    -- ===========================================
    -- Pasos
    -- ===========================================
    INSERT INTO public.procedure_steps (procedure_id, title, description, order_index, is_important) VALUES
        (proc_dni_id, 'Solicitar cita previa', 'Pedir cita en la sede electrónica de la Policía Nacional o en https://www.citapreviadnie.es/', 1, true),
        (proc_dni_id, 'Pagar la tasa', 'Pago telemático o en entidad bancaria del modelo 790', 2, true),
        (proc_dni_id, 'Acudir a la oficina', 'Presentar documentación el día y hora de la cita', 3, true),
        (proc_dni_id, 'Recibir el nuevo DNI', 'Enviado al domicilio por correo certificado en 15-20 días hábiles', 4, false);

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


