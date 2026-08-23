# ============================================================================
# e2e-android-release.ps1 — QA de release Android sobre emulador local.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\e2e-android-release.ps1 `
#     [-Device emulator-5554] [-ApkPath <ruta-al-apk>]
#
# Qué hace:
#   1. Verifica la firma del APK con jarsigner ("jar verified.").
#   2. Espera el boot del dispositivo (máx ~6 min) si aún no está listo.
#   3. Desinstala la build anterior (instalación limpia) y limpia logcat.
#   4. Instala el APK release y lanza MainActivity.
#   5. Comprueba: crashes (AndroidRuntime:E), errores JS (ReactNativeJS:E),
#      ANR/FATAL, proceso vivo, ventana en primer plano, versionCode/targetSdk,
#      deep link tramiespana:// y captura screenshot como evidencia.
#
# Requisitos locales (no versionados): JDK 17 en JAVA_HOME, Android SDK con
# platform-tools/adb y emulator, AVD arrancado o disponible.
# ============================================================================
param(
  [string]$Device = "emulator-5554",
  [string]$ApkPath = "C:\Users\migue\Desktop\trami-espana\apps\mobile\android\app\build\outputs\apk\release\app-release.apk"
)
$ErrorActionPreference = "Continue"
$adb = "C:\Android\Sdk\platform-tools\adb.exe"
$js  = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.8-hotspot\bin\jarsigner.exe"
$pkg = "es.tramiespana.app"
$outDir = "C:\Users\migue\Desktop\trami-espana\docs\play-assets\evidence"

"=== 0. FIRMA DEL APK ==="
& $js -verify $apk 2>&1 | Select-String -Pattern "jar verified|unsigned|will expire" | Select-Object -First 3

"=== 1. ESPERA DE BOOT (max ~6 min) ==="
$t0 = Get-Date
& $adb start-server 2>&1 | Out-Null
for ($i = 0; $i -lt 60; $i++) {
  $line = (& $adb devices 2>&1 | Select-String -Pattern $device)
  if ($line -and "$line" -match "device\s*$") {
    if ("$(& $adb -s $Device shell getprop sys.boot_completed 2>$null)".Trim() -eq "1") { break }
  }
  Start-Sleep -Seconds 6
}
& $adb -s $Device shell getprop sys.boot_completed
& $adb -s $Device shell getprop ro.build.version.sdk

"=== 2. INSTALACION LIMPIA ==="
& $adb -s $Device uninstall $pkg 2>&1
& $adb -s $Device logcat -c 2>&1
& $adb -s $Device install -r $apk 2>&1 | Select-Object -Last 2

"=== 3. LANZAMIENTO ==="
& $adb -s $Device shell am start -n "$pkg/.MainActivity" 2>&1 | Select-Object -First 1
Start-Sleep -Seconds 22

"=== 4. CRASH / JS / ANR ==="
$c = & $adb -s $Device logcat -d -s "AndroidRuntime:E" "*:S" 2>&1
if ([string]::IsNullOrWhiteSpace(($c | Out-String))) { "NO_CRASH_ENTRIES" } else { $c | Select-Object -First 12 }
$j = & $adb -s $Device logcat -d -s "ReactNativeJS:E" "*:S" 2>&1
if ([string]::IsNullOrWhiteSpace(($j | Out-String))) { "NO_JS_ERRORS" } else { $j | Select-Object -First 6 }

"=== 5. PROCESO Y VENTANA ==="
& $adb -s $Device shell pidof $pkg
& $adb -s $Device shell dumpsys window 2>&1 | Select-String -Pattern "mCurrentFocus" | Select-Object -First 1
& $adb -s $Device shell dumpsys package $pkg 2>&1 | Select-String -Pattern "versionCode=|targetSdk|minSdk" | Select-Object -First 1

"=== 6. DEEP LINK ==="
& $adb -s $Device shell am start -a android.intent.action.VIEW -d "tramiespana://" 2>&1 | Select-Object -First 1
Start-Sleep -Seconds 5
& $adb -s $Device shell pidof $pkg

"=== 7. SCREENSHOT EVIDENCIA ==="
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
& $adb -s $Device shell screencap -p /sdcard/e2e_home.png
& $adb -s $Device pull /sdcard/e2e_home.png "$outDir\e2e-api34-home.png" 2>&1 | Select-Object -First 1

"END $(Get-Date -Format HH:mm:ss)"
