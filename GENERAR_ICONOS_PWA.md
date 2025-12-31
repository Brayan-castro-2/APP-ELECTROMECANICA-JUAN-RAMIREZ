# 📱 Generar Iconos para PWA

## Opción 1: Usar una herramienta online (Recomendado)

1. Ve a: **https://realfavicongenerator.net/** o **https://www.pwabuilder.com/imageGenerator**
2. Sube tu logo: `public/images/logo-blanco.jpg`
3. Configura:
   - **iOS**: Fondo azul oscuro (#0f172a)
   - **Android**: Fondo azul oscuro (#0f172a)
   - **Favicon**: Usar logo
4. Descarga el paquete de iconos
5. Extrae y copia estos archivos a la carpeta `public/`:
   - `icon-192.png`
   - `icon-512.png`
   - `favicon.ico`
   - `apple-touch-icon.png`

## Opción 2: Usar Photoshop/GIMP

1. Abre `public/images/logo-blanco.jpg`
2. Crea un canvas cuadrado con fondo azul oscuro (#0f172a)
3. Centra el logo
4. Exporta en estos tamaños:
   - **192x192px** → Guarda como `icon-192.png`
   - **512x512px** → Guarda como `icon-512.png`
   - **180x180px** → Guarda como `apple-touch-icon.png`
   - **32x32px** → Guarda como `favicon.ico`

## Opción 3: Usar ImageMagick (línea de comandos)

```bash
# Instalar ImageMagick primero
# Windows: choco install imagemagick
# Mac: brew install imagemagick

# Generar iconos
magick convert public/images/logo-blanco.jpg -resize 192x192 -background "#0f172a" -gravity center -extent 192x192 public/icon-192.png
magick convert public/images/logo-blanco.jpg -resize 512x512 -background "#0f172a" -gravity center -extent 512x512 public/icon-512.png
magick convert public/images/logo-blanco.jpg -resize 180x180 -background "#0f172a" -gravity center -extent 180x180 public/apple-touch-icon.png
magick convert public/images/logo-blanco.jpg -resize 32x32 public/favicon.ico
```

## ✅ Archivos Necesarios

Después de generar, deberías tener en `public/`:
- ✅ `icon-192.png`
- ✅ `icon-512.png`
- ✅ `apple-touch-icon.png`
- ✅ `favicon.ico`
- ✅ `manifest.json` (ya creado)

## 🧪 Probar PWA

1. Sube los cambios a GitHub y Vercel
2. Abre la app desde tu celular
3. En Chrome: Menú → "Agregar a pantalla de inicio"
4. En Safari: Compartir → "Agregar a pantalla de inicio"

La app se instalará como si fuera nativa.
