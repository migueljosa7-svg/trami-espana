/**
 * Post-install fix (Windows): @expo/cli (SDK 50) incluye "node:sea" en
 * NODE_STDLIB_MODULES y usa ese literal como nombre de carpeta de shims de
 * Metro. Los dos puntos son ilegales en rutas NTFS -> ENOENT mkdir.
 * Este script normaliza el prefijo node: en externals.js si el bug está
 * presente. Es idempotente e inocuo en otras plataformas.
 *
 * Origen del parche: tapNodeShims() en start/server/metro/externals.js
 */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'cli',
  'build',
  'src',
  'start',
  'server',
  'metro',
  'externals.js'
);

if (!fs.existsSync(target)) {
  process.exit(0);
}

let code = fs.readFileSync(target, 'utf8');
const buggy = 'for (const moduleId of NODE_STDLIB_MODULES){';
const fixed =
  'for (const rawModuleId of NODE_STDLIB_MODULES){\n' +
  '        const moduleId = rawModuleId.replace(/^node:/, "");';

if (code.includes(buggy)) {
  code = code.replace(buggy, fixed);
  fs.writeFileSync(target, code);
  console.log('[postinstall-expo-cli-win-fix] patched @expo/cli externals.js (node: shim Windows fix)');
} else {
  console.log('[postinstall-expo-cli-win-fix] no patch needed');
}

/**
 * Android 16 (API 36) compatibility fix for expo-modules-core (SDK 50).
 *
 * Con compileSdk 36, Android declara PackageInfo.requestedPermissions como
 * `Array<String>?` y Kotlin (1.8.10) rechaza la llamada `.contains` directa:
 * "Only safe (?.) or non-null asserted (!!.) calls are allowed on a nullable
 * receiver". El default del SDK 50 (expo-modules-core 1.11.x) usa
 * `requestedPermissions.contains(permission)` sin safe-call.
 *
 * Este parche (idempotente) sustituye la llamada por una safe-call con
 * `== true` para mantener la semántica (permiso ausente -> false).
 * Necesario únicamente con targetSdk/compileSdk >= 36; sin él el build
 * release con API 36 falla en :expo-modules-core:compileReleaseKotlin.
 */
const permFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-core',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'adapters',
  'react',
  'permissions',
  'PermissionsService.kt'
);

if (fs.existsSync(permFile)) {
  let permCode = fs.readFileSync(permFile, 'utf8');
  const buggyPerm = 'return requestedPermissions.contains(permission)';
  const fixedPerm = 'return requestedPermissions?.contains(permission) == true';
  if (permCode.includes(buggyPerm)) {
    permCode = permCode.replace(buggyPerm, fixedPerm);
    fs.writeFileSync(permFile, permCode);
    console.log('[postinstall-expo-cli-win-fix] patched expo-modules-core PermissionsService.kt (API 36 nullable safe-call)');
  } else {
    console.log('[postinstall-expo-cli-win-fix] no kotlin patch needed');
  }
}

/**
 * Runtime fix (Android < API 35) para react-native-screens 3.29.0.
 *
 * `ScreenStack.obtainDrawingOp()` llama a `java.util.List.removeLast()`, método
 * default añadido en Java 21 que solo existe en el runtime de Android desde la
 * API 35 (Android 16). En dispositivos/emuladores con API < 35 el primer draw del
 * ScreenStack lanza `NoSuchMethodError: No interface method removeLast()` y el
 * proceso muere (crash verificado en emulador API 34 con la build release).
 *
 * Core library desugaring (`desugar_jdk_libs` 2.1.2 + AGP 8.1.1) NO reescribe
 * esta llamada: el D8 incluido en AGP 8.1.1 no reescribe métodos default de
 * `SequencedCollection`, por lo que el desugaring no es suficiente aquí.
 *
 * Sustitución por el equivalente exacto `removeAt(size - 1)` (compila a
 * `java.util.List.remove(int)`, disponible desde la API 1). Semántica idéntica
 * cuando la lista no está vacía (garantizado por el guard `isEmpty()` previo).
 * Parche idempotente: sin efecto en versiones del paquete que no usen removeLast().
 */
const screensStackFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-screens',
  'android',
  'src',
  'main',
  'java',
  'com',
  'swmansion',
  'rnscreens',
  'ScreenStack.kt'
);

if (fs.existsSync(screensStackFile)) {
  let screensCode = fs.readFileSync(screensStackFile, 'utf8');
  const buggyRemoveLast = 'drawingOpPool.removeLast()';
  const fixedRemoveAt = 'drawingOpPool.removeAt(drawingOpPool.size - 1)';
  if (screensCode.includes(buggyRemoveLast)) {
    fs.writeFileSync(screensStackFile, screensCode.replace(buggyRemoveLast, fixedRemoveAt));
    console.log('[postinstall-expo-cli-win-fix] patched react-native-screens ScreenStack.kt (removeLast -> removeAt, API < 35 crash)');
  } else {
    console.log('[postinstall-expo-cli-win-fix] no react-native-screens patch needed');
  }
}

