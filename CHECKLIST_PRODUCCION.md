# ✅ CHECKLIST DE VERIFICACIÓN - PRODUCCIÓN

## 🔧 CONFIGURACIÓN INICIAL

### 1. Variables de Entorno (.env.local)
- [ ] Archivo `.env.local` creado en la raíz del proyecto
- [ ] `NEXT_PUBLIC_STORAGE_MODE=supabase` (para producción)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada
- [ ] `NEXT_PUBLIC_GETAPI_KEY=59a683af-8a30-47b9-9a22-f1a6a35ebf29`

### 2. Base de Datos Supabase
- [ ] Proyecto creado en Supabase
- [ ] Ejecutar `supabase/schema.sql` en SQL Editor
- [ ] Verificar que las tablas existen: `perfiles`, `vehiculos`, `ordenes`
- [ ] Crear usuarios iniciales (Rodrigo, Juan, Francisco, Javier)
- [ ] Verificar que RLS (Row Level Security) está configurado

### 3. Storage de Supabase
- [ ] Bucket `ordenes` creado
- [ ] Políticas de acceso público configuradas para lectura
- [ ] Políticas de escritura solo para usuarios autenticados

---

## 🚀 FUNCIONALIDADES A VERIFICAR

### Login
- [ ] Login con username (sin @taller.cl)
- [ ] Login con email completo (username@taller.cl)
- [ ] Bloqueo de usuarios inactivos funciona
- [ ] Redirección correcta según rol (admin → /admin, mecánico → /mecanico)

### Dashboard Admin
- [ ] Estadísticas de hoy se muestran correctamente
- [ ] Rendimiento de mecánicos con ranking
- [ ] Órdenes de hoy se listan
- [ ] Quick Actions funcionan

### Recepción de Vehículos
- [ ] API de GetAPI funciona (consulta patente BDVT87 como prueba)
- [ ] Autocompletado de marca, modelo, año, motor
- [ ] Entrada manual funciona si API falla
- [ ] Captura de fotos funciona
- [ ] Compresión de imágenes antes de subir
- [ ] Creación de orden exitosa

### Gestión de Órdenes
- [ ] Lista de órdenes se muestra correctamente
- [ ] Filtros por estado funcionan
- [ ] Búsqueda por patente funciona
- [ ] Botón eliminar (solo admin) con confirmación
- [ ] Edición de precio en detalle de orden
- [ ] Cambio de estado de orden
- [ ] Asignación de mecánico

### Boleta/Factura
- [ ] Logo personalizado se muestra (fondoboleta.png)
- [ ] Datos del cliente correctos
- [ ] Datos del vehículo correctos
- [ ] Total calculado correctamente
- [ ] Botón imprimir funciona
- [ ] Descarga PDF funciona
- [ ] Envío por WhatsApp funciona

### Gestión de Usuarios
- [ ] Lista de usuarios se muestra
- [ ] Toggle activar/desactivar funciona
- [ ] Usuarios bloqueados no pueden hacer login
- [ ] Badges de estado (activo/bloqueado) correctos

---

## 🎯 RENDIMIENTO

### React Query
- [ ] Prefetching en login funciona
- [ ] Cache de 5 minutos activo
- [ ] Navegación entre páginas es rápida
- [ ] Mutaciones invalidan cache correctamente

### Imágenes
- [ ] Compresión a máximo 1MB funciona
- [ ] Compresión a máximo 1920px ancho funciona
- [ ] Carga de imágenes es rápida

---

## 🔒 SEGURIDAD

- [ ] API Key de GetAPI no está expuesta en código cliente
- [ ] Credenciales de Supabase están en .env.local
- [ ] .env.local está en .gitignore
- [ ] RLS de Supabase protege datos sensibles
- [ ] Solo admins pueden eliminar órdenes
- [ ] Solo admins pueden gestionar usuarios

---

## 📱 RESPONSIVE

- [ ] Login responsive en móvil
- [ ] Dashboard responsive en móvil
- [ ] Recepción responsive en móvil
- [ ] Lista de órdenes responsive en móvil
- [ ] Detalle de orden responsive en móvil
- [ ] Boleta imprimible correctamente

---

## 🐛 ERRORES COMUNES

### API de GetAPI no funciona
**Solución:**
1. Verificar que `.env.local` tiene `NEXT_PUBLIC_GETAPI_KEY=59a683af-8a30-47b9-9a22-f1a6a35ebf29`
2. Reiniciar servidor: `Ctrl+C` y `npm run dev`
3. Verificar en consola del navegador (F12) los logs

### Login no funciona
**Solución:**
1. Verificar que Supabase está configurado
2. Verificar que usuarios existen en tabla `perfiles`
3. Verificar que `NEXT_PUBLIC_STORAGE_MODE=supabase`

### Imágenes no se suben
**Solución:**
1. Verificar que bucket `ordenes` existe en Supabase Storage
2. Verificar políticas de acceso del bucket
3. Verificar que imágenes se comprimen antes de subir

### Usuarios bloqueados pueden entrar
**Solución:**
1. Verificar que campo `activo` existe en tabla `perfiles`
2. Verificar que login verifica `perfil.activo`
3. Limpiar caché del navegador

---

## 📝 COMANDOS ÚTILES

```bash
# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Iniciar en producción
npm start

# Limpiar caché de Next.js
rm -rf .next

# Ver logs en tiempo real
# (Abrir consola del navegador con F12)
```

---

## 🎨 PERSONALIZACIÓN

### Logo de la Boleta
- Archivo: `public/imagenes/fondoboleta.png`
- Tamaño recomendado: 200x80px
- Formato: PNG con fondo transparente

### Colores del Tema
- Azul principal: `#0066FF`
- Fondo oscuro: `#121212`
- Cards: `#1a1a1a`
- Bordes: `#333333`

---

## ✅ ESTADO ACTUAL

**Implementado:**
- ✅ Login simplificado con username
- ✅ React Query con prefetching
- ✅ API de GetAPI integrada
- ✅ Compresión de imágenes
- ✅ Dashboard con métricas de mecánicos
- ✅ Eliminar órdenes (admin)
- ✅ Gestión de usuarios con activar/desactivar
- ✅ Bloqueo de usuarios inactivos en login
- ✅ Logo personalizado en boleta

**Pendiente:**
- ⏳ Edición completa de órdenes (modal con todos los campos)
- ⏳ Envío de boleta por email
- ⏳ Notificaciones push
- ⏳ Reportes y estadísticas avanzadas

---

**Última actualización:** 3 de enero de 2026
