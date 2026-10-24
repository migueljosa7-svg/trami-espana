/**
 * ============================================================
 * withReleaseOptimizations — Config Plugin (v1.5.1)
 * ============================================================
 * Garantiza en `android/app/build.gradle` (y tras cada `expo prebuild`):
 *
 *   buildTypes.release {
 *       minifyEnabled true
 *       shrinkResources true
 *       proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
 *       ndk { debugSymbolLevel 'SYMBOL_TABLE' }
 *   }
 *
 * - R8 con optimizaciones: DEX más pequeño y menos RAM en tiempo de ejecución.
 * - `proguard-android.txt` está obsoleto en AGP 8 y se elimina en AGP 9.
 * - `debugSymbolLevel` incluye los símbolos nativos en el AAB, lo que elimina
 *   el aviso de Play Console "Este App Bundle contiene código nativo y no has
 *   subido símbolos de depuración".
 * Es idempotente.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

function applyReleaseOptimizations(src) {
  let out = src
    .replace(/minifyEnabled\s+enableMinifyInReleaseBuilds/, 'minifyEnabled true')
    .replace(/shrinkResources\s+enableShrinkResourcesInReleaseBuilds/, 'shrinkResources true')
    .replace(
      /proguardFiles getDefaultProguardFile\(["']proguard-android\.txt["']\),\s*["']proguard-rules\.pro["']/,
      "proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'",
    );
  if (!out.includes('debugSymbolLevel')) {
    out = out.replace(
      /(minifyEnabled true\n)/,
      "$1            ndk { debugSymbolLevel 'SYMBOL_TABLE' }\n",
    );
  }
  return out;
}

module.exports = function withReleaseOptimizations(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applyReleaseOptimizations(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.applyReleaseOptimizations = applyReleaseOptimizations;
