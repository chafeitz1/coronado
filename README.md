# Casa Coronado

Herramienta de mantenimiento para la casa de playa: tareas (puntuales o recurrentes), activos, proveedores y notificaciones — reemplazo casero de MaintainX.

**Stack**: Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS) + Web Push + Resend. Pensado para desplegarse gratis en Vercel + Supabase.

## Roles

| Rol | Puede |
|---|---|
| **owner** | Todo: activos, tareas (puntuales o recurrentes), proveedores, invitar personal/familia, configurar notificaciones |
| **family** | Ver todas las tareas, crear tareas puntuales (nunca recurrentes) |
| **staff** | Ver y atender las tareas que se le asignan (cambiar estado, agregar notas) |
| *(proveedores)* | No tienen cuenta — solo quedan en el directorio de `/vendors` como referencia |

## 1. Crear el proyecto de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (tier gratuito alcanza).
2. En el SQL Editor, corre **todos** los archivos de `supabase/migrations/` en orden (`0001_...`, `0002_...`, etc.). Esto crea todas las tablas, políticas de RLS y triggers.
3. En **Authentication → Providers**, deja habilitado Email/Password.
4. El **primer usuario que se registre** se vuelve automáticamente `owner` (ver trigger `handle_new_user` en la migración). Créalo desde **Authentication → Users → Add user** con tu email, o regístrate desde `/login` si habilitas signup público temporalmente.
5. Copia `Project URL`, `anon public key` y `service_role key` desde **Settings → API**.

## 2. Variables de entorno

Copia `.env.example` a `.env.local` y llena:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — de Supabase.
- `NEXT_PUBLIC_APP_URL` — URL pública de la app (para links en emails).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — genera con `npx web-push generate-vapid-keys`. Necesarias para que funcionen las notificaciones push.
- `RESEND_API_KEY` / `NOTIFICATIONS_FROM_EMAIL` — crea una cuenta gratis en [resend.com](https://resend.com) y verifica un dominio (o usa su dominio de pruebas mientras tanto).

## 3. Correr en desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Inicia sesión con el usuario `owner` que creaste en Supabase.

## 4. Invitar a familia y personal

Desde `/admin/staff` (solo visible para el owner):

- Invita por email con nombre y rol (`family` o `staff`). Se les crea el registro de perfil automáticamente cuando aceptan la invitación (trigger `handle_new_user`, que lee `full_name`/`role` de los metadatos de la invitación).
- Ahí mismo puedes activar/desactivar push y email por tipo de evento, por cada persona de `staff`.
- Arriba, en "Tus notificaciones", controlas si te llega un email cuando alguien marca una nota como importante (🔔 en una tarea).

> Nota técnica: la invitación usa `supabase.auth.admin.inviteUserByEmail`, que envía un correo de Supabase con un link para poner contraseña. Si prefieres otro flujo de invitación, ajusta la plantilla de email en **Authentication → Email Templates** de tu proyecto Supabase.

## 5. Notificaciones push (web)

Funcionan sin costo vía Web Push del navegador (service worker en `public/sw.js`). Cada usuario debe darle clic a "🔕 Activar notificaciones" en la barra superior una vez, desde su celular o computadora, para suscribir ese dispositivo.

**Importante en iPhone**: Safari solo entrega push si la PWA fue instalada ("Compartir → Agregar a inicio"), no si solo abren el link en el navegador. En Android funciona directo desde Chrome sin instalar nada.

## 6. Tareas recurrentes

No hay un módulo aparte de "mantenimiento preventivo": al crear una tarea, el owner puede marcarla como recurrente (ej. "cada 3 meses"). Cuando esa tarea se marca como hecha, la app crea automáticamente la siguiente ocurrencia con la fecha límite avanzada — no depende de ningún cron.

## 7. Perfil de usuario

Cada usuario (dueño, familia o personal) puede entrar a `/profile` haciendo clic en su nombre abajo del menú lateral, para: editar su nombre/teléfono, cambiar su contraseña y subir una foto de perfil. Las fotos se guardan en el bucket `avatars` de Supabase Storage (público para lectura, cada usuario solo puede escribir dentro de su propia carpeta). Ese bucket y sus políticas se crean automáticamente al correr la migración `0006_user_profiles.sql` — no requiere pasos manuales en el dashboard de Supabase.

## 8. Activos

Cada activo (A/C, bomba de piscina, electrodoméstico, etc.) puede llevar marca, modelo, número de serie, un proveedor preferido (para saber a quién llamar) y fotos. Las fotos se guardan en el bucket `attachments` de Supabase Storage, creado junto con esas columnas en la migración `0008_assets_complete.sql`. La página de cada activo muestra su historial de mantenimiento (tareas ya hechas) y los próximos mantenimientos programados (tareas abiertas o recurrentes), y en el listado se avisa cuando una garantía está por vencer o ya venció.

## 9. Desplegar

1. Sube el repo a GitHub y conéctalo en [vercel.com/new](https://vercel.com/new).
2. Agrega todas las variables de `.env.example` en Vercel (Project Settings → Environment Variables).
3. Deploy.

## Pendiente / próximas fases

- **Fase 2 (pendiente)**: control de planilla del personal y días libres.
- Iconos propios para el manifest PWA (`public/manifest.json` usa el favicon por ahora — para una instalación más pulida en el celular conviene agregar `icon-192.png` / `icon-512.png` y un `apple-touch-icon`).
- **Type-safe Supabase queries**: los clientes de Supabase (`src/lib/supabase/*.ts`) no están tipados con `Database` todavía porque el generador de tipos de postgrest-js necesita un proyecto real para resolver relaciones (`supabase gen types typescript --project-id <id> > src/lib/types/database.ts`). Una vez que exista el proyecto, se puede pasar `<Database>` a `createBrowserClient`/`createServerClient`/`createClient` para autocompletar y validar las queries.
- Adjuntar fotos a tareas (ya funciona para activos — falta extender el mismo flujo de subida a las tareas).
