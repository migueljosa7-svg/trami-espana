/**
 * Script de parcheo post-prebuild para monorepo.
 * Corrige los archivos de configuración de Gradle generados por expo prebuild
 * para que funcionen correctamente en un monorepo con npm workspaces.
 * 
 * Ejecutar después de: npx expo prebuild --platform android --clean
 */

const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'apps', 'mobile', 'android');
const rootNodeModules = path.join(__dirname, '..', 'node_modules');

// 1. Corregir settings.gradle
function patchSettingsGradle() {
    const settingsGradlePath = path.join(androidDir, 'settings.gradle');
    let content = fs.readFileSync(settingsGradlePath, 'utf8');
    
    // Verificar si ya está parcheado
    if (content.includes('rootNodeModules')) {
        console.log('✓ settings.gradle ya está configurado para monorepo');
        return;
    }
    
    // Determinar la ruta correcta a node_modules (3 niveles arriba desde apps/mobile/android/)
    const newContent = `rootProject.name = 'Trami España'

def localProperties = new File(rootDir, "local.properties")
if (localProperties.exists()) {
    localProperties.withInputStream { stream ->
        def properties = new Properties()
        properties.load(stream)
        properties.each { key, value ->
            if (key == "sdk.dir") {
                gradle.ext.sdkDir = value
            }
        }
    }
}

// En monorepo con npm workspaces, los módulos están en la raíz del workspace
// Desde apps/mobile/android/, necesitamos 3 niveles arriba para llegar a la raíz
def rootNodeModules = new File(rootDir, "../../../node_modules")

dependencyResolutionManagement {
    versionCatalogs {
        reactAndroidLibs {
            def rnPackage = new File(rootNodeModules, "react-native/package.json")
            if (rnPackage.exists()) {
                from(files(new File(rnPackage.parentFile, "gradle/libs.versions.toml")))
            }
        }
    }
}

// Autolinking de Expo - usar ruta directa a la raíz del monorepo
apply from: new File(rootNodeModules, "expo/scripts/autolinking.gradle")
useExpoModules()

// React Native CLI
apply from: new File(rootNodeModules, "@react-native-community/cli-platform-android/native_modules.gradle")
applyNativeModulesSettingsGradle(settings)

include ':app'

// React Native Gradle Plugin
includeBuild(new File(rootNodeModules, "@react-native/gradle-plugin"))
`;
    
    fs.writeFileSync(settingsGradlePath, newContent);
    console.log('✓ settings.gradle corregido para monorepo');
}

// 2. Crear local.properties si no existe
function createLocalProperties() {
    const localPropertiesPath = path.join(androidDir, 'local.properties');
    if (fs.existsSync(localPropertiesPath)) {
        console.log('✓ local.properties ya existe');
        return;
    }
    
    const androidSdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 'C:\\Android\\sdk';
    const formattedPath = androidSdkPath.replace(/\\/g, '\\\\');
    fs.writeFileSync(localPropertiesPath, `sdk.dir=${formattedPath}`);
    console.log(`✓ local.properties creado con SDK: ${androidSdkPath}`);
}

// 3. Corregir build.gradle de módulos de Expo para eliminar el plugin no existente
// y agregar compileSdkVersion y safeExtGet donde sea necesario
function patchExpoModuleBuildGradle(filePath) {
    if (!fs.existsSync(filePath)) return false;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Reemplazar plugins { id 'expo-module-gradle-plugin' } por una implementación vacía
    const pluginRegex = /plugins\s*\{[^}]*id\s+['"]expo-module-gradle-plugin['"][^}]*\}/g;
    if (pluginRegex.test(content)) {
        content = content.replace(pluginRegex, `plugins {
  id 'com.android.library'
  id 'kotlin-android'
}`);
        modified = true;
    }
    
    // Agregar safeExtGet antes de android {} si no existe
    if (!content.includes('ext.safeExtGet = {')) {
        const safeExtGetDef = `// Simple helper that allows the root project to override versions declared by this library.
ext.safeExtGet = { prop, fallback ->
  rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
}

`;
        content = content.replace(/android\s*\{/, safeExtGetDef + 'android {');
        modified = true;
    }
    
    // Agregar compileSdkVersion si no existe
    if (!content.includes('compileSdkVersion')) {
        content = content.replace(
            /android\s*\{/,
            `android {
  compileSdkVersion safeExtGet("compileSdkVersion", 34)`
        );
        modified = true;
    }
    
    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✓ Corregido: ${path.basename(path.dirname(path.dirname(filePath)))}`);
    }
    
    return modified;
}

// Ejecutar parches
console.log('Aplicando parche post-prebuild para monorepo...\n');

patchSettingsGradle();
createLocalProperties();

// Corregir build.gradle de módulos de Expo
console.log('\nCorrigiendo plugins de módulos de Expo...');
const expoModules = [
    'expo',
    'expo-modules-core',
    'expo-application',
    'expo-constants',
    'expo-font',
    'expo-keep-awake',
    'expo-linking',
    'expo-router',
    'expo-splash-screen',
    'expo-status-bar',
    'expo-system-ui',
    'expo-calendar',
    'expo-notifications'
];

let patchedCount = 0;
expoModules.forEach(module => {
    const buildGradlePath = path.join(rootNodeModules, module, 'android', 'build.gradle');
    if (patchExpoModuleBuildGradle(buildGradlePath)) {
        patchedCount++;
    }
});

// Corrección adicional para expo-modules-core (components.release)
const expoModulesCoreGradle = path.join(rootNodeModules, 'expo-modules-core', 'android', 'build.gradle');
if (fs.existsSync(expoModulesCoreGradle)) {
    let coreContent = fs.readFileSync(expoModulesCoreGradle, 'utf8');
    if (coreContent.includes('from components.release') && !coreContent.includes('components.findByName')) {
        coreContent = coreContent.replace(
            /afterEvaluate\s*\{\s*publishing\s*\{/,
            `afterEvaluate {
    if (plugins.hasPlugin('maven-publish') && components.findByName('release')) {
      publishing {`
        );
        fs.writeFileSync(expoModulesCoreGradle, coreContent);
        console.log('✓ Corregido: expo-modules-core (components.release)');
    }
}

console.log(`\n✓ Se corrigieron ${patchedCount} módulos de Expo`);
console.log('\n¡Parcheo completado! Ahora puedes ejecutar:');
console.log('  cd apps/mobile/android && .\\gradlew :app:bundleRelease');
