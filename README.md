# Trami España

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39-green)](https://supabase.com/)
[![Expo](https://img.shields.io/badge/Expo-50.0-black)](https://expo.dev/)

**Trami España** es una aplicación web y móvil que ayuda a los usuarios de España a encontrar y entender trámites administrativos de forma sencilla y clara.

## ⚠️ Aviso Legal

**Trami España es un servicio independiente y no está afiliado, patrocinado ni respaldado por ninguna administración pública.** Esta aplicación proporciona información orientativa sobre trámites administrativos. Siempre verifica la información en las fuentes oficiales.

## 📋 Características

- 🔍 **Búsqueda inteligente** de trámites administrativos
- 📱 **Diseño responsive** (web, tablet, móvil)
- 🤖 **Asistente virtual** para guiar a los usuarios
- ⭐ **Favoritos** para guardar trámites de interés
- 🔔 **Recordatorios** personalizados
- 📖 **Información detallada** de cada trámite
- 🔐 **Autenticación segura** con Supabase
- 🌙 **Diseño moderno** y accesible

## 🏗️ Arquitectura

```
trami-espana/
├── apps/
│   ├── web/                 # Aplicación web (Vite + React)
│   └── mobile/              # Aplicación móvil (Expo + React Native)
├── packages/
│   └── shared/              # Código compartido (tipos, utilidades, constantes)
├── supabase/
│   ├── migrations/          # Migraciones de base de datos
│   ├── seed.sql            # Datos de ejemplo
│   └── config.toml         # Configuración de Supabase
├── docs/                   # Documentación
```

## 🛠️ Stack Tecnológico

### Frontend Web
- **React 18** - Biblioteca UI
- **TypeScript 5** - Tipado estático
- **Vite 5** - Build tool
- **React Router 6** - Enrutamiento
- **Tailwind CSS 3** - Estilos
- **Radix UI** - Componentes accesibles
- **React Hook Form** - Gestión de formularios
- **Zod** - Validación de esquemas

### Backend
- **Supabase** - Backend as a Service
- **PostgreSQL 15** - Base de datos
- **Supabase Auth** - Autenticación
- **Row Level Security** - Seguridad a nivel de fila

### Mobile
- **Expo SDK 50** - Framework móvil
- **React Native** - UI nativa
- **Expo Router** - Navegación
- **TypeScript** - Tipado estático

### Compartido
- **Zod** - Validaciones
- **TypeScript** - Tipos compartidos

## 📦 Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Supabase CLI** (opcional, para desarrollo local)
- **Expo CLI** (opcional, para desarrollo móvil)

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd trami-espana
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

#### Opción A: Usar Supabase Cloud (Recomendado)

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a **Settings > API** y copia:
   - Project URL
   - anon/public key

#### Opción B: Desarrollo local con Supabase CLI

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Iniciar Supabase local
supabase start
```

### 4. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y completa con tus credenciales:

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```env
# Para desarrollo local con Supabase CLI
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=tu-anon-key-local

# Para Supabase Cloud
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 5. Ejecutar migraciones

#### Si usas Supabase Cloud:

```bash
# Conectar a tu proyecto
supabase link --project-ref tu-project-id

# Aplicar migraciones
supabase migration up
```

#### Si usas Supabase local:

```bash
# Las migraciones se aplican automáticamente al hacer supabase start
# O manualmente:
supabase migration up
```

### 6. Cargar datos de ejemplo (DEMO - Solo desarrollo local)

```bash
# Cargar datos demo en entorno local (NUNCA ejecutar en producción)
npx supabase db query --local -f supabase/seed.sql
```

Esto cargará los 12 trámites de ejemplo marcados como `[DEMO]` (estado `draft`) para desarrollo local.

## 💻 Desarrollo

### Desarrollo Web

```bash
npm run dev
```

La aplicación web estará disponible en `http://localhost:5173`

### Desarrollo Mobile

```bash
npm run dev:mobile
```

Escanea el código QR con la app Expo Go en tu dispositivo.

### Verificación de Tipos

```bash
npm run typecheck
```

### Linting

```bash
# Ver errores
npm run lint

# Corregir errores automáticamente
npm run lint:fix
```

### Build de Producción

```bash
# Build web
npm run build

# Build mobile
npm run build:mobile
```

## 📁 Estructura del Proyecto

### Apps

#### Web (`apps/web/`)
```
apps/web/
├── src/
│   ├── components/       # Componentes reutilizables
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── pages/           # Páginas de la aplicación
│   │   ├── Home.tsx
│   │   ├── Procedures.tsx
│   │   ├── ProcedureDetail.tsx
│   │   ├── Search.tsx
│   │   ├── Assistant.tsx
│   │   ├── Login.tsx
│   │   ├── Profile.tsx
│   │   ├── Favorites.tsx
│   │   ├── Reminders.tsx
│   │   ├── Privacy.tsx
│   │   ├── Terms.tsx
│   │   ├── Cookies.tsx
│   │   ├── Contact.tsx
│   │   └── Error.tsx
│   ├── App.tsx          # Componente principal
│   ├── main.tsx         # Punto de entrada
│   └── index.css        # Estilos globales
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

#### Mobile (`apps/mobile/`)
```
apps/mobile/
├── app/                # Pantallas (Expo Router)
│   ├── (tabs)/          # Navegación principal
│   │   ├── index.tsx      # Inicio
│   │   ├── buscar.tsx     # Buscar
│   │   ├── asistente.tsx  # Asistente IA
│   │   ├── favoritos.tsx  # Favoritos
│   │   ├── recordatorios.tsx # Recordatorios
│   │   └── perfil.tsx     # Perfil + ajustes + borrar cuenta
│   ├── procedure/
│   │   └── [slug].tsx   # Detalle de trámite
│   ├── legal/            # Pantallas legales (aviso, privacidad, términos, cookies, contacto, datos)
│   ├── login.tsx         # Inicio de sesión (móvil)
│   ├── error.tsx         # Pantalla de error
│   └── _layout.tsx       # Layout raíz (proveedores, sesión)
├── components/           # Componentes reutilizables
├── assets/               # Iconos y splash (placeholders de marca)
├── app.json             # Config Expo (package es.tramiespana.app, v1.0.0)
├── eas.json             # Perfiles de build EAS (development apk / production app-bundle)
├── package.json
└── tsconfig.json
```

### Packages

#### Shared (`packages/shared/`)
```
packages/shared/
├── src/
│   ├── index.ts         # Punto de entrada
│   ├── types.ts         # Tipos TypeScript compartidos
│   ├── utils.ts         # Utilidades
│   ├── constants.ts     # Constantes
│   ├── supabase.ts      # Cliente Supabase y tipos de BD
│   └── services/        # Servicios
│       ├── procedureService.ts
│       ├── authService.ts
│       ├── assistantService.ts
│       ├── favoriteService.ts
│       ├── reminderService.ts
│       └── accountService.ts
├── package.json
└── tsconfig.json
```

### Supabase (`supabase/`)
```
supabase/
├── config.toml          # Configuración del proyecto
├── functions/
│   └── assistant/       # Edge Function Asistente IA
├── migrations/          # Migraciones de base de datos (0000 - 0009)
└── seed.sql            # Datos de ejemplo (12 trámites DEMO)
```

## 🔒 Seguridad

### Variables de Entorno

**NUNCA** incluyas en el código:
- Service Role Key de Supabase
- API Keys de servicios externos
- Secretos o credenciales

Todas las credenciales se manejan mediante variables de entorno.

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado:
- Los usuarios solo acceden a sus propios datos (perfiles, favoritos, recordatorios)
- Los trámites publicados y verificados son accesibles públicamente
- El feedback es público de lectura
- Las tablas relacionadas (requirements, documents, steps, links) son públicas solo para trámites publicados y verificados

### Autenticación

- Email/Password (implementado)
- Google (preparado, no activo)
- Apple (preparado, no activo)

## 🎨 Diseño

### Principios de Diseño

- **Confianza**: Transparencia y claridad en toda la información
- **Simplicidad**: Interfaz intuitiva y fácil de usar
- **Segu## 🔍 SEO

- URLs limpias y semánticas
- Meta tags dinámicos
- Open Graph tags
- Datos estructurados (Schema.org)
- Sitemap.xml
- robots.txt

## 📊 Analytics

La aplicación incluye una interfaz preparada para analytics que:
- Respeta el consentimiento del usuario
- No utiliza trackers invasivos
- Cumple con RGPD

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests con coverage
npm run test:coverage
```

### Tests Implementados

- **Validación de login**: Verifica email y contraseña
- **Validación de registro**: Verifica coincidencia de contraseñas y términos
- **Validación de contraseña**: Mínimo 6 caracteres
- **Creación de favorito**: Añadir trámite a favoritos
- **Eliminación de favorito**: Quitar trámite de favoritos
- **Validación de recordatorio**: Verifica campos requeridos
- **Asistente IA**: Pruebas de integración, grounding, sanitización y manejo de errores

## 🔐 Autenticación

### Cómo probar el login

1. Asegúrate de tener Supabase configurado (ver [Configuración de Supabase](#3-configurar-supabase))
2. Inicia la aplicación web: `npm run dev`
3. Navega a `http://localhost:5173/login`
4. Regístrate con un email y contraseña (mínimo 6 caracteres)
5. Verifica tu email en la bandeja de entrada (cuando la confirmación de email esté activa en Supabase Auth)
6. Inicia sesión con las credenciales registradas

### Cómo probar favoritos

1. Inicia sesión en la aplicación
2. Navega a `http://localhost:5173/tramites`
3. Haz clic en cualquier trámite
4. En la página de detalle, haz clic en el botón "☆ Guardar"
5. Navega a `http://localhost:5173/favoritos` para ver tus trámites guardados
6. Para eliminar, haz clic en "★" en la tarjeta del favorito

### Cómo probar recordatorios

1. Inicia sesión en la aplicación
2. Navega a `http://localhost:5173/recordatorios`
3. Haz clic en "+ Nuevo recordatorio"
4. Completa el formulario (título, fecha/hora, ID del trámite)
5. El recordatorio aparecerá en la lista
6. Puedes marcarlo como completado, editarlo o eliminarlo

## 🔑 Variables de Entorno

### Web (apps/web/.env)

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### Mobile (apps/mobile/.env)

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### Qué variables son públicas

Las siguientes variables **pueden** estar en el cliente (frontend):

- `VITE_SUPABASE_URL` - URL del proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` - Clave anónima (solo lectura con RLS)
- `EXPO_PUBLIC_SUPABASE_URL` - URL del proyecto Supabase (mobile)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Clave anónima (mobile)

### Qué secretos NUNCA deben ir al cliente

- `SUPABASE_SERVICE_ROLE_KEY` - **NUNCA** en frontend
- Credenciales de base de datos
- API keys de servicios externos / LLM
- Secretos de autenticación

## 🛡️ Seguridad Implementada

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado:

| Tabla | Política |
|-------|----------|
| `profiles` | SELECT/INSERT/UPDATE del propio usuario (DELETE directo no concedido; la cuenta se elimina con el RPC `delete_my_account`) |
| `procedures` | SELECT público (solo `is_published = true AND verification_status = 'verified'`), INSERT/UPDATE/DELETE solo admin |
| `procedure_categories` | SELECT público, INSERT/UPDATE/DELETE solo admin |
| `procedure_requirements` | SELECT público (solo trámites publicados y verificados), INSERT/UPDATE/DELETE solo admin |
| `procedure_documents` | SELECT público (solo trámites publicados y verificados), INSERT/UPDATE/DELETE solo admin |
| `procedure_steps` | SELECT público (solo trámites publicados y verificados), INSERT/UPDATE/DELETE solo admin |
| `procedure_links` | SELECT público (solo trámites publicados y verificados), INSERT/UPDATE/DELETE solo admin |
| `favorites` | SELECT/INSERT/DELETE solo del usuario autenticado |
| `reminders` | SELECT/INSERT/UPDATE/DELETE solo del usuario autenticado |
| `feedback` | SELECT público, INSERT solo usuario autenticado |
| `assistant_conversations` | SELECT/INSERT/UPDATE/DELETE del propio usuario (autenticado o conversación anónima) |
| `assistant_messages` | SELECT/INSERT según pertenencia a la conversación propia (sin UPDATE/DELETE) |

> **Grants mínimos (migración `20240101000012_least_privilege_grants.sql`):** revocados
> `TRUNCATE`, `REFERENCES` y `TRIGGER` de `anon` y `authenticated` en todas las tablas
> (residuos del `GRANT ALL` inicial; TRUNCATE no está cubierto por RLS). Los privilegios
> DML listados arriba quedan alineados con las políticas RLS, y `ALTER DEFAULT PRIVILEGES`
> evita que tablas futuras hereden residuos.

### Restricciones de Base de Datos

- `favorites`: `unique(user_id, procedure_id)` — Evita favoritos duplicados
- `procedures`: `unique(slug)`; `check(scope IN ('estatal','autonómico','provincial','municipal'))`;
  `check(verification_status IN ('draft','verified','needs_review','archived'))`
- `assistant_messages`: `check(role IN ('user','assistant','system'))`
- `user_roles`: `check(role = 'admin')`; `unique(user_id, role)`

### Manejo de Errores

- Los errores de Supabase se traducen a mensajes amigables
- Nunca se exponen SQL, stack traces o secretos al usuario
- Logging controlado en desarrollo

## 📝 Convenciones de Código

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new procedure search
fix: resolve login validation issue
docs: update README
style: format code
refactor: improve component structure
test: add unit tests
chore: update dependencies
```

### Estructura de Ramas

- `main` - Producción
- `develop` - Desarrollo
- `feature/*` - Nuevas funcionalidades
- `fix/*` - Correcciones
- `hotfix/*` - Correcciones urgentes

## 🚢 Despliegue

### Web

La aplicación web se despliega automáticamente en Vercel/Netlify al hacer push a `main`.

### Mobile

Para compilar la app móvil:

```bash
# Build para Android
eas build --platform android

# Build para iOS
eas build --platform ios
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: add new feature'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Contacto

> ⚠️ **Nota**: el email y el dominio indicados a continuación son provisionales y están
> pendientes de confirmación/registro por el titular (ver `docs/LEGAL_DATA_REQUIRED.md`,
> §2). No constituyen direcciones operativas verificadas.

- **Email**: contacto@tramiespana.es *(provisional)*
- **Web**: https://tramiespana.es *(provisional, pendiente de confirmar titularidad del dominio)*

## 🙏 Agradecimientos

- A todas las administraciones públicas que hacen posible esta información
- A la comunidad open source por las herramientas utilizadas
- A los usuarios que reportan errores y sugieren mejoras

---

**Nota**: Este proyecto es un trabajo en progreso. La información de los trámites debe ser verificada y actualizada regularmente desde fuentes oficiales.