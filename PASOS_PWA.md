# 📱 Configurar PWA - Pasos Finales

## ✅ Ya Configurado

- ✅ `manifest.json` creado
- ✅ `layout.tsx` actualizado con meta tags PWA
- ✅ Configuración para iOS y Android

## 🎨 Generar Iconos (IMPORTANTE)

### Opción Rápida - Usar herramienta online:

1. Ve a: **https://realfavicongenerator.net/**
2. Sube: `public/images/logo-blanco.jpg`
3. Descarga el paquete
4. Copia estos archivos a `public/`:
   - `icon-192.png`
   - `icon-512.png`
   - `apple-touch-icon.png`
   - `favicon.ico`

### Alternativa - Crear manualmente:

Si tienes Photoshop/GIMP:
1. Abre `logo-blanco.jpg`
2. Canvas cuadrado 512x512px
3. Fondo: #0f172a (azul oscuro)
4. Centra el logo
5. Exporta en los tamaños indicados arriba

## 🚀 Subir a GitHub y Vercel

```bash
git add .
git commit -m "Configurar PWA con iconos y manifest"
git push origin main
```

Vercel se actualizará automáticamente.

## 📱 Instalar en Celular

### Android (Chrome):
1. Abre la app en Chrome
2. Menú (⋮) → "Agregar a pantalla de inicio"
3. La app se instalará como nativa

### iOS (Safari):
1. Abre la app en Safari
2. Botón compartir → "Agregar a pantalla de inicio"
3. La app se instalará como nativa

## ✨ Características PWA

- ✅ Funciona sin conexión (caché)
- ✅ Icono en pantalla de inicio
- ✅ Pantalla completa (sin barra del navegador)
- ✅ Splash screen al abrir
- ✅ Se ve como app nativa
- ✅ Notificaciones push (opcional)

## 🧪 Verificar PWA

1. Abre Chrome DevTools (F12)
2. Tab "Application"
3. Sección "Manifest" - Verifica que esté correcto
4. Sección "Service Workers" - Verifica que esté activo
5. Click en "Lighthouse" → "Generate report" → Verifica PWA score

## 📝 Notas

- Los iconos deben ser PNG con fondo sólido
- El logo debe verse bien en tamaños pequeños
- Prueba en varios dispositivos
- La app se actualizará automáticamente cuando hagas cambios
