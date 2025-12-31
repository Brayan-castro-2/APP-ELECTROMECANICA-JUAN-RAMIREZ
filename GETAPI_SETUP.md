# Configuración de GetAPI para Consulta de Patentes

Este sistema está integrado con **GetAPI** para consultar información de vehículos chilenos por patente.

## 🔑 Configuración de la API Key

### Paso 1: Crear archivo de variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```env
NEXT_PUBLIC_GETAPI_KEY=tu-api-key-aqui
```

### Paso 2: Obtener tu API Key

#### **API Key de Prueba (Actual)**
Ya tienes una API key de prueba que recibiste por email:
- **API Key**: `b5e1f8a2-c3d4-4e9b-9a1c-7f0b2d3e4f5a`
- **Límite**: 3 consultas por minuto
- **Duración**: 24 horas desde que la recibiste

Para usar la API de prueba, crea tu `.env.local`:
```env
NEXT_PUBLIC_GETAPI_KEY=b5e1f8a2-c3d4-4e9b-9a1c-7f0b2d3e4f5a
```

#### **API Key de Producción (Cuando pagues)**
1. Ve a https://getapi.cl
2. Selecciona tu plan y realiza el pago
3. Recibirás tu API key por email
4. Reemplaza la key de prueba en `.env.local` con tu nueva key

```env
NEXT_PUBLIC_GETAPI_KEY=tu-api-key-real-de-produccion
```

### Paso 3: Reiniciar el servidor de desarrollo

Después de crear o modificar `.env.local`, reinicia el servidor:

```bash
# Detener el servidor (Ctrl+C)
# Luego reiniciar
npm run dev
```

## 🚀 Cómo Funciona

El sistema tiene un **flujo de búsqueda en cascada** cuando buscas una patente:

1. **📦 LocalStorage** - Primero busca en los vehículos ya registrados localmente
2. **🌐 GetAPI** - Si no está local, consulta la API de GetAPI (si está configurada)
3. **🧪 Mock Data** - Si la API no está disponible, usa datos de prueba (PROFE1, BBBB10, TEST01)
4. **✍️ Manual** - Si no se encuentra, permite ingresar los datos manualmente

### Mensajes de Estado

Durante la búsqueda verás diferentes mensajes:

- `🔍 Buscando patente...` - Consultando
- `✅ Vehículo encontrado en registros` - Encontrado en localStorage
- `✅ Vehículo encontrado en GetAPI` - Encontrado en la API
- `✅ Vehículo encontrado (datos de prueba)` - Encontrado en mock data
- `⚠️ Límite de consultas excedido` - Has superado el límite de la API
- `⚠️ API Key inválida o expirada` - La key no es válida
- `❌ Patente no encontrada` - No existe en ningún lado

## 📊 Planes de GetAPI

Visita https://getapi.cl para ver los planes disponibles:

- **Prueba**: 3 consultas/minuto, 24 horas
- **Básico**: Consultas ilimitadas, mensual
- **Pro**: Consultas ilimitadas + soporte prioritario
- **Enterprise**: Consultas ilimitadas + SLA garantizado

## 🔧 Desarrollo sin API

Si no tienes la API configurada, el sistema funciona perfectamente usando:

1. **Datos locales** - Vehículos ya registrados
2. **Datos mock** - Patentes de prueba (PROFE1, BBBB10, TEST01)
3. **Entrada manual** - Siempre puedes ingresar los datos a mano

## 🐛 Solución de Problemas

### La API no responde
- Verifica que `.env.local` existe y tiene la key correcta
- Reinicia el servidor de desarrollo
- Revisa la consola del navegador para ver logs detallados

### "Límite de consultas excedido"
- Con la API de prueba: espera 1 minuto entre consultas
- Con la API de producción: verifica tu plan en GetAPI

### "API Key inválida o expirada"
- La key de prueba expira en 24 horas
- Solicita una nueva key de prueba o compra un plan

## 📝 Ejemplo de Uso

```typescript
// El sistema maneja esto automáticamente, pero así funciona internamente:

// 1. Usuario ingresa patente: "BBBB10"
// 2. Sistema busca en localStorage
// 3. Si no está, consulta GetAPI
// 4. Si GetAPI responde, muestra los datos
// 5. Si GetAPI falla, usa mock o permite entrada manual
```

## 🔐 Seguridad

- La API key se almacena en `.env.local` (no se sube a Git)
- Las consultas se hacen desde el cliente (Next.js)
- Los datos consultados se guardan en localStorage para evitar consultas repetidas

## 📞 Soporte

- **GetAPI**: contacto@getapi.cl
- **Documentación**: https://getapi.cl/docs
- **Planes y precios**: https://getapi.cl/planes
