'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { buscarVehiculoPorPatente, crearVehiculo, crearOrden } from '@/lib/storage-adapter';
import { subirImagen } from '@/lib/local-storage-service';
import { consultarPatenteGetAPI, isGetAPIConfigured } from '@/lib/getapi-service';

const MOCK_DB: Record<string, { marca: string; modelo: string; anio: string; motor: string }> = {
    PROFE1: { marca: 'Nissan', modelo: 'V16', anio: '2010', motor: '1.6 Twin Cam' },
    BBBB10: { marca: 'Toyota', modelo: 'Yaris', anio: '2018', motor: '1.5' },
    TEST01: { marca: 'Chevrolet', modelo: 'Sail', anio: '2020', motor: '1.4' },
};

const SERVICIOS_FRECUENTES = [
    'DPF Electrónico',
    'DPF Físico',
    'Scanner',
    'AdBlue OFF',
    'Regeneración',
];

type Servicio = { descripcion: string; precio: string };
type FocusTarget = { index: number; field: 'desc' | 'precio' } | null;

function formatMilesConPunto(value: string) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function buildKmServiceDescripcion(kmActual: string, kmNuevo: string) {
    const a = kmActual ? `${formatMilesConPunto(kmActual)} KM` : 'KM actual';
    const n = kmNuevo ? `${formatMilesConPunto(kmNuevo)} KM` : 'KM nuevo';
    return `KM: ${a} → ${n}`;
}

function normalizePatente(v: string) {
    return String(v || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);
}

function parsePrecio(v: string) {
    const cleaned = String(v || '').replace(/[^0-9]/g, '');
    return cleaned ? Number(cleaned) : 0;
}

function moneyCL(n: number) {
    return (Number.isFinite(n) ? n : 0).toLocaleString('es-CL');
}

