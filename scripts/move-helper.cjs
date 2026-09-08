// Mueve extractDirectProcedureQuery fuera de getGreetingResponse (a módulo).
const fs = require('fs');
const p = 'c:/Users/migue/Desktop/trami-espana/apps/mobile/app/(tabs)/asistente.tsx';
let s = fs.readFileSync(p, 'utf8');

const head = '  // General greeting';
const i = s.indexOf(head);
const j = s.indexOf('  return "' + '\u00A1Hola!', i); // "  return \"¡Hola!..."
if (i === -1 || j === -1 || j <= i) { console.error('markers', i, j); process.exit(1); }

// Extraer SOLO el bloque de la función helper (comentario + función).
const helperRaw = s.slice(i + head.length, j); // "\\n\\n/** ... }\\n\\n"
const m = helperRaw.match(/\n\n(\/\*\*[\s\S]*?\n\})\n\n/);
if (!m) { console.error('no helper block'); process.exit(1); }
const helper = m[1];

// Quitar el bloque del interior de getGreetingResponse.
s = s.slice(0, i) + head + s.slice(i + head.length).replace(helper, '');

// Insertarlo a nivel de módulo, justo antes de la función principal.
const k = s.indexOf('export default function AssistantScreen()');
if (k === -1) { console.error('anchor2 not found'); process.exit(1); }
s = s.slice(0, k) + helper + '\n\n' + s.slice(k);

fs.writeFileSync(p, s, 'utf8');
console.log('OK moved, helper len=' + helper.length);