# Migración futura a Expo SDK 52+ / React Native 0.76+ (soporte 16 KB)

> **Estado actual:** la app v1.3.3 (`versionCode 30`) se publica y **funciona** en
> Android 15/16, pero NO cumple el requisito de Google Play de páginas de memoria
> de 16 KB. Este documento explica por qué y cuál es el camino para cumplirlo.
>
> **No es una tarea urgente:** el requisito afecta al *rendimiento* en dispositivos
> con páginas de 16 KB, no a la instalación ni al funcionamiento de la app.

---

## 1. Qué exige Google Play

Desde Android 15, los dispositivos pueden usar páginas de memoria de 16 KB. Para no
perder rendimiento (y ofrecer soporte completo), Google Play requiere que **todas las
librerías nativas `.so`** del paquete tengan sus segmentos ELF `PT_LOAD` alineados a
**16384 bytes**.

## 2. Estado medido de Trami España

Medido con la herramienta versionada del monorepo:

```bash
npm run verify:16kb
```

Resultado en v1.3.3 / `versionCode 30`:

| ABI | `.so` sin alinear | Total | Arquitectura |
|-----|------------------|-------|--------------|
| `arm64-v8a`    | 62 | 62 | ELF64 |
| `x86_64`       | 62 | 62 | ELF64 |
| `armeabi-v7a`  | 0  | 62 | ELF32 |
| `x86`          | 0  | 62 | ELF32 |

**Total: 124/248 librerías no conformes** (todas las de 64 bits, con `p_align = 4096`).

Las de 32 bits ya son conformes, pero son irrelevantes: `arm64-v8a` cubre prácticamente
todos los móviles Android actuales.

## 3. Por qué NO se puede resolver con flags de Gradle

Es importante entender esto para no volver a intentarlo:

1. **No hay código nativo propio.** El proyecto no contiene ningún `CMakeLists.txt`;
   todas las `.so` llegan **precompiladas** dentro de los AAR publicados en npm.
   Añadir `externalNativeBuild { cmake { cppFlags "-Wl,-z,max-page-size=16384" } }`
   no alinea nada.

2. **`jniLibsPageSize()` es no-op aquí.** Esa API existe solo en **AGP ≥ 8.5.1**
   (y exige **Gradle ≥ 8.7**). Este proyecto usa el AGP que fija React Native
   (`node_modules/react-native/gradle/libs.versions.toml` → **8.1.1**) con
   **Gradle 8.3**. Aunque `gradle.properties` declare `android.jniLibsPageSize=16384`,
   la llamada falla en silencio.

3. **Parchear el binario a mano es peligroso.** Subir solo `p_align` a 16384 rompe el
   `mmap`: el kernel exige `p_offset ≡ p_vaddr (mod 16384)` y hoy los segmentos están
   contiguos a 4 kB (`0xc20`, `0xe58`, …). Sin un *relink* real la app crashea al
   arrancar. **No lo intentes.**

## 4. Camino de solución

La única vía fiable es que las `.so` se compilen con `-z max-page-size=16384`, y eso
exige un **relink con NDK r27+** de los módulos nativos. Dos opciones:

### Opción A — Actualizar el framework (recomendada)
Migrar a **Expo SDK 52+ / React Native 0.76+**, que ya publican `.so` precompiladas
con alineación de 16 KB.

- ✅ Resuelve el requisito sin trabajo nativo propio
- ⚠️ Es una migración mayor: Expo Router 3 → 4, cambios en módulos nativos,
  revisión de los parches de `scripts/postinstall-expo-cli-win-fix.js`
- 📋 Planificar por fases usando las 91 pruebas actuales como red de seguridad

### Opción B — Recompilar los módulos nativos
Compilar desde fuente con NDK r27+ y `-Wl,-z,max-page-size=16384`.

- ❌ Muy frágil con RN 0.73 en flujo *managed* (prebuild)
- Solo recomendable si la Opción A no es viable

### Nota sobre la toolchain
Migrar a Expo SDK 52+ arrastra además AGP 8.5.1+ / Gradle 8.7+ / NDK r27+, lo que
**además** hace funcional `android.jniLibsPageSize()` y alinea la capa de empaquetado
del bundle. Ambas cosas van de la mano.

## 5. Verificación permanente

La auditoría está automatizada y versionada en el monorepo:

```bash
# Resultado legible + código de salida 0 (conforme) / 1 (no conforme)
npm run verify:16kb

# Salida JSON para integraciones
node scripts/verify-16kb-page-size.mjs --json

# Auditar otro binario
node scripts/verify-16kb-page-size.mjs ruta/otro.aab
```

Implementación: [`scripts/verify-16kb-page-size.mjs`](../scripts/verify-16kb-page-size.mjs)
(sin dependencias externas: lee el ZIP y parsea las cabeceras ELF32/ELF64 en memoria).

> Tras la migración a Expo SDK 52+ este comando **debe devolver exit 0**. Ese es el
> criterio objetivo de aceptación de la migración.
