#!/usr/bin/env node
/**
 * ============================================================
 * Trami España — verify-16kb-page-size.mjs
 * ============================================================
 * Auditoría del requisito de Google Play sobre páginas de memoria
 * de 16 KB (Android 15 / 16 KB page size).
 *
 * POR QUÉ ESTA HERRAMIENTA
 * -----------------------
 * Google Play exige que TODAS las librerías nativas (.so) del paquete tengan
 * los segmentos ELF `PT_LOAD` alineados a 16384 bytes. En este repositorio
 * (Expo SDK 50 / React Native 0.73) las .so llegan PRECOMPILADAS dentro de los
 * AAR de npm, así que ningún flag de Gradle puede|alignarlas: el único modo
 * fiable de saber si se cumple el requisito es MEDIR el binario.
 *
 * `jniLibsPageSize()` solo existe en AGP >= 8.5.1 (y exige Gradle >= 8.7).
 * Este proyecto usa el AGP que fija React Native (8.1.1), por lo que declarar
 * `android.jniLibsPageSize=16384` es un no-op silencioso.
 *
 * POR QUÉ NO USA DEPENDENCIAS
 * ---------------------------
 * Para poder ejecutarse en CI con un `node scripts/...` sin instalar nada más
 * en el monorepo. El ZIP se lee a mano y se descomprime con `zlib` nativo.
 *
 * USO
 * ---
 *   node scripts/verify-16kb-page-size.mjs
 *   node scripts/verify-16kb-page-size.mjs ruta/al/otro.aab
 *   node scripts/verify-16kb-page-size.mjs --json
 *
 * SALIDA
 * ------
 * Código 0 = todas las .so conformes. Código 1 = hay .so no conformes.
 * Código 2 = error de uso o binario ilegible.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';

const REQUIRED_ALIGN = 16384;
const DEFAULT_AAB = path.join(
  'apps', 'mobile', 'android', 'app', 'build',
  'outputs', 'bundle', 'release', 'app-release.aab',
);

// ============================================================
// Lector ZIP mínimo (sin dependencias)
// ============================================================
const SIG_EOCD = 0x06054b50;
const SIG_CEN = 0x02014b50;
const SIG_LOC = 0x04034b50;

function findEndOfCentralDirectory(buf) {
  // El EOCD está al final, seguido solo del comentario (longitud <= 0xFFFF).
  const min = Math.max(0, buf.length - 0xffff - 22);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) return i;
  }
  throw new Error('No se encontró el fin del directorio central (EOCD): no parece un ZIP válido.');
}

function listZipEntries(buf) {
  const eocd = findEndOfCentralDirectory(buf);
  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(ptr) !== SIG_CEN) {
      throw new Error(`Firma inválida en el directorio central, entrada ${i}.`);
    }
    const method = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
    if (compressedSize === 0xffffffff || localOffset === 0xffffffff) {
      throw new Error(`La entrada "${name}" usa ZIP64; no soportado por esta herramienta.`);
    }
    entries.push({ name, method, compressedSize, localOffset });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readZipEntry(buf, entry) {
  const off = entry.localOffset;
  if (buf.readUInt32LE(off) !== SIG_LOC) {
    throw new Error(`Firma local inválida en "${entry.name}".`);
  }
  const nameLen = buf.readUInt16LE(off + 26);
  const extraLen = buf.readUInt16LE(off + 28);
  const start = off + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return raw;                    // STORED
  if (entry.method === 8) return inflateRawSync(raw);    // DEFLATE
  throw new Error(`Método de compresión no soportado (${entry.method}) en "${entry.name}".`);
}


/**
 * Devuelve el `p_align` MÍNIMO entre los segmentos PT_LOAD de un ELF.
 * Soporta ELF32 y ELF64 (Android usa siempre little-endian).
 *
 * `PT_LOAD` = 1.
 *   ELF64: e_phoff@0x20(8) e_phentsize@0x36(2) e_phnum@0x38(2) p_align@48
 *   ELF32: e_phoff@0x1C(4) e_phentsize@0x2A(2) e_phnum@0x2C(2) p_align@28
 *
 * Lanza si no encuentra ningún PT_LOAD: es preferible fallar de forma ruidosa
 * que informar un falso "conforme" (que es exactamente el bug que sufrió la
 * primera versión de esta herramienta al leer el endianness al revés).
 */
