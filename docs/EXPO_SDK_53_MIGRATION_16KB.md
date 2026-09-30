# Migración futura a Expo SDK 53+ (soporte 16 KB)

> **Estado actual:** la app v1.3.4 (`versionCode 31`) es **funcional** en
> Android 15/16, pero NO cumple el requisito de páginas de memoria de 16 KB.
>
> **⚠️ CORRECCIÓN IMPORTANTE (30/09/2026):** una versión anterior de este
> documento decía que bastaba con migrar a **Expo SDK 52 / RN 0.76**. Eso es
> **INCORRECTO** y habría costado días de trabajo para acabar en el mismo
> rechazo. Ver la sección 4.

---

## 1. Qué exige Google Play

Desde el **1 de noviembre de 2025**, Google Play exige que todas las apps nuevas y
sus actualizaciones dirigidas a **Android 15+ (API 35+)** soporten páginas de
memoria de **16 KB**: todos los segmentos ELF `PT_LOAD` de las `.so` deben estar
alineados a **16384 bytes**.

Además, desde el **31 de agosto de 2025** no se pueden publicar actualizaciones con
`targetSdkVersion` inferior a 35, por lo que **no es posible eludir el requisito
bajando el target SDK**.

## 2. Estado medido de Trami España

```bash
npm run verify:16kb
```

| ABI | `.so` sin alinear | Total | Arquitectura |
|-----|------------------|-------|--------------|
| `arm64-v8a`    | 62 | 62 | ELF64 |
| `x86_64`       | 62 | 62 | ELF64 |
| `armeabi-v7a`  | 0  | 62 | ELF32 |
| `x86`          | 0  | 62 | ELF32 |

**Total: 124/248 librerías no conformes** (`p_align = 4096`).

Las afectadas coinciden con las que Expo documenta como problema conocido:
`libreactnative.so`, `libhermes.so`, `libexpo-modules-core.so`, `libexpo-av.so`,
`libexpo-gl.so`, `libc++_shared.so`…

## 3. Por qué NO se puede resolver con flags de Gradle

1. **No hay código nativo propio.** No existe ningún `CMakeLists.txt`; todas las
   `.so` llegan **precompiladas** en los AAR publicados en npm. Añadir
   `externalNativeBuild { cmake { cppFlags "-Wl,-z,max-page-size=16384" } }` no
   alinea nada.
2. **`jniLibsPageSize()` es no-op aquí.** Existe solo en **AGP ≥ 8.5.1**
   (Gradle ≥ 8.7). Este proyecto usa el AGP que fija React Native (**8.1.1**)
   con **Gradle 8.3**.
3. **Parchear el binario a mano es peligroso.** Subir solo `p_align` a 16384 rompe
   el `mmap`: el kernel exige `p_offset ≡ p_vaddr (mod 16384)` y hoy los segmentos
   son contiguos a 4 kB. Sin un *relink* real la app crashea al arrancar.

## 4. ⚠️ Versión mínima correcta: Expo SDK 53 (no 52)

Según la guía oficial de Expo
([`expo/fyi/android-16kb-page-sizes.md`](https://github.com/expo/fyi/blob/main/android-16kb-page-sizes.md)):

> *"React Native supports 16KB page sizes since version **0.77**. You need to
> upgrade to an Expo SDK that includes React Native 0.77, which means **Expo SDK 53**."*

| SDK Expo | React Native | ¿16 KB? |
|----------|--------------|---------|
| 50 (actual) | 0.73 | ❌ |
| 51 | 0.74 | ❌ |
| **52** | **0.76** | **❌ NO cumple** |
| **53+** | **0.79** | ✅ (con `expo@>=53.0.14`) |

Requisito adicional: **`expo@>=53.0.14`** (publicado tras los fixes
[expo#37446](https://github.com/expo/expo/pull/37446) y
[expo#37454](https://github.com/expo/expo/pull/37454)).

Comando de actualización:

```bash
npx expo install --fix     # tras instalar expo@^53.0.14
```

### Coste real de la migración

No es un salto directo: de **SDK 50 → 53** hay **tres versiones mayores** de SDK y
seis minors de React Native (0.73 → 0.79). Entre los cambios previsibles:

- **Expo Router 3 → 4** (cambios en navegación y tipado de rutas)
- Reemplazo de librerías nativas de terceros (`expo-av`, `expo-gl` obsoletos)
- Revisión de los parches de `scripts/postinstall-expo-cli-win-fix.js`
  (parchea Kotlin de `expo-modules-core` y `react-native-screens`: **cambiarán**)
- Regeneración de `android/` con **AGP 8.5.1+ / Gradle 8.7+ / NDK r27+**
- Re-firma con la **misma clave de subida** (obligatorio: Play no admite cambiarla)

> ⚠️ **La clave de firma (`release.jks`) vive dentro de `android/app/`, que está
> gitignorado.** `npx expo prebuild --clean` la **destruye**. Hacer copia de
> seguridad antes de cualquier prebuild y restaurarla después.

## 5. Alternativa: pedir prórroga a Google Play

Google permite **ampliar el plazo** del requisito. Si la migración no es viable
ahora, esta es la vía oficial:

> Play Console → *Configuración de la app* → **App content** / elegibilidad →
> sección de requisitos de Android 15 / 16 KB → solicitar extensión.

*(El plazo anunciado por Google para la extensión era el **31 de mayo de 2026**;
comprueba en la consola si sigue disponible.)*

## 6. Verificación permanente

```bash
npm run verify:16kb                              # exit 0 = conforme
node scripts/verify-16kb-page-size.mjs --json    # salida JSON
node scripts/verify-16kb-page-size.mjs otro.aab  # otro binario
```

Implementación: [`scripts/verify-16kb-page-size.mjs`](../scripts/verify-16kb-page-size.mjs)
(sin dependencias: lee el ZIP y parsea las cabeceras ELF32/ELF64 en memoria).

CI: `.github/workflows/16kb-page-size-audit.yml` (no bloqueante; semanal + manual).

> **Criterio de aceptación de la migración:** tras completar el salto a
> Expo SDK 53+ con `expo@>=53.0.14`, este comando **debe devolver exit 0**.
