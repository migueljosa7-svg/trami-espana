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

// ============================================================
// SINGLETON DE REACT  (fix del crash de arranque — ver abajo)
// ============================================================
// PROBLEMA
// ---------
// El monorepo necesita DOS versiones mayores de React a la vez:
//   · node_modules/react                     -> 18.2.0  (lo usa apps/web)
//   · apps/mobile/node_modules/react         -> 19.0.0  (lo usa apps/mobile)
// Es un requisito legitimo: RN 0.79 exige `react@^19` como peer, mientras que
// el stack web (cmdk, radix, lucide) sigue anclado a React 18.
//
// npm hoistea `react-native@0.79.6` en la RAÍZ del monorepo. Su renderer
// (Libraries/Renderer/implementations/ReactNativeRenderer-prod.js:22) ejecuta:
//
//     React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
//
// Ese símbolo SOLO existe en React 19. Al resolverlo, el renderer de RN
// encuentra el React 18 de la raíz, la expresión vale `undefined` y el acceso
// siguiente a una propiedad lanza:
//
//     TypeError: Cannot read property 'S' of undefined
//
// ('S' es el nombre minificado del slot de ReactSharedInternals en Hermes).
// Ocurre ANTES del primer render, así que la app muere al instante sin UI.
//
// POR QUÉ NO BASTA `nodeModulesPaths`
// ---------------------------------
// Para un especificador desnudo, Metro 1) recorre `node_modules` hacia arriba
// desde el FICHERO QUE IMPORTA y 2) solo después concatena `nodeModulesPaths`.
// Para `node_modules/react-native/...` ese recorrido llega a
// `<raiz>/node_modules/react` (18) antes de mirar nuestra lista, así que
// poner el node_modules del movil primero no cambia nada. Lo mismo ocurre con
// `extraNodeModules`, que se concatena al FINAL de la lista. Verificado
// empíricamente con el propio resolutor de Metro (metro-resolver):
//
//     react-native renderer -> node_modules/react/index.js            (18) ✗
//     expo-router          -> node_modules/react/index.js            (18) ✗
//     codigo de la app     -> apps/mobile/node_modules/react/...      (19) ✓
//
// SOLUCIÓN
// --------
// `resolveRequest` es el PRIMER resolutor de la cadena de Metro
// (metro-resolver/src/resolve.js:34-44), antes incluso del recorrido
// jerárquico. Lo usamos para fijar React (y su runtime) a la única copia
// válida —la del workspace del móvil— venga el import de donde venga.
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');

// Paquetes que deben ser SIEMPRE la copia del móvil. Si desaparecen, es un
// error de instalación: preferimos fallar en el bundle (mensaje accionable)
// antes que un crash en producción.
const REQUIRED_SINGLETONS = ['react'];

// Paquetes que DEBEN ser la copia del móvil si existe; si no, se deja que
// Metro resuelva con normalidad (no son imprescindibles en un bundle nativo).
const OPTIONAL_SINGLETONS = [
    'react-dom',
    'react-test-renderer',
    'scheduler',
    'use-sync-external-store',
];

const SINGLETONS = [...REQUIRED_SINGLETONS, ...OPTIONAL_SINGLETONS];

const isSubpathOf = (moduleName, pkg) =>
    moduleName === pkg || moduleName.startsWith(`${pkg}/`);

const pinnedResolutionCache = new Map();

/**
 * Resuelve un especificador de React usando EXCLUSIVAMENTE el node_modules del
 * workspace del móvil.
 *
 * Se comprueba que el resultado caiga dentro de `apps/mobile/node_modules`:
 * `require.resolve` sube por el árbol y, si la copia local faltara, acabaría
 * devolviendo el React 18 de la raíz — justo lo que hay que impedir. Con esa
 * comprobación, una resolución incorrecta nunca se fija en silencio.
 */
function resolveFromMobileWorkspace(moduleName) {
    if (pinnedResolutionCache.has(moduleName)) {
        return pinnedResolutionCache.get(moduleName);
    }

    let filePath = null;
    try {
        const resolved = require.resolve(moduleName, { paths: [projectRoot] });
        if (
            resolved === mobileNodeModules ||
            resolved.startsWith(mobileNodeModules + path.sep)
        ) {
            filePath = resolved;
        }
    } catch {
        filePath = null;
    }

    pinnedResolutionCache.set(moduleName, filePath);
    return filePath;
}

const previousResolveRequest = config.resolver.resolveRequest;
const inheritedResolveRequest =
    typeof previousResolveRequest === 'function' ? previousResolveRequest : null;

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (SINGLETONS.some((pkg) => isSubpathOf(moduleName, pkg))) {
        const pinned = resolveFromMobileWorkspace(moduleName);

        if (pinned !== null) {
            return { type: 'sourceFile', filePath: pinned };
        }

        if (REQUIRED_SINGLETONS.some((pkg) => isSubpathOf(moduleName, pkg))) {
            throw new Error(
                `[metro] No se encuentra "${moduleName}" en apps/mobile/node_modules.\n` +
                    `       React Native 0.79 requiere React 19 y el bundle móvil debe usar ` +
                    `una única copia de React.\n` +
                    `       Ejecuta "npm install --legacy-peer-deps" en la raíz del monorepo ` +
                    `y vuelve a lanzar el bundler.`
            );
        }
    }

    // Cualquier otro módulo: resolución estándar de Metro.
    if (inheritedResolveRequest) {
        return inheritedResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;