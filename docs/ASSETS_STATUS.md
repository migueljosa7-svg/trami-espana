# Trami España — Estado de los Assets Gráficos (FASE 7.1)

> Estado claro de cada asset: qué es placeholder y qué es definitivo.
> Los PNG actuales son válidos técnicamente (dimensiones correctas) pero son **placeholders de color
> de marca**, NO diseño profesional terminado.

## Web (`apps/web/public` — favicon)
- `favicon.svg` — 64×64 — ⚠️ **PLACEHOLDER** (color de marca `#2563eb`). Se prefiere SVG sobre PNG para web.

## Mobile (`apps/mobile/assets`)
| Archivo | Dimensiones reales | Referencia en `app.json` | Estado |
|---|---|---|---|
| `icon.png` | 1024×1024 | `expo.icon` | ⚠️ **PLACEHOLDER** |
| `adaptive-icon.png` | 1024×1024 | `android.adaptiveIcon.foregroundImage` | ⚠️ **PLACEHOLDER** (bg `#2563eb`) |
| `splash.png` | 1000×2000 | `expo.splash` (resizeMode contain, bg `#2563eb`) | ⚠️ **PLACEHOLDER** |
| `favicon.png` | 64×64 | `expo.web.favicon` | ⚠️ **PLACEHOLDER** (web) |

## Qué se mantuvo / por qué
- Se mantienen los **colores de marca actuales** (`#2563eb` azul) sin inventar una identidad nueva.
- No se genera un logo complejo (requiere diseño humano).
- Los tamaños son válidos para Expo/Android (icono/adaptive/splash) y web (favicon).

## Pendiente de decisión humana (diseño definitivo)
- Logo/identidad definitiva.
- Feature graphic (1024×500) para Play Console.
- Capturas de pantalla de la app (móvil/tablet).
- Sustituir splash por versión final.

> Ver también `docs/PLAY_STORE_FINAL_CHECKLIST.md` (§ 5 Materiales gráficos).
