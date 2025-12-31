# 🚀 Guía de Despliegue - Electromecánica JR

Esta guía te llevará paso a paso para desplegar la aplicación en producción usando **Vercel** y **Supabase**.

---

## 📋 Requisitos Previos

- [ ] Cuenta en [Vercel](https://vercel.com) (gratis)
- [ ] Cuenta en [Supabase](https://supabase.com) (gratis)
- [ ] Proyecto en GitHub (opcional pero recomendado)

---

## 🗄️ PASO 1: Configurar Supabase (Base de Datos)

### 1.1 Crear Proyecto en Supabase

1. Ve a https://supabase.com/dashboard
2. Click en **"New Project"**
3. Completa los datos:
   - **Name**: `electromecanica-jr`
   - **Database Password**: Guarda esta contraseña (la necesitarás)
   - **Region**: South America (São Paulo) - más cercano a Chile
4. Click en **"Create new project"**
5. Espera 2-3 minutos mientras se crea el proyecto

### 1.2 Ejecutar Scripts SQL

1. En tu proyecto de Supabase, ve a **SQL Editor** (menú izquierdo)
2. Click en **"New query"**
3. Copia y pega el contenido completo de `supabase/schema.sql`
4. Click en **"Run"** (o presiona Ctrl+Enter)
5. Deberías ver: ✅ "Success. No rows returned"

### 1.3 Crear Usuarios de Autenticación

1. Ve a **Authentication** > **Users** (menú izquierdo)
2. Click en **"Add user"** > **"Create new user"**
3. Crea el usuario Admin:
   - **Email**: `admin@electromecanicajr.cl`
   - **Password**: (elige una contraseña segura)
   - **Auto Confirm User**: ✅ Activado
4. Click en **"Create user"**
5. **IMPORTANTE**: Copia el **UUID** del usuario (lo necesitarás)
6. Repite para crear el usuario Mecánico:
   - **Email**: `mecanico@electromecanicajr.cl`
   - **Password**: (elige una contraseña segura)
   - **Auto Confirm User**: ✅ Activado
7. Copia también el UUID del mecánico

### 1.4 Actualizar Perfiles con UUIDs Reales

1. Ve a **SQL Editor** nuevamente
2. Ejecuta este SQL (reemplaza los UUIDs con los que copiaste):

```sql
-- Eliminar perfiles de ejemplo
DELETE FROM perfiles;

-- Insertar perfiles con UUIDs reales de Auth
INSERT INTO perfiles (id, email, nombre_completo, rol, activo) VALUES
    ('UUID-DEL-ADMIN-AQUI', 'admin@electromecanicajr.cl', 'Administrador', 'admin', true),
    ('UUID-DEL-MECANICO-AQUI', 'mecanico@electromecanicajr.cl', 'Mecánico Principal', 'mecanico', true);
```

3. Click en **"Run"**

### 1.5 (Opcional) Agregar Datos de Prueba

1. En **SQL Editor**, ejecuta el contenido de `supabase/seed.sql`
2. Esto agregará vehículos de prueba (PROFE1, BBBB10, TEST01)

### 1.6 Obtener Credenciales de Supabase

1. Ve a **Settings** > **API** (menú izquierdo)
2. Copia estos valores (los necesitarás para Vercel):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (es una clave larga)

---

## 🌐 PASO 2: Desplegar en Vercel

### 2.1 Conectar Proyecto a Vercel

**Opción A: Desde GitHub (Recomendado)**

1. Sube tu código a GitHub si aún no lo has hecho
2. Ve a https://vercel.com/dashboard
3. Click en **"Add New"** > **"Project"**
4. Selecciona tu repositorio de GitHub
5. Click en **"Import"**

**Opción B: Desde CLI de Vercel**

```bash
npm install -g vercel
vercel login
vercel
```

### 2.2 Configurar Variables de Entorno en Vercel

1. En tu proyecto de Vercel, ve a **Settings** > **Environment Variables**
2. Agrega las siguientes variables:

| Variable | Valor | Entorno |
|----------|-------|---------|
| `NEXT_PUBLIC_STORAGE_MODE` | `supabase` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | Tu URL de Supabase | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon key de Supabase | Production, Preview, Development |
| `NEXT_PUBLIC_GETAPI_KEY` | Tu API key de GetAPI | Production, Preview, Development |

**Ejemplo:**
```
NEXT_PUBLIC_STORAGE_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_GETAPI_KEY=b5e1f8a2-c3d4-4e9b-9a1c-7f0b2d3e4f5a
```

3. Click en **"Save"** para cada variable

### 2.3 Redesplegar

1. Ve a **Deployments** en tu proyecto de Vercel
2. Click en los tres puntos (...) del último deployment
3. Click en **"Redeploy"**
4. Espera 1-2 minutos

### 2.4 Configurar Dominio (Ya tienes uno)

Tu app ya está en: `https://electromecanicajr.vercel.app`

Si quieres un dominio personalizado:
1. Ve a **Settings** > **Domains**
2. Agrega tu dominio personalizado
3. Sigue las instrucciones de DNS

---

## 🔑 PASO 3: Configurar GetAPI (Opcional)

### Para Desarrollo/Prueba (Gratis)
Ya tienes la API key de prueba configurada en el código.

### Para Producción (Pago)

1. Ve a https://getapi.cl
2. Selecciona un plan y realiza el pago
3. Recibirás tu API key por email
4. En Vercel, actualiza la variable `NEXT_PUBLIC_GETAPI_KEY` con tu nueva key
5. Redesplega la aplicación

---

## ✅ PASO 4: Verificar el Despliegue

### 4.1 Probar Login

1. Ve a `https://electromecanicajr.vercel.app`
2. Intenta iniciar sesión con:
   - **Email**: `admin@electromecanicajr.cl`
   - **Password**: (la que configuraste en Supabase)

### 4.2 Probar Funcionalidades

- [ ] Login funciona correctamente
- [ ] Dashboard muestra estadísticas
- [ ] Crear nueva orden en Recepción
- [ ] Buscar patente (prueba con PROFE1, BBBB10, TEST01)
- [ ] Ver orden creada en lista de órdenes
- [ ] Editar precio final (solo admin)
- [ ] Marcar orden como "Lista"
- [ ] Generar boleta/ticket
- [ ] Descargar PDF de orden
- [ ] Subir fotos del vehículo

---

## 🐛 Solución de Problemas

### Error: "Failed to fetch"
- Verifica que las variables de entorno en Vercel estén correctas
- Asegúrate de que `NEXT_PUBLIC_STORAGE_MODE=supabase`
- Redesplega después de cambiar variables

### Error: "Invalid API key"
- Verifica que copiaste correctamente el `anon key` de Supabase
- No uses el `service_role` key (es inseguro en el frontend)

### No puedo iniciar sesión
- Verifica que creaste los usuarios en Supabase Auth
- Verifica que los UUIDs en la tabla `perfiles` coincidan con los de Auth
- Revisa que el email sea exactamente el mismo

### Las órdenes no se guardan
- Verifica que RLS (Row Level Security) esté configurado correctamente
- Ejecuta nuevamente el script `schema.sql` completo

### La búsqueda de patentes no funciona
- Si GetAPI no responde, el sistema usará datos locales automáticamente
- Verifica que la API key de GetAPI sea válida
- Revisa la consola del navegador para ver errores

---

## 📊 Monitoreo y Mantenimiento

### Ver Logs en Vercel
1. Ve a tu proyecto en Vercel
2. Click en **"Logs"** (menú superior)
3. Aquí verás todos los errores y requests

### Ver Datos en Supabase
1. Ve a **Table Editor** en Supabase
2. Selecciona la tabla que quieres ver (ordenes, vehiculos, etc.)
3. Puedes editar datos directamente aquí si es necesario

### Backups Automáticos
Supabase hace backups automáticos diarios. Para restaurar:
1. Ve a **Database** > **Backups**
2. Selecciona el backup que quieres restaurar

---

## 🔐 Seguridad

### Cambiar Contraseñas de Usuarios
1. Ve a Supabase > **Authentication** > **Users**
2. Click en el usuario
3. Click en **"Reset Password"**
4. Envía el link de reset al usuario

### Revocar Acceso
1. Ve a Supabase > **Authentication** > **Users**
2. Click en el usuario
3. Click en **"Delete user"**

### Rotar API Keys
Si crees que tu API key fue comprometida:
1. Ve a Supabase > **Settings** > **API**
2. Click en **"Rotate keys"**
3. Actualiza las variables en Vercel
4. Redesplega

---

## 📈 Próximos Pasos

Una vez desplegado, puedes:

1. **Agregar más usuarios**
   - Ve a Supabase Auth y crea más mecánicos

2. **Personalizar dominio**
   - Configura tu propio dominio en Vercel

3. **Configurar emails**
   - Configura SMTP en Supabase para enviar emails de reset de contraseña

4. **Monitorear uso**
   - Revisa el uso de Supabase y Vercel regularmente
   - Ambos tienen planes gratuitos generosos

5. **Actualizar la app**
   - Haz cambios en tu código
   - Push a GitHub
   - Vercel desplegará automáticamente

---

## 📞 Soporte

- **Vercel**: https://vercel.com/support
- **Supabase**: https://supabase.com/support
- **GetAPI**: contacto@getapi.cl

---

## ✨ ¡Listo!

Tu aplicación ahora está en producción en:
**https://electromecanicajr.vercel.app**

Con base de datos real en Supabase y lista para usar. 🎉
