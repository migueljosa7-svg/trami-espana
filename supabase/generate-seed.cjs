// =====================================================================
// TRAMI ESPAÑA - Generador de siembra de trámites reales (Versión 8)
// =====================================================================
// Lee seed-data.cjs (65 trámites: >=6 por categoría) y genera la
// migración SQL idempotente en supabase/migrations/.
// Uso:  node generate-seed.cjs
// =====================================================================

const fs = require('fs');
const path = require('path');
const DATA = require('./seed-data.cjs');

const OUT_FILE = path.join(
    __dirname,
    'migrations',
    '20240101000014_seed_real_procedures.sql'
);

const esc = (v) =>
    v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;

// ---------- Validaciones ----------
const slugs = new Set();
for (const p of DATA) {
    if (slugs.has(p.s)) throw new Error(`Slug duplicado: ${p.s}`);
    slugs.add(p.s);
    if (!p.t || !p.sd || !p.d || !p.cat || !p.url) {
        throw new Error(`Datos incompletos en ${p.s}`);
    }
    if (!Array.isArray(p.req) || p.req.length < 3) {
        throw new Error(`Requisitos insuficientes (<3): ${p.s}`);
    }
    if (!Array.isArray(p.docs) || p.docs.length < 2) {
        throw new Error(`Documentación insuficiente (<2): ${p.s}`);
    }
    if (!Array.isArray(p.steps) || p.steps.length < 3) {
        throw new Error(`Pasos insuficientes (<3): ${p.s}`);
    }
    if (!Array.isArray(p.links) || p.links.length < 1) {
        throw new Error(`Enlaces insuficientes (<1): ${p.s}`);
    }
}

// ---------- Construcción del SQL ----------
const out = [];
out.push(`-- =====================================================================`);
out.push(`-- TRAMI ESPAÑA - Siembra de trámites reales (Versión 8)`);
out.push(`-- =====================================================================`);
out.push(`-- Contenido editorial real y útil: 6+ trámites por cada categoría.`);
out.push(`-- Cada trámite incluye requisitos, documentación, pasos y enlaces oficiales.`);
out.push(`-- IDEMPOTENTE: seguro de re-ejecutar (INSERT ... WHERE NOT EXISTS).`);
out.push(`-- Generado automáticamente por supabase/generate-seed.cjs`);
out.push(`-- =====================================================================`);
out.push('');
out.push('BEGIN;');
out.push('');
out.push(`-- ============================================================`);
out.push(`-- 1) TRÁMITES (procedures)`);
out.push(`-- ============================================================`);
out.push(
    `INSERT INTO public.procedures (title, slug, short_description, description, category_id, scope, cost, estimated_duration, source, source_url, is_published, verification_status, last_verified_at)`
);
out.push(
    `SELECT v.title, v.slug, v.short_description, v.descr, c.id, v.scope, v.cost, v.duration, 'Trami España (contenido verificado)', v.url, true, 'verified', now()`
);
out.push(`FROM (VALUES`);
DATA.forEach((p, i) => {
    const row = `(${esc(p.t)}, ${esc(p.s)}, ${esc(p.sd)}, ${esc(p.d)}, ${esc(p.cat)}, ${esc(p.scope || 'estatal')}, ${esc(p.cost || 'Gratuito')}, ${esc(p.dur || '15 minutos')}, ${esc(p.url)})`;
    out.push(`    ${row}${i < DATA.length - 1 ? ',' : ''}`);
});
out.push(`) AS v(title, slug, short_description, descr, cat_slug, scope, cost, duration, url)`);
out.push(`JOIN public.procedure_categories c ON c.slug = v.cat_slug`);
out.push(`WHERE NOT EXISTS (SELECT 1 FROM public.procedures p WHERE p.slug = v.slug);`);
out.push('');