function nowCL() {
    return new Date().toLocaleString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

export default function RecepcionPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [fechaHora, setFechaHora] = useState(nowCL());

    const [mecanico, setMecanico] = useState('Técnico en Turno');

    const [patente, setPatente] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [anio, setAnio] = useState('');
    const [motor, setMotor] = useState('');
    const [kmEnabled, setKmEnabled] = useState(false);
    const [kmActual, setKmActual] = useState('');
    const [kmNuevo, setKmNuevo] = useState('');
    const [kmServiceIndex, setKmServiceIndex] = useState<number | null>(null);
    const [vehiculoLocked, setVehiculoLocked] = useState(false);
    const [estadoBusqueda, setEstadoBusqueda] = useState('');
    const [isBuscando, setIsBuscando] = useState(false);

    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteWhatsapp, setClienteWhatsapp] = useState('');

    const [detallesVehiculo, setDetallesVehiculo] = useState('');
    const [fotos, setFotos] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const [servicios, setServicios] = useState<Servicio[]>([{ descripcion: '', precio: '' }]);
    const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Ref para auto-focus en KM Actual
    const kmActualInputRef = useRef<HTMLInputElement>(null);

    const descRefs = useRef<Array<HTMLInputElement | null>>([]);
    const precioRefs = useRef<Array<HTMLInputElement | null>>([]);

    const total = useMemo(() => {
        return servicios.reduce((acc, s) => acc + parsePrecio(s.precio), 0);
    }, [servicios]);

    useEffect(() => {
        const id = window.setInterval(() => setFechaHora(nowCL()), 1000);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        const raw = localStorage.getItem('usuario_actual');
        if (!raw) return;
        try {
            const u = JSON.parse(raw);
            setMecanico(u?.nombre_completo || u?.nombre || u?.email || 'Técnico en Turno');
        } catch {
            setMecanico(raw);
        }
    }, []);

    useEffect(() => {
        if (user?.name) {
            setMecanico(user.name);
        }
    }, [user?.name]);

    useEffect(() => {
        if (!focusTarget) return;
        const { index, field } = focusTarget;
        const el = field === 'precio' ? precioRefs.current[index] : descRefs.current[index];
        if (el) {
            el.focus();
            if (field === 'precio') el.select();
        }
        setFocusTarget(null);
    }, [focusTarget, servicios.length]);

    const buscarPatente = async () => {
        const p = normalizePatente(patente);
        setPatente(p);

        if (!p) {
            setEstadoBusqueda('');
            setMarca('');
            setModelo('');
            setAnio('');
            setMotor('');
            setVehiculoLocked(false);
            return;
        }

        setIsBuscando(true);
        setEstadoBusqueda('🔍 Buscando patente...');

        try {
            // 1. Primero buscar en localStorage
            console.log(`[Búsqueda] Paso 1: Buscando ${p} en localStorage...`);
            const vehiculoLocal = await buscarVehiculoPorPatente(p);
            if (vehiculoLocal) {
                console.log(`[Búsqueda] ✅ Encontrado en BD:`, vehiculoLocal);
                
                // Solo sobrescribir si los datos de la BD son válidos (no "Por definir")
                const marcaValida = vehiculoLocal.marca && vehiculoLocal.marca !== 'Por definir';
                const modeloValido = vehiculoLocal.modelo && vehiculoLocal.modelo !== 'Por definir';
                
                if (marcaValida) setMarca(vehiculoLocal.marca);
                if (modeloValido) setModelo(vehiculoLocal.modelo);
                if (vehiculoLocal.anio && vehiculoLocal.anio !== '2026') setAnio(vehiculoLocal.anio);
                if (vehiculoLocal.motor) setMotor(vehiculoLocal.motor);
                
                setVehiculoLocked(false);
                
                if (marcaValida && modeloValido) {
                    setEstadoBusqueda(`✅ Vehículo encontrado: ${vehiculoLocal.marca} ${vehiculoLocal.modelo} (${vehiculoLocal.anio})`);
                } else {
                    setEstadoBusqueda(`⚠️ Vehículo encontrado pero sin datos completos. Completa manualmente.`);
                }
                
                setIsBuscando(false);
                return;
            }
            console.log(`[Búsqueda] ❌ No encontrado en localStorage`);

            // 2. Si no está en localStorage, consultar GetAPI
            console.log(`[Búsqueda] Paso 2: Verificando configuración de GetAPI...`);
            const apiConfigured = isGetAPIConfigured();
            console.log(`[Búsqueda] GetAPI configurada: ${apiConfigured}`);
            
            if (apiConfigured) {
                try {
                    console.log(`[Búsqueda] Consultando GetAPI para patente ${p}...`);
                    const vehiculoAPI = await consultarPatenteGetAPI(p);
                    if (vehiculoAPI) {
                        console.log(`[Búsqueda] ✅ Encontrado en GetAPI:`, vehiculoAPI);
                        setMarca(vehiculoAPI.marca);
                        setModelo(vehiculoAPI.modelo);
                        setAnio(vehiculoAPI.anio);
                        setMotor(vehiculoAPI.motor || '');
                        setVehiculoLocked(false);
                        setEstadoBusqueda(`✅ Vehículo encontrado en GetAPI: ${vehiculoAPI.marca} ${vehiculoAPI.modelo} (${vehiculoAPI.anio})`);
                        setIsBuscando(false);
                        return;
                    }
                    console.log(`[Búsqueda] ❌ No encontrado en GetAPI`);
                } catch (error) {
                    // Si hay error de API (límite, key inválida, etc), mostrar mensaje pero continuar con fallback
                    console.error(`[Búsqueda] ⚠️ Error en GetAPI:`, error);
                    if (error instanceof Error) {
                        setEstadoBusqueda(`⚠️ GetAPI no disponible. Completa los datos manualmente.`);
                    }
                }
            } else {
                console.warn(`[Búsqueda] ⚠️ GetAPI no configurada.`);
                setEstadoBusqueda(`⚠️ GetAPI no configurada. Completa los datos manualmente.`);
            }

            // 3. Fallback a datos mock (para testing)
            const found = MOCK_DB[p];
            if (found) {
                setMarca(found.marca);
                setModelo(found.modelo);
                setAnio(found.anio);
                setMotor(found.motor);
                setVehiculoLocked(false);
                setEstadoBusqueda(`✅ Vehículo encontrado (datos de prueba): ${found.marca} ${found.modelo} (${found.anio})`);
            } else {
                // 4. No encontrado en ningún lado
                setMarca('');
                setModelo('');
                setAnio('');
                setMotor('');
                setVehiculoLocked(false);
                setEstadoBusqueda('❌ Patente no encontrada. Completa los datos manualmente.');
            }
        } finally {
            setIsBuscando(false);
        }
    };

    const agregarFila = (prefill?: { descripcion?: string }) => {
        setServicios((prev) => {
            const next = [...prev, { descripcion: prefill?.descripcion || '', precio: '' }];
            const idx = next.length - 1;
            setFocusTarget({ index: idx, field: prefill?.descripcion ? 'precio' : 'desc' });
            return next;
        });
    };

    const activarServicioKm = () => {
        setKmEnabled(true);
        setServicios((prev) => {
            const emptyIndex = prev.findIndex((s) => {
                const d = s.descripcion.trim();
                const p = parsePrecio(s.precio);
                return !d && p === 0;
            });

            const kmDesc = buildKmServiceDescripcion(kmActual, kmNuevo);

            if (emptyIndex >= 0) {
                const next = prev.map((s, i) => (i === emptyIndex ? { ...s, descripcion: kmDesc } : s));
                setKmServiceIndex(emptyIndex);
                return next;
            }

            const next = [...prev, { descripcion: kmDesc, precio: '' }];
            const idx = next.length - 1;
            setKmServiceIndex(idx);
            return next;
        });

        // Auto-focus en KM Actual después de que el DOM se actualice
        setTimeout(() => {
            if (kmActualInputRef.current) {
                kmActualInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                kmActualInputRef.current.focus();
            }
        }, 100);
    };

    const desactivarServicioKm = () => {
        setKmEnabled(false);
        setKmActual('');
        setKmNuevo('');
        setServicios((prev) => {
            if (kmServiceIndex === null) return prev;
            const next = prev.filter((_, i) => i !== kmServiceIndex);
            return next.length ? next : [{ descripcion: '', precio: '' }];
        });
        setKmServiceIndex(null);
    };

    useEffect(() => {
        if (!kmEnabled) return;
        if (kmServiceIndex === null) return;

        setServicios((prev) => {
            if (kmServiceIndex < 0 || kmServiceIndex >= prev.length) return prev;
            const desired = buildKmServiceDescripcion(kmActual, kmNuevo);
            const current = prev[kmServiceIndex]?.descripcion || '';
            if (current === desired) return prev;
            return prev.map((s, i) => (i === kmServiceIndex ? { ...s, descripcion: desired } : s));
        });
    }, [kmEnabled, kmServiceIndex, kmActual, kmNuevo]);

    const agregarServicioFrecuente = (descripcion: string) => {
        const desc = descripcion.trim();
        if (!desc) return;

        setServicios((prev) => {
            const emptyIndex = prev.findIndex((s) => {
                const d = s.descripcion.trim();
                const p = parsePrecio(s.precio);
                return !d && p === 0;
            });

            if (emptyIndex >= 0) {
                const next = prev.map((s, i) => (i === emptyIndex ? { ...s, descripcion: desc } : s));
                setFocusTarget({ index: emptyIndex, field: 'precio' });
                return next;
            }

            const next = [...prev, { descripcion: desc, precio: '' }];
            setFocusTarget({ index: next.length - 1, field: 'precio' });
            return next;
        });
    };

    const eliminarFila = (index: number) => {
        setServicios((prev) => {
            const next = prev.filter((_, i) => i !== index);
            return next.length ? next : [{ descripcion: '', precio: '' }];
        });

        if (kmServiceIndex !== null) {
            if (index === kmServiceIndex) {
                setKmEnabled(false);
                setKmActual('');
                setKmNuevo('');
                setKmServiceIndex(null);
            } else if (index < kmServiceIndex) {
                setKmServiceIndex(kmServiceIndex - 1);
            }
        }
    };

    const updateServicio = (index: number, patch: Partial<Servicio>) => {
        setServicios((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    };

    const crearSoloOrden = async () => {
        const p = normalizePatente(patente);
        if (!user) {
            alert('Sesión no encontrada. Inicia sesión nuevamente.');
            return;
        }
        if (!p) {
            alert('Ingresa una patente.');
            return;
        }
        if (!marca || !modelo || !anio || !motor) {
            alert('Completa los datos del vehículo (Marca, Modelo, Año, Motor).');
            return;
        }
        if (kmEnabled) {
            if (!kmActual || parsePrecio(kmActual) <= 0 || !kmNuevo || parsePrecio(kmNuevo) <= 0) {
                alert('Ingresa KM actual y KM nuevo.');
                return;
            }
            if (kmServiceIndex === null) {
                alert('Activa el servicio KM para poder cobrarlo.');
                return;
            }
        }

        const serviciosForOrder = servicios
            .map((s) => ({ descripcion: s.descripcion.trim(), precio: parsePrecio(s.precio) }))
            .filter((s) => s.descripcion || s.precio);

        if (serviciosForOrder.length === 0) {
            alert('Agrega al menos un servicio.');
            return;
        }

        const detalleServicios = serviciosForOrder
            .map((s) => `- ${s.descripcion || 'Servicio'}: $${moneyCL(s.precio)}`)
            .join('\n');

        const descripcionIngreso = [`Motor: ${motor}`, '', 'Servicios:', detalleServicios].join('\n');

        // Validar campos obligatorios del vehículo
        if (!marca || marca.trim() === '' || marca === 'Por definir') {
            alert('Por favor ingresa la Marca del vehículo.');
            return;
        }
        if (!modelo || modelo.trim() === '' || modelo === 'Por definir') {
            alert('Por favor ingresa el Modelo del vehículo.');
            return;
        }
        if (!anio || anio.trim() === '') {
            alert('Por favor ingresa el Año del vehículo.');
            return;
        }

        setIsSubmitting(true);
        try {
            // SIEMPRE guardar/actualizar el vehículo con los datos del formulario
            console.log('🚗 Guardando vehículo con datos:', { patente: p, marca, modelo, anio, motor });
            const vehiculoGuardado = await crearVehiculo({
                patente: p,
                marca: marca.trim(),
                modelo: modelo.trim(),
                anio: anio.trim(),
                motor: motor?.trim() || '',
                color: '-',
            });
            
            if (!vehiculoGuardado) {
                alert('Error al guardar el vehículo. Intenta de nuevo.');
                setIsSubmitting(false);
                return;
            }
            
            console.log('✅ Vehículo guardado correctamente:', vehiculoGuardado);

            // Construir número completo de WhatsApp con prefijo +569
            const whatsappCompleto = clienteWhatsapp ? `+569${clienteWhatsapp}` : undefined;
            
            const orden = await crearOrden({
                patente_vehiculo: p,
                descripcion_ingreso: descripcionIngreso,
                creado_por: user.id,
                estado: 'pendiente',
                asignado_a: user.id,
                cliente_nombre: clienteNombre || undefined,
                cliente_telefono: whatsappCompleto,
                precio_total: total || undefined,
                fotos: fotos.length ? fotos : undefined,
                detalles_vehiculo: detallesVehiculo.trim() || undefined,
            });

            if (!orden) {
                alert('No se pudo crear la orden.');
                return;
            }

            setSuccessMsg(`Orden #${orden.id} creada`);

            if (user.role === 'admin') {
                router.push(`/admin/ordenes/clean?id=${orden.id}`);
            } else {
                limpiar();
            }
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setSuccessMsg(null), 2500);
        }
    };

    const limpiar = () => {
        setPatente('');
        setMarca('');
        setModelo('');
        setAnio('');
        setMotor('');
        setKmEnabled(false);
        setKmActual('');
        setKmNuevo('');
        setKmServiceIndex(null);
        setVehiculoLocked(true);
        setEstadoBusqueda('');
        setClienteNombre('');
        setClienteWhatsapp('');
        setDetallesVehiculo('');
        setFotos([]);
        setServicios([{ descripcion: '', precio: '' }]);
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            {successMsg ? (
                <div className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2">
                        <span className="font-semibold">{successMsg}</span>
                    </div>
                </div>
            ) : null}

            <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 px-6 py-5 shadow">
                <div className="text-xl font-bold text-white">Nueva Orden de Trabajo</div>
                <div className="mt-1 text-sm text-blue-100">{fechaHora}</div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200">RESPONSABLES</div>
                <label className="text-sm font-semibold text-slate-200">Mecánico Responsable</label>
                <input
                    value={mecanico}
                    readOnly
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white"
                />
                <div className="mt-2 text-xs text-slate-400">Se completa automáticamente con el usuario actual (si existe).</div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200">VEHÍCULO</div>

                <div className="grid gap-3 md:grid-cols-[1fr_240px] md:items-end">
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Patente</label>
                        <input
                            value={patente}
                            onChange={(e) => setPatente(normalizePatente(e.target.value))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    buscarPatente();
                                }
                            }}
                            placeholder="AA-BB-11"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-4 text-center font-mono text-2xl font-bold uppercase tracking-widest text-white"
                            maxLength={6}
                        />
                        <div className="mt-2 text-xs text-slate-400">Ejemplos: PROFE1, BBBB10, TEST01</div>
                    </div>

                    <button
                        type="button"
                        onClick={buscarPatente}
                        disabled={isBuscando}
                        className="h-[54px] rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isBuscando ? '🔄 Buscando...' : '🔍 Buscar'}
                    </button>
                </div>

                {estadoBusqueda ? <div className="mt-3 text-sm text-slate-300">{estadoBusqueda}</div> : null}

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Marca</label>
                        <input
                            value={marca}
                            onChange={(e) => setMarca(e.target.value)}
                            placeholder="Ej: Toyota, Chevrolet"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Modelo</label>
                        <input
                            value={modelo}
                            onChange={(e) => setModelo(e.target.value)}
                            placeholder="Ej: Corolla, Sail"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Año</label>
                        <input
                            value={anio}
                            onChange={(e) => setAnio(e.target.value)}
                            placeholder="Ej: 2020"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Motor</label>
                        <input
                            value={motor}
                            onChange={(e) => setMotor(e.target.value)}
                            placeholder="Ej: 1.4, 1.6 Twin Cam"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200">CLIENTE</div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Nombre</label>
                        <input
                            value={clienteNombre}
                            onChange={(e) => setClienteNombre(e.target.value)}
                            placeholder="Nombre del cliente"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-200">WhatsApp</label>
                        <div className="relative mt-2">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                <span className="text-slate-400">+569</span>
                            </div>
                            <input
                                value={clienteWhatsapp}
                                onChange={(e) => {
                                    const numeros = e.target.value.replace(/[^0-9]/g, '');
                                    setClienteWhatsapp(numeros.slice(0, 8));
                                }}
                                inputMode="numeric"
                                placeholder="12345678"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-16 pr-4 text-white"
                            />
                        </div>
                        <div className="mt-2 text-xs text-slate-400">Usa formato internacional sin + (ej: 56912345678).</div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200">SERVICIOS</div>

                <div className="mb-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => (kmEnabled ? desactivarServicioKm() : activarServicioKm())}
                        className={
                            kmEnabled
                                ? 'rounded-full border border-blue-500 bg-blue-600/30 px-3 py-2 text-sm font-semibold text-blue-100'
                                : 'rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700'
                        }
                    >
                        🔘 KM
                    </button>
                    {SERVICIOS_FRECUENTES.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => agregarServicioFrecuente(s)}
                            className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                        >
                            🔘 {s}
                        </button>
                    ))}
                </div>

                {kmEnabled ? (
                    <div className="mb-4 grid gap-4 rounded-xl border border-slate-700 bg-slate-800/30 p-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-semibold text-slate-200">KM actual</label>
                            <input
                                ref={kmActualInputRef}
                                value={formatMilesConPunto(kmActual)}
                                onChange={(e) => setKmActual(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                                inputMode="numeric"
                                placeholder="Ej: 200.000"
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-2xl font-bold font-mono tracking-wide text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-200">KM nuevo</label>
                            <input
                                value={formatMilesConPunto(kmNuevo)}
                                onChange={(e) => setKmNuevo(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                                inputMode="numeric"
                                placeholder="Ej: 120.000"
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-2xl font-bold font-mono tracking-wide text-white"
                            />
                        </div>
                        <div className="md:col-span-2 text-xs text-slate-400">
                            Se agrega como servicio cobrable. Define el precio en la fila de KM.
                        </div>
                    </div>
                ) : null}

                <div className="overflow-hidden rounded-xl border border-slate-700">
                    <table className="w-full">
                        <thead className="bg-slate-800/70">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-semibold tracking-widest text-slate-300">DESCRIPCIÓN</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold tracking-widest text-slate-300">PRECIO ($)</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold tracking-widest text-slate-300">ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {servicios.map((s, idx) => (
                                <tr key={idx} className="bg-slate-900/40">
                                    <td className="px-3 py-3">
                                        <input
                                            ref={(r) => {
                                                descRefs.current[idx] = r;
                                            }}
                                            value={s.descripcion}
                                            onChange={(e) => updateServicio(idx, { descripcion: e.target.value })}
                                            placeholder="Ej: Scanner"
                                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-3 text-white"
                                        />
                                    </td>
                                    <td className="px-3 py-3">
                                        <input
                                            ref={(r) => {
                                                precioRefs.current[idx] = r;
                                            }}
                                            value={s.precio}
                                            onChange={(e) => updateServicio(idx, { precio: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) })}
                                            inputMode="numeric"
                                            placeholder="0"
                                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-3 text-white"
                                        />
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => eliminarFila(idx)}
                                            className="rounded-xl bg-red-600 px-3 py-3 text-sm font-semibold text-white hover:bg-red-700"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="text-xs font-semibold tracking-widest text-slate-300">TOTAL</div>
                        <div className="text-2xl font-extrabold text-white">${moneyCL(total)}</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => agregarFila()}
                        className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                    >
                        + Agregar Servicio
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200">DETALLES DEL VEHÍCULO</div>
                <label className="text-sm font-semibold text-slate-200">Descripción general</label>
                <textarea
                    value={detallesVehiculo}
                    onChange={(e) => setDetallesVehiculo(e.target.value)}
                    placeholder="Ej: ruido al encender, vibración, luces de tablero, etc."
                    className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white"
                />

                <div className="mt-5">
                    <label className="text-sm font-semibold text-slate-200 block mb-2">Imágenes</label>
                    <input
                        type="file"
                        id="file-upload"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            setIsUploading(true);
                            try {
                                const uploads = await Promise.all(files.map((f) => subirImagen(f, 'ordenes')));
                                const ok = uploads.filter(Boolean) as string[];
                                setFotos((prev) => [...prev, ...ok]);
                            } finally {
                                setIsUploading(false);
                                e.target.value = '';
                            }
                        }}
                        className="hidden"
                    />
                    <input
                        type="file"
                        id="camera-capture"
                        accept="image/*"
                        capture="environment"
                        onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            setIsUploading(true);
                            try {
                                const uploads = await Promise.all(files.map((f) => subirImagen(f, 'ordenes')));
                                const ok = uploads.filter(Boolean) as string[];
                                setFotos((prev) => [...prev, ...ok]);
                            } finally {
                                setIsUploading(false);
                                e.target.value = '';
                            }
                        }}
                        className="hidden"
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                        <label
                            htmlFor="file-upload"
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 px-6 py-4 font-semibold text-slate-200 hover:bg-slate-700/50 hover:border-slate-500 cursor-pointer transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Seleccionar imágenes</span>
                        </label>
                        <label
                            htmlFor="camera-capture"
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-600 bg-blue-800/30 px-6 py-4 font-semibold text-blue-200 hover:bg-blue-700/50 hover:border-blue-500 cursor-pointer transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Tomar foto</span>
                        </label>
                    </div>
                    {isUploading ? <div className="mt-2 text-xs text-slate-400">Subiendo imágenes...</div> : null}

                    {fotos.length ? (
                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {fotos.map((src, idx) => (
                                <div key={idx} className="rounded-xl border border-slate-700 bg-slate-800/30 p-2">
                                    <img src={src} alt={`foto-${idx}`} className="h-28 w-full rounded-lg object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setFotos((prev) => prev.filter((_, i) => i !== idx))}
                                        className="mt-2 w-full rounded-lg bg-red-600 px-2 py-2 text-xs font-semibold text-white hover:bg-red-700"
                                    >
                                        Quitar
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="flex flex-col gap-3 pb-10 md:flex-row md:justify-end">
                <button
                    type="button"
                    onClick={crearSoloOrden}
                    disabled={isSubmitting}
                    className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                >
                    {isSubmitting ? 'Creando...' : 'Crear Orden'}
                </button>
                <button
                    type="button"
                    onClick={limpiar}
                    className="rounded-xl border border-slate-700 bg-slate-800/60 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-700"
                >
                    🗑️ Limpiar
                </button>
            </div>
        </div>
    );
}