function elfMinLoadAlign(data, label) {
  if (data.length < 64) throw new Error(`${label}: demasiado pequeño para ser un ELF.`);
  if (data[0] !== 0x7f || data[1] !== 0x45 || data[2] !== 0x4c || data[3] !== 0x46) {
    throw new Error(`${label}: no empieza con la firma ELF.`);
  }
  const eiClass = data[0x04];
  let phoff; let phentsize; let phnum; let pAlignOff; let phSize;

  if (eiClass === 2) {          // ELF64
    phoff = Number(data.readBigUInt64LE(0x20));
    phentsize = data.readUInt16LE(0x36);
    phnum = data.readUInt16LE(0x38);
    pAlignOff = 48;
    phSize = 56;
  } else if (eiClass === 1) {   // ELF32
    phoff = data.readUInt32LE(0x1c);
    phentsize = data.readUInt16LE(0x2a);
    phnum = data.readUInt16LE(0x2c);
    pAlignOff = 28;
    phSize = 32;
  } else {
    throw new Error(`${label}: EI_CLASS desconocido (${eiClass}).`);
  }

  let minAlign = Number.MAX_SAFE_INTEGER;
  let loadSegments = 0;
  for (let i = 0; i < phnum; i++) {
    const base = phoff + i * phentsize;
    if (base < 0 || base + phSize > data.length) break;
    const pType = data.readInt32LE(base);
    if (pType !== 1) continue; // PT_LOAD
    const pAlign = Number(data.readBigUInt64LE(base + pAlignOff));
    loadSegments++;
    if (pAlign < minAlign) minAlign = pAlign;
  }

  if (loadSegments === 0) {
    throw new Error(`${label}: no se encontró ningún segmento PT_LOAD (parser no válido).`);
  }
  return { minAlign, loadSegments, bits: eiClass === 2 ? 64 : 32 };
}

// ============================================================
// Análisis
// ============================================================
function analyse(aabPath) {
  const buf = readFileSync(aabPath);
  const entries = listZipEntries(buf);
  const soEntries = entries.filter((e) => e.name.startsWith('base/lib/') && e.name.endsWith('.so'));

  const results = [];
  for (const entry of soEntries) {
    const data = readZipEntry(buf, entry);
    const info = elfMinLoadAlign(data, entry.name);
    results.push({
      name: entry.name,
      abi: entry.name.split('/')[2],
      bits: info.bits,
      loadSegments: info.loadSegments,
      minAlign: info.minAlign,
      compliant: info.minAlign >= REQUIRED_ALIGN,
    });
  }
  return { total: results.length, results };
}

function hex(n) {
  return '0x' + n.toString(16);
}

function report(analysis, aabPath) {
  const { total, results } = analysis;
  const offenders = results.filter((r) => !r.compliant);
  const abis = [...new Set(results.map((r) => r.abi))].sort();

  console.log('');
  console.log('=== Trami España · Auditoría 16 KB page size (Google Play) ===');
  console.log(`Binario : ${aabPath}`);
  console.log(`Regla   : PT_LOAD con p_align >= ${REQUIRED_ALIGN} (${hex(REQUIRED_ALIGN)})`);
  console.log(`Librerías nativas (.so) analizadas: ${total}`);
  console.log('');

  console.log('Desglose por arquitectura:');
  for (const abi of abis) {
    const inAbi = results.filter((r) => r.abi === abi);
    const bad = inAbi.filter((r) => !r.compliant).length;
    const mark = bad === 0 ? 'OK     ' : 'FALLO  ';
    const bits = inAbi[0]?.bits ?? '?';
    console.log(`  [${mark}] ${abi.padEnd(14)} ${bad} sin alinear de ${inAbi.length} (ELF${bits})`);
  }
  console.log('');

  if (offenders.length === 0) {
    console.log('RESULTADO: CONFORME. Todas las .so están alineadas a 16 KB.');
    return true;
  }

  console.log(`RESULTADO: NO CONFORME. ${offenders.length}/${total} .so sin alineación de 16 KB.`);
  console.log('');
  console.log('Detalle (10 primeras):');
  for (const o of offenders.slice(0, 10)) {
    console.log(`  ${o.name}  p_align=${o.minAlign} (${hex(o.minAlign)})  ELF${o.bits}  PT_LOAD=${o.loadSegments}`);
  }
  if (offenders.length > 10) console.log(`  ... y ${offenders.length - 10} más.`);
  console.log('');
  console.log('CAUSA: estas .so llegan precompiladas en los AAR de npm de React Native');
  console.log('(Expo SDK 50 / RN 0.73). El proyecto no las genera, por lo que un flag de');
  console.log('Gradle NO puede alinearlas: solo un relink con NDK r27+ o una migración a');
  console.log('Expo SDK 53+ / RN 0.77+ lo resuelven (SDK 52 NO cumple).');
  console.log('Ver docs/EXPO_SDK_53_MIGRATION_16KB.md');
  return false;
}

