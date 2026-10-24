/**
 * ============================================================
 * withLegacyBackHandling — Config Plugin (v1.5.1)
 * ============================================================
 * Con targetSdk 36 (Android 16) el "predictive back" queda activo por
 * defecto: el sistema deja de llamar a Activity.onBackPressed() y cierra la
 * app directamente. React Native 0.79 depende de onBackPressed() para emitir
 * `hardwareBackPress` a JS, así que el modal de salida nunca se mostraba.
 *
 * Este plugin fija android:enableOnBackInvokedCallback="false" en
 * <application> para que el botón/gesto Atrás vuelva a pasar por
 * BackHandler. Es idempotente y sobrevive a `expo prebuild --clean`.
 */
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withLegacyBackHandling(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$ = app.$ || {};
      app.$['android:enableOnBackInvokedCallback'] = 'false';
    }
    return cfg;
  });
};
