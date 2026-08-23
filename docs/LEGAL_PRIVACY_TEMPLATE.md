# Trami España — Plantilla de Política de Privacidad (FASE 7)

> **⚠️ PLANTILLA — NO ES UN DOCUMENTO LEGAL FINAL.**
> Este documento es una base de preparación. **Debe revisarse y completarse con los datos reales de la entidad** (nombre legal, email, domicilio, DPO si aplica) antes de publicarse. No inventes datos: cada campo marcado con `[REQUIERE: ...]` debe ser completado por el responsable legal.
>
> Última revisión de campos pendientes: [REQUIERE: fecha].

---

## 1. Responsable del tratamiento

- **Titular / Razón social:** [REQUIERE: nombre legal de la entidad]
- **Email de contacto:** [REQUIERE: email real — verificar si `contacto@tramiespana.es` es el oficial]
- **Web:** [REQUIERE: dominio real — verificar si `https://tramiespana.es` es el oficial]
- **Domicilio:** [REQUIERE: dirección postal, si aplica]

## 2. Base legal (RGPD/LOPDGDD)

- **Consentimiento (art. 6.1.a RGPD):** para el registro y uso del servicio.
- **Interés legítimo (art. 6.1.f RGPD):** para mejoras del servicio y análisis.
- [REQUIERE: revisión por asesor jurídico de la base aplicable.]

## 3. Datos que recopilamos

- Cuenta: email (obligatorio), nombre (opcional). [REQUIERE: confirmar campos almacenados]
- Datos de uso anónimos para mejora del servicio.
- Datos de la IA del asistente (consultas).
- [REQUIERE: inventario completo de datos personales tratados.]

## 4. Finalidad y conservación

- Finalidad principal: prestación del servicio de información de trámites.
- Plazo de conservación: [REQUIERE: definir plazos, p. ej. mientras dure la cuenta, salvo obligación legal].

## 5. Derechos (ARCO-POL / RGDP)

Acceso, rectificación, supresión, oposición, limitación, portabilidad, y retirada del consentimiento. Ejercicio vía: [REQUIERE: email/canal].

## 6. Proveedores / cesiones

- **Supabase** (hosting de datos y autenticación). [REQUIERE: verificar subencargado/DTA]
- **Proveedor LLM** de la Edge Function del asistente (si se usa). [REQUIERE: listar]
- [REQUIERE: listar todas las cesiones / transferencias internacionales.]

## 7. Seguridad

- Encriptación en tránsito y en reposo (Supabase).
- Acceso mediante token / anon key (nunca service_role en cliente).
- [REQUIERE: revisión técnica de medidas.]

## 8. Menores

- [REQUIERE: determinar si el servicio está dirigido a menores de 14 años y las correspondientes implicaciones RGPD.]
