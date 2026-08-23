# Trami España — Google Play: Check List Final de Publicación (FASE 7.1)

> **ESTADO (FASE 11, re-verificación 2026-08-23): TODO LO TÉCNICO ESTÁ CERRADO Y VERIFICADO.**
> El AAB release está generado, firmado y validado (`jarsigner` + `bundletool dump manifest`);
> los assets de Play existen con dimensiones exactas; los textos de listing están redactados
> (`PLAY_STORE_LISTING.md` §1.1). Solo quedan acciones humanas: crear/acceder a la cuenta de
> Google Play Console, registrar/confirmar el dominio definitivo y aportar los datos legales
> reales (`docs/LEGAL_DATA_REQUIRED.md`). No rellenar campos con datos inventados.
>
> Referencia de datos reales de la app: `docs/GOOGLE_PLAY_DATA_SAFETY.md`, `apps/mobile/app.json`.

---

## 1. Identidad de la app

| Item | Valor | Estado |
|---|---|---|
| Nombre | Trami España | ✅ Definido |
| Short description (≤80) | ✅ Redactada (78 car.) — texto final en `PLAY_STORE_LISTING.md` §1.1 | ✅ FASE 11 |
| Full description | ✅ Redactada — texto final en `PLAY_STORE_LISTING.md` §1.1 | ✅ FASE 11 |
| Categoría recomendada | `Productivity` o `Reference` | ⏳ decisión humana |
| Default language | Español (es-ES) | ✅ |
| **Package name** | `es.tramiespana.app` | ✅ (app.json) |
| **Version** | `1.0.0` | ✅ release |
| **versionCode** | `1` | ✅ (app.json) |
| Sitio web | ⏳ dominio definitivo pendiente de registro/confirmación por el titular | EXTERNAL_BLOCKER_DOMAIN |
| **Privacy Policy URL** | `[PENDIENTE: URL pública definitiva — requiere dominio real]` | ⏳ EXTERNAL_BLOCKER_DOMAIN |

## 2. Segmento de prueba (testing)

- [ ] Crear **testers internos** (Internal Testing track) y subir un AAB de prueba.
- [ ] Validar registro, favoritos, recordatorios, asistente y **eliminación de cuenta**.
- [ ] Probar con al menos un dispositivo físico Android (no sólo emulador).
- [ ] Revisar la navegación a las páginas legales desde Perfil.

## 3. Contenido y clasificación

- [ ] Contestar el cuestionario IARC (contenido administrativo; sin violencia/sexualidad).
- [ ] Confirmar público objetivo (general / adultos). El servicio está pensado para **mayores de 14 años** (ver privacidad).

## 4. Data Safety (ver `docs/GOOGLE_PLAY_DATA_SAFETY.md`)

- [ ] Declarar: Email, Nombre (opcional), User IDs, App activity (favoritos/recordatorios/consultas), contenido del usuario.
- [ ] Marcar "No" a ads y al resto de categorías de datos.
- [ ] Indicar `No` compartir datos; cifrado en tránsito `Sí`; usuario puede solicitar eliminación `Sí`.

## 5. Materiales gráficos (assets)

