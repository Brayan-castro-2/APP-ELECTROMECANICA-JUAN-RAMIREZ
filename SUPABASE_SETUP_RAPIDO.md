# 🚀 Configuración Rápida de Supabase

## ⚡ Pasos (5 minutos)

### 1. Ejecutar SQL en Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Click en **SQL Editor** (menú izquierdo)
3. Click en **New query**
4. Copia y pega TODO el contenido de `supabase/setup-simple.sql`
5. Click en **Run** (o Ctrl+Enter)
6. Deberías ver: ✅ "Success. No rows returned"

### 2. Crear Usuarios en Authentication

1. Ve a **Authentication** > **Users**
2. Click en **Add user** > **Create new user**

**Usuario Admin:**
- Email: `admin@electromecanicajr.cl`
- Password: `Admin123!` (o la que prefieras)
- ✅ Auto Confirm User: Activado
- Click **Create user**
- **COPIA EL UUID** del usuario (lo necesitarás)

**Usuario Mecánico:**
- Email: `mecanico@electromecanicajr.cl`
- Password: `Mecanico123!` (o la que prefieras)
- ✅ Auto Confirm User: Activado
- Click **Create user**
- **COPIA EL UUID** del usuario

### 3. Actualizar Perfiles con UUIDs Reales

1. Ve a **SQL Editor** nuevamente
2. Ejecuta este SQL (reemplaza los UUIDs):

```sql
-- Eliminar perfiles de ejemplo
DELETE FROM perfiles;

-- Insertar perfiles con UUIDs reales
INSERT INTO perfiles (id, email, nombre_completo, rol, activo) VALUES
    ('UUID-DEL-ADMIN-AQUI', 'admin@electromecanicajr.cl', 'Administrador', 'admin', true),
    ('UUID-DEL-MECANICO-AQUI', 'mecanico@electromecanicajr.cl', 'Mecánico Principal', 'mecanico', true);
```

### 4. Cambiar Modo de Almacenamiento

En tu archivo `.env.local`, cambia:

```env
NEXT_PUBLIC_STORAGE_MODE=supabase
```

### 5. Reiniciar Servidor

```bash
# Ctrl+C para detener
npm run dev
```

---

## ✅ Verificar que Funciona

1. Ve a http://localhost:3000
2. Login con `admin@electromecanicajr.cl` y tu password
3. Ve a Recepción
4. Crea una orden de prueba
5. Verifica en Supabase > **Table Editor** > **ordenes** que se guardó

---

## 🔐 Sobre la Seguridad

**Para desarrollo**, deshabilitamos RLS (Row Level Security) para evitar errores de permisos.

**Esto significa:**
- ✅ Cualquier usuario autenticado puede leer/escribir todo
- ⚠️ NO es seguro para producción
- ✅ Perfecto para desarrollo y pruebas

**Para producción**, ejecuta `supabase/schema.sql` que tiene RLS habilitado.

---

## 🐛 Solución de Problemas

### "Failed to fetch" o errores de CORS
→ Verifica que las credenciales en `.env.local` sean correctas
→ Verifica que `NEXT_PUBLIC_STORAGE_MODE=supabase`
→ Reinicia el servidor

### "relation does not exist"
→ No ejecutaste el SQL en Supabase
→ Ve a SQL Editor y ejecuta `supabase/setup-simple.sql`

### "User not found" al hacer login
→ No creaste los usuarios en Authentication
→ Ve a Authentication > Users y créalos

### Los datos no se guardan
→ Verifica que `STORAGE_MODE=supabase` en `.env.local`
→ Verifica en la consola del navegador si hay errores
→ Revisa que los UUIDs en `perfiles` coincidan con los de Auth

---

## 📊 Verificar Datos en Supabase

1. Ve a **Table Editor** en Supabase
2. Selecciona la tabla que quieres ver:
   - `perfiles` - Usuarios del sistema
   - `vehiculos` - Vehículos registrados
   - `ordenes` - Órdenes de trabajo
3. Verás todos los datos guardados

---

## 🔄 Volver a LocalStorage

Si quieres volver a usar localStorage (sin Supabase):

En `.env.local`:
```env
NEXT_PUBLIC_STORAGE_MODE=local
```

Reinicia el servidor.

---

## ✨ Resumen

1. ✅ Ejecutar `setup-simple.sql` en Supabase
2. ✅ Crear 2 usuarios en Authentication
3. ✅ Actualizar tabla `perfiles` con UUIDs reales
4. ✅ Cambiar `STORAGE_MODE=supabase` en `.env.local`
5. ✅ Reiniciar servidor
6. ✅ Probar login y crear orden

**Total: 5 minutos** ⏱️
