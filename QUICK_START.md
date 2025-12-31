# ⚡ Inicio Rápido - Electromecánica JR

## 🎯 Resumen Ejecutivo

**Para desplegar en producción necesitas:**

1. ✅ Crear base de datos en Supabase (5 minutos)
2. ✅ Configurar variables en Vercel (2 minutos)
3. ✅ Redesplegar (1 minuto)

**Total: ~10 minutos** ⏱️

---

## 📝 Checklist Rápido

### Supabase (Base de Datos)

- [ ] Crear proyecto en https://supabase.com
- [ ] Ejecutar `supabase/schema.sql` en SQL Editor
- [ ] Crear 2 usuarios en Authentication:
  - `admin@electromecanicajr.cl`
  - `mecanico@electromecanicajr.cl`
- [ ] Copiar UUIDs de los usuarios
- [ ] Actualizar tabla `perfiles` con los UUIDs reales
- [ ] Copiar Project URL y anon key

### Vercel (Hosting)

- [ ] Ir a https://vercel.com/dashboard
- [ ] Seleccionar proyecto `electromecanicajr`
- [ ] Ir a Settings > Environment Variables
- [ ] Agregar 4 variables:
  ```
  NEXT_PUBLIC_STORAGE_MODE=supabase
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
  NEXT_PUBLIC_GETAPI_KEY=b5e1f8a2-c3d4-4e9b-9a1c-7f0b2d3e4f5a
  ```
- [ ] Redesplegar desde Deployments

### Verificación

- [ ] Abrir https://electromecanicajr.vercel.app
- [ ] Login con admin@electromecanicajr.cl
- [ ] Crear una orden de prueba
- [ ] Verificar que se guarda en Supabase

---

## 🔑 Credenciales que Necesitas

### De Supabase:
1. **Project URL**: Settings > API > Project URL
2. **anon public key**: Settings > API > Project API keys > anon public

### De GetAPI (Opcional):
- Ya tienes la key de prueba en el código
- Cuando pagues, solo actualiza la variable en Vercel

---

## 🚨 Si Algo Falla

### "Cannot read properties of null"
→ Verifica que las variables de entorno estén en Vercel y redesplega

### "Invalid API key"
→ Verifica que copiaste el `anon key` correcto (no el `service_role`)

### "User not found"
→ Verifica que los UUIDs en `perfiles` coincidan con los de Auth

---

## 📖 Documentación Completa

Para instrucciones detalladas paso a paso, ver: **`DEPLOYMENT_GUIDE.md`**

---

## 💡 Desarrollo Local

Si quieres probar localmente antes de desplegar:

1. Crea `.env.local`:
```env
NEXT_PUBLIC_STORAGE_MODE=local
NEXT_PUBLIC_GETAPI_KEY=b5e1f8a2-c3d4-4e9b-9a1c-7f0b2d3e4f5a
```

2. Ejecuta:
```bash
npm install
npm run dev
```

3. Abre http://localhost:3000

---

## ✅ ¡Listo para Producción!

Una vez completados los pasos, tu app estará funcionando en:
**https://electromecanicajr.vercel.app**

Con:
- ✅ Base de datos real (Supabase)
- ✅ Hosting escalable (Vercel)
- ✅ Consulta de patentes (GetAPI)
- ✅ Backups automáticos
- ✅ SSL/HTTPS incluido