// 2) Requisitos
out.push(`-- ============================================================`);
out.push(`-- 2) REQUISITOS (procedure_requirements)`);
out.push(`-- ============================================================`);
out.push(`INSERT INTO public.procedure_requirements (procedure_id, title, order_index)`);
out.push(`SELECT p.id, v.title, v.ord`);
out.push(`FROM (VALUES`);
const reqRows = [];
DATA.forEach((p) => {
    p.req.forEach((r, i) => reqRows.push(`(${esc(p.s)}, ${esc(r)}, ${i})`));
});
out.push(`    ${reqRows.join(',\n    ')}`);
out.push(`) AS v(slug, title, ord)`);
out.push(`JOIN public.procedures p ON p.slug = v.slug`);
out.push(`WHERE NOT EXISTS (SELECT 1 FROM public.procedure_requirements r WHERE r.procedure_id = p.id AND r.title = v.title);`);
out.push('');

// 3) Documentación
out.push(`-- ============================================================`);
out.push(`-- 3) DOCUMENTACIÓN (procedure_documents)`);
out.push(`-- ============================================================`);
out.push(`INSERT INTO public.procedure_documents (procedure_id, name, is_required, order_index)`);
out.push(`SELECT p.id, v.name, v.req, v.ord`);
out.push(`FROM (VALUES`);
const docRows = [];
DATA.forEach((p) => {
    p.docs.forEach((d, i) =>
        docRows.push(`(${esc(p.s)}, ${esc(d[0])}, ${d[1] === false ? 'false' : 'true'}, ${i})`)
    );
});
out.push(`    ${docRows.join(',\n    ')}`);
out.push(`) AS v(slug, name, req, ord)`);
out.push(`JOIN public.procedures p ON p.slug = v.slug`);
out.push(`WHERE NOT EXISTS (SELECT 1 FROM public.procedure_documents d WHERE d.procedure_id = p.id AND d.name = v.name);`);
out.push('');

// 4) Pasos
out.push(`-- ============================================================`);
out.push(`-- 4) PASOS (procedure_steps)`);
out.push(`-- ============================================================`);
out.push(`INSERT INTO public.procedure_steps (procedure_id, title, description, order_index)`);
out.push(`SELECT p.id, v.title, v.descr, v.ord`);
out.push(`FROM (VALUES`);
const stepRows = [];
DATA.forEach((p) => {
    p.steps.forEach((s, i) => stepRows.push(`(${esc(p.s)}, ${esc(s[0])}, ${esc(s[1])}, ${i})`));
});
out.push(`    ${stepRows.join(',\n    ')}`);
out.push(`) AS v(slug, title, descr, ord)`);
out.push(`JOIN public.procedures p ON p.slug = v.slug`);
out.push(`WHERE NOT EXISTS (SELECT 1 FROM public.procedure_steps s WHERE s.procedure_id = p.id AND s.title = v.title);`);
out.push('');

// 5) Enlaces
out.push(`-- ============================================================`);
out.push(`-- 5) ENLACES OFICIALES (procedure_links)`);
out.push(`-- ============================================================`);
out.push(`INSERT INTO public.procedure_links (procedure_id, title, url, link_type, is_official)`);
out.push(`SELECT p.id, v.title, v.url, v.ltype, true`);
out.push(`FROM (VALUES`);
const linkRows = [];
DATA.forEach((p) => {
    p.links.forEach((l, i) =>
        linkRows.push(`(${esc(p.s)}, ${esc(l[0])}, ${esc(l[1])}, ${esc(l[2] || 'official')})`)
    );
});
out.push(`    ${linkRows.join(',\n    ')}`);
out.push(`) AS v(slug, title, url, ltype)`);
out.push(`JOIN public.procedures p ON p.slug = v.slug`);
out.push(`WHERE NOT EXISTS (SELECT 1 FROM public.procedure_links l WHERE l.procedure_id = p.id AND l.url = v.url);`);
out.push('');
out.push('COMMIT;');
out.push('');

fs.writeFileSync(OUT_FILE, out.join('\n'), 'utf8');
const byCat = DATA.reduce((acc, p) => {
    acc[p.cat] = (acc[p.cat] || 0) + 1;
    return acc;
}, {});
console.log(`OK -> ${OUT_FILE}`);
console.log(`Tramites: ${DATA.length}`);
console.log(JSON.stringify(byCat, null, 2));
