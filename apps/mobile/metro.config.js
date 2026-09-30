// ============================================
// Metro — configuración de monorepo
// ============================================
// npm workspaces hoistea `expo`, `expo-router` y el resto del stack del móvil
// al node_modules de la RAÍZ del monorepo, no al de apps/mobile.
//
// `watchFolders` permite a Metro vigilar la raíz y `nodeModulesPaths` fija el
// orden de resolución — configuración estándar de Expo en monorepos.
//
// IMPORTANTE: además de esto hace falta la variable de entorno
//   EXPO_NO_METRO_WORKSPACE_ROOT=1
// Sin ella, `expo export:embed` calcula serverRoot = raíz del monorepo (ver
// getMetroServerRoot en @expo/config/build/paths/paths.js), pero la ruta de
// entrada llega relativa a apps/mobile, y Metro la resuelve dos niveles más
// arriba de donde está el fichero:
//   "Unable to resolve module ./../../node_modules/expo-router/entry.js"
// Esa variable NO se puede sustituir desde aquí porque Expo la evalúa fuera de
// la config de Metro. Ver docs/EXPO_SDK_53_MIGRATION_16KB.md.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// packages/shared se consume como código fuente (`@trami-espana/shared` apunta
// a src/), por lo que Metro debe incluirlo en la transpilación.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;