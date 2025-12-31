# 🔑 Configuración de GetAPI - Solución Rápida

## ⚠️ Problema Actual

La búsqueda de patentes solo usa localStorage porque **falta configurar la API key**.

---

## ✅ Solución (2 minutos)

### Paso 1: Crear archivo `.env.local`

En la **raíz del proyecto** (mismo nivel que `package.json`), crea un archivo llamado `.env.local` con este contenido:

```env
NEXT_PUBLIC_GETAPI_KEY=b5e1f8a2-c3d4-4e9b-9a1c-7f0b2d3e4f5a
```

### Paso 2: Reiniciar el servidor

```bash
# Detener el servidor (Ctrl+C en la terminal)
# Luego reiniciar:
npm run dev
```

### Paso 3: Verificar

1. Abre http://localhost:3000/recepcion
2. Busca una patente (ej: WC9300)
3. Abre la consola del navegador (F12)
4. Deberías ver: `🔍 Consultando patente WC9300 en GetAPI...`

---

## 🔍 Flujo de Búsqueda

Con la API configurada, el sistema busca en este orden:

1. **LocalStorage** → Si ya está registrado localmente
2. **GetAPI** → Si no está local, consulta la API real
3. **Mock Data** → Si la API falla, usa datos de prueba (PROFE1, BBBB10, TEST01)
4. **Manual** → Si no se encuentra, permite entrada manual

---

## 📊 Verificar Configuración

En la consola del navegador verás:

### ✅ Con API configurada:
```
🔍 Buscando patente...
✅ Vehículo encontrado en GetAPI: Toyota Yaris (2018)
```

### ❌ Sin API configurada:
```
⚠️ NEXT_PUBLIC_GETAPI_KEY no configurada. Usando datos mock.
✅ Vehículo encontrado en registros: ...
```

---

## 🐛 Solución de Problemas

### "API Key no configurada"
→ Verifica que el archivo `.env.local` existe en la raíz
→ Verifica que reiniciaste el servidor después de crearlo

### "API Key inválida o expirada"
→ La key de prueba expira en 24 horas
→ Solicita una nueva en https://getapi.cl o usa tu key de pago

### "Límite de consultas excedido"
→ La key de prueba permite 3 consultas/minuto
→ Espera 1 minuto o usa tu key de pago

---

## 💰 API Key de Producción

Cuando pagues el plan de GetAPI:

1. Recibirás tu nueva API key por email
2. Abre `.env.local`
3. Reemplaza la key de prueba con tu key real
4. Reinicia el servidor

```env
NEXT_PUBLIC_GETAPI_KEY=tu-api-key-real-de-produccion
```

---

## 📁 Ubicación del Archivo

```
APP-ELECTROMECANICA-JUAN-RAMIREZ-main/
├── .env.local          ← CREAR AQUÍ
├── .env.example        ← Plantilla de referencia
├── package.json
├── next.config.js
└── app/
```

---

## ✨ Resultado Esperado

Una vez configurado, al buscar una patente chilena real verás:

1. Mensaje: "🔍 Buscando patente..."
2. Consulta a GetAPI
3. Datos del vehículo se llenan automáticamente
4. Mensaje: "✅ Vehículo encontrado en GetAPI: [marca] [modelo]"

---

## 🎯 Resumen

**Problema**: No se consulta GetAPI
**Causa**: Falta archivo `.env.local` con la API key
**Solución**: Crear `.env.local` con la key y reiniciar servidor
**Tiempo**: 2 minutos
