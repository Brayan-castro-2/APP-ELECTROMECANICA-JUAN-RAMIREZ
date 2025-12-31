# 🔧 Actualizar Vehículos en localStorage

## Problema

Los vehículos guardados en localStorage no tienen el campo `motor`, por eso aparece vacío.

## Solución Rápida

Abre la consola del navegador (F12) y ejecuta este código:

```javascript
// Obtener vehículos actuales
const vehiculos = JSON.parse(localStorage.getItem('app_vehiculos') || '[]');

// Actualizar cada vehículo para agregar motor si no lo tiene
const vehiculosActualizados = vehiculos.map(v => {
    if (!v.motor) {
        // Agregar motor según la patente
        if (v.patente === 'BBBB10') {
            v.motor = '1.5';
        } else if (v.patente === 'PROFE1') {
            v.motor = '1.6 Twin Cam';
        } else if (v.patente === 'TEST01') {
            v.motor = '1.4';
        } else {
            v.motor = '';
        }
    }
    return v;
});

// Guardar de vuelta
localStorage.setItem('app_vehiculos', JSON.stringify(vehiculosActualizados));

console.log('✅ Vehículos actualizados:', vehiculosActualizados);
```

Luego recarga la página (F5).

---

## Alternativa: Limpiar y Empezar de Nuevo

Si prefieres empezar de cero:

```javascript
// Borrar todos los vehículos
localStorage.removeItem('app_vehiculos');

// Borrar todas las órdenes
localStorage.removeItem('app_ordenes');

console.log('✅ Datos limpiados. Recarga la página.');
```

Luego recarga la página (F5).

---

## ✅ Verificar

Después de ejecutar el script, busca la patente `BBBB10` nuevamente. Ahora debería mostrar el motor `1.5`.

Los campos también serán editables porque cambié `vehiculoLocked` a `false`.