// ============================================================
// CLI
// ============================================================
function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const positional = args.filter((a) => !a.startsWith('--'));
  const aabPath = positional[0] ?? DEFAULT_AAB;

  if (!existsSync(aabPath)) {
    console.error(`ERROR: no existe el .aab en "${aabPath}".`);
    console.error('Genera uno con:  cd apps/mobile/android && gradlew.bat bundleRelease');
    process.exitCode = 2;
    return;
  }

  let analysis;
  try {
    analysis = analyse(aabPath);
  } catch (err) {
    console.error(`ERROR al analizar el binario: ${err.message}`);
    process.exitCode = 2;
    return;
  }

  if (analysis.total === 0) {
    console.error('ERROR: el .aab no contiene ninguna .so en base/lib/. ¿Es un bundle válido?');
    process.exitCode = 2;
    return;
  }

  const ok = report(analysis, aabPath);
  if (asJson) {
    console.log(JSON.stringify({
      aab: aabPath,
      requiredAlign: REQUIRED_ALIGN,
      total: analysis.total,
      compliant: analysis.total - analysis.results.filter((r) => !r.compliant).length,
      offenders: analysis.results.filter((r) => !r.compliant),
    }, null, 2));
  }
  // `process.exitCode` (no `process.exit()`): al escribir en un pipe, un exit
  // inmediato puede descartar el stdout bufferizado y perder el informe.
  process.exitCode = ok ? 0 : 1;
}

// ============================================================
// AUDITORÍA DIRECTA DE LOS AAR (sin necesidad de compilar)
// ============================================================
// Los .so NO se generan en este proyecto: vienen precompilados dentro de los AAR
// publicados en npm. Auditar esos AAR permite saber si el stack nuevo trae
// binarios de 16 KB ANTES de invertir minutos en un `bundleRelease`.
// Los .so de un AAR viven en `jni/<abi>/` (no en `base/lib/` como en un .aab).
function listAllSoFiles(root) {
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 6) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules' && depth > 0) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (e.name.endsWith('.aar')) found.push(full);
    }
  };
  walk(root, 0);
  return found;
}

function auditAars(rootDir) {
  const aars = listAllSoFiles(rootDir);
  let ok = 0, bad = 0, total = 0;
  const offenders = [];
  for (const aarPath of aars) {
    let buf;
    try { buf = readFileSync(aarPath); } catch { continue; }
    let entries;
    try { entries = listZipEntries(buf); } catch { continue; }
    for (const entry of entries) {
      if (!entry.name.startsWith('jni/') || !entry.name.endsWith('.so')) continue;
      const abi = entry.name.split('/')[1];
      if (abi !== 'arm64-v8a') continue; // solo 64-bit es lo que importa en Play
      let data;
      try { data = readZipEntry(buf, entry); } catch { continue; }
      let info;
      try { info = elfMinLoadAlign(data, entry.name); } catch { continue; }
      total++;
      const rel = path.relative(rootDir, aarPath).replace(/\\/g, '/');
      if (info.minAlign >= REQUIRED_ALIGN) { ok++; }
      else { bad++; offenders.push({ aar: rel, so: entry.name.split('/').pop(), align: info.minAlign }); }
    }
  }
  return { aars: aars.length, total, ok, bad, offenders };
}

if (process.argv.includes('--aars')) {
  const root = process.argv[process.argv.indexOf('--aars') + 1] ?? process.cwd();
  const r = auditAars(root);
  console.log('');
  console.log('=== Trami España · Alineacion 16 KB de los AAR precompilados ===');
  console.log(`AAR analizados: ${r.aars}`);
  console.log(`Binarios arm64-v8a: ${r.total}`);
  console.log('');
  if (r.total === 0) { console.log('Sin .so arm64-v8a encontrados.'); process.exitCode = 2; }
  else if (r.bad === 0) { console.log(`OK: los ${r.total} binarios arm64-v8a estan alineados a 16 KB.`); process.exitCode = 0; }
  else {
    console.log(`FALLO: ${r.bad}/${r.total} binarios SIN alinear. Ejemplos:`);
    r.offenders.slice(0, 12).forEach((o) => {
      console.log(`  ${o.so.padEnd(34)} p_align=${o.align} (${Integer.toHexString(o.align)})  <- ${o.aar}`);
    });
    process.exitCode = 1;
  }
} else {
  // Modo normal: audita el .aab compilado.
  main();
}
