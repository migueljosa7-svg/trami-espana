/**
 * ============================================================
 * withReleaseSigning — Config Plugin de firma de producción
 * ============================================================
 * `expo prebuild` REGENERA `android/app/build.gradle` desde una plantilla y
 * borra el directorio `android/` entero. Eso destruía dos cosas críticas:
 *
 *   1. El `signingConfig` de release (el release quedaba firmado con la clave
 *      DEBUG, que Google Play rechaza).
 *   2. El fichero `android/gradle.properties` con las variables MYAPP_RELEASE_*.
 *
 * Este plugin lo resuelve de forma declarativa y sobrevive a cualquier
 * prebuild. Lee las credenciales de `keystore/signing-config.json` (fuera de
 * `android/`, y gitignorado junto al keystore) y:
 *
 *   - inyecta el `signingConfig` de release en `android/app/build.gradle`
 *   - apunta `buildTypes.release` a ese signingConfig
 *   - escribe las variables MYAPP_RELEASE_* en `android/gradle.properties`
 *
 * Es IDEMPOTENTE: se puede ejecutar tantas veces como haga falta.
 *
 * @see docs/EXPO_SDK_53_MIGRATION_16KB.md
 */
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'keystore', 'signing-config.json');

const RELEASE_SIGNING_BLOCK = `
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }`;

function readSigningConfig(projectRoot) {
  const file = path.join(projectRoot, 'keystore', 'signing-config.json');
  if (!fs.existsSync(file)) {
    throw new Error(
      `withReleaseSigning: falta ${file}. Copia el bloque MYAPP_RELEASE_* de tu\n` +
      'gradle.properties de referencia en ese JSON (storeFile, keyAlias y ambas\n' +
      'contraseñas) para poder firmar las builds de producción.'
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const withReleaseSigning = (config) => {
  const projectRoot = config._internal?.projectRoot ?? path.join(__dirname, '..');
  const signing = readSigningConfig(projectRoot);

  // --- 1) gradle.properties: exponer las credenciales al build -------------
  config = withGradleProperties(config, (cfg) => {
    const items = [
      { type: 'comment', value: 'Firma de release (inyectada por withReleaseSigning)' },
      { type: 'property', key: 'MYAPP_RELEASE_STORE_FILE', value: signing.storeFile },
      { type: 'property', key: 'MYAPP_RELEASE_KEY_ALIAS', value: signing.keyAlias },
      { type: 'property', key: 'MYAPP_RELEASE_STORE_PASSWORD', value: signing.storePassword },
      { type: 'property', key: 'MYAPP_RELEASE_KEY_PASSWORD', value: signing.keyPassword },
    ];
    const existing = cfg.modResults.filter(
      (p) => p.type === 'property' && !String(p.key).startsWith('MYAPP_RELEASE_')
        && p.value !== 'Firma de release (inyectada por withReleaseSigning)'
    );
    // Quita duplicados previos (idempotencia).
    cfg.modResults = [
      ...existing.filter((p) => !(p.type === 'comment' && String(p.value).includes('withReleaseSigning'))),
      ...items,
    ];
    return cfg;
  });

  // --- 2) app/build.gradle: signingConfig de release -----------------------
  config = withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;

    if (!src.includes('MYAPP_RELEASE_STORE_FILE')) {
      // Añade el bloque `release` dentro de `signingConfigs {`.
      src = src.replace(/signingConfigs \{/, `signingConfigs {${RELEASE_SIGNING_BLOCK}`);
      // Apunta buildTypes.release al signingConfig de release (no al debug).
      src = src.replace(
        /(release \{[^}]*?)signingConfig signingConfigs\.debug/,
        '$1signingConfig signingConfigs.release'
      );
    }
    cfg.modResults.contents = src;
    return cfg;
  });

  return config;
};

module.exports = withReleaseSigning;