| Asset | Requisito | Estado |
|---|---|---|
| Icono 512×512 | PNG/JPG, ≤1 MB | ✅ Generado: `docs/play-assets/icon-512.png` (branding provisional #2563eb) |
| Adaptive icon | foreground + bg `#2563eb` | ✅ Existente en la app (`apps/mobile/assets/adaptive-icon.png`) |
| **Feature graphic** 1024×500 | — | ✅ Generado: `docs/play-assets/feature-graphic-1024x500.png` |
| Phone screenshots (2–8) | ratio ≤ 2:1 | ✅ 7 generadas: `docs/play-assets/screenshots/play/` (1080×1920, app real en emulador API 34 vía deep links) |
| 7" tablet screenshots | opcional | ⏳ Opcional, no generado |
| 10" tablet screenshots | opcional | ⏳ Opcional, no generado |

> Las capturas muestran pantallas reales de la aplicación (inicio, buscar, asistente,
> favoritos, recordatorios, perfil y ficha del trámite publicado). El material original
> 1080×2340 queda en `screenshots/source/` (NO conforme al ratio de Play; subir solo `play/`).

## 6. Construcción

> **ACTUALIZADO (FASE FINAL, 2026-08-23 tarde):** el AAB de producción **está generado, firmado y
> verificado** con **targetSdk 36 (Android 16)**: `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`
> (30.322.553 bytes ≈ 28,9 MB), package `es.tramiespana.app`, versionCode 1, versionName 1.0.0,
> minSdk 23, compileSdk 36.
> **SHA-256:** `C314B8A857F0F79A2D647FA8D02E5845E562C4BAC85675C613518865D1ADAF51`
> Firma: upload key local `apps/mobile/android/app/tramiespana-upload.keystore`
> (credenciales en `apps/mobile/android/keystore.properties`, ambos gitignored).
> `jarsigner -verify` → **"jar verified."** (SHA256withRSA 2048-bit; cert válido hasta 2054-01-07;
> warnings PKIX/self-signed esperables en upload keys).
>
> **Corrección crítica incluida en este AAB:** el desugaring (`desugar_jdk_libs`) por sí solo NO
> evitaba el crash `NoSuchMethodError: List.removeLast()` de react-native-screens 3.29.0 en
> Android < API 35 (reproducido realmente en emulador API 34). La solución definitiva es el parche
> fuente idempotente en `scripts/postinstall-expo-cli-win-fix.js`
> (`ScreenStack.kt`: `removeLast()` → `removeAt(size - 1)`), ya aplicado y recompilado en este AAB.
>
> **E2E real verificado sobre este build** (emulador API 34 / Android 14): instalación limpia,
> cero entradas `AndroidRuntime:E`, proceso vivo, MainActivity en primer plano, deep link
> `tramiespana://` OK, back/relaunch estables, sin errores JS ni ANR.

- [x] **AAB** de producción generado localmente: `cd apps/mobile/android && ./gradlew bundleRelease`
      (requiere JDK 17, Android SDK 34+36 + build-tools 36.0.0 + NDK 25.1.8937393 y licencias aceptadas).
- [x] Signing configurado vía `keystore.properties` (fallback seguro a debug si no existe).
- [x] `versionCode` 1 / `versionName` 1.0.0 verificados en el AAB generado.
- [ ] Alternativa en la nube: `npx eas build --platform android --profile production`
      (requiere login EAS humano + variables `EXPO_PUBLIC_*`; ver sección EAS de este doc).
- [ ] Al crear la app en Play Console: usar **Play App Signing** (recomendado) y conservar
      la upload key en un lugar seguro. Si se pierde, solicitar reset a Google.
- [ ] Subir el AAB a Internal Testing (acción humana en Play Console).

## 7. Privacidad / legal enlazados

- [ ] URL pública de Política de privacidad (web) enlazada.
- [ ] URL pública de Términos y condiciones enlazada.
- [ ] Correo de contacto **verificado** enlazado.
- [ ] Página de contacto pública funcionando.
- [ ] Datos legales reales completados (ver `docs/LEGAL_DATA_REQUIRED.md`).

## 8. Pre-lanzamiento final

- [ ] Prueba completa del flujo legal web + móvil.
- [ ] `npm run build --workspace=apps/web` correcto.
- [ ] typecheck/lint/test verdes (FASE 7.1).
- [ ] Revisión jurídica final (no sustituida por esta auditoría técnica).
- [ ] Rollout: testing interno → closed testing → producción (progressive).

---

## Orden sugerido de ejecución
1. Completar datos legales reales (`LEGAL_DATA_REQUIRED.md`).
2. Aplicar migración de borrado de cuenta y probar.
3. Diseñar assets definitivos y feature graphic.
4. Subir AAB a Internal Testing.
5. Rellenar listing, Data Safety, clasificación, enlaces.
6. Revisión jurídica → producción.
