'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { buscarVehiculoPorPatente, crearVehiculo, crearOrden, obtenerOrdenes, obtenerCitas, actualizarCita } from '@/lib/storage-adapter';
import { subirImagen } from '@/lib/local-storage-service';
import { consultarPatenteGetAPI, isGetAPIConfigured } from '@/lib/getapi-service';
import imageCompression from 'browser-image-compression';
import { DebtAlertModal } from '@/components/reception/debt-alert-modal';
import type { OrdenDB, CitaDB } from '@/lib/storage-adapter';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { INFINITE_ORDERS_QUERY_KEY, ORDERS_QUERY_KEY } from '@/hooks/use-orders';
import { DASHBOARD_ORDERS_QUERY_KEY } from '@/hooks/use-dashboard';

const MOCK_DB: Record<string, { marca: string; modelo: string; anio: string; motor: string }> = {
    PROFE1: { marca: 'Nissan', modelo: 'V16', anio: '2010', motor: '1.6 Twin Cam' },
    BBBB10: { marca: 'Toyota', modelo: 'Yaris', anio: '2018', motor: '1.5' },
    TEST01: { marca: 'Chevrolet', modelo: 'Sail', anio: '2020', motor: '1.4' },
};

const SERVICIOS_FRECUENTES = [
    { label: 'KM', descripcion: 'KM' },
    { label: 'DPF Electrónico', descripcion: 'DPF OFF ELECTRONICO' },
    { label: 'DPF Físico', descripcion: 'DPF FÍSICO' },
    { label: 'ADBLUE OFF', descripcion: 'ADBLUE OFF' },
    { label: 'Regeneración', descripcion: 'REGENERACIÓN' },
    { label: 'Scanner', descripcion: 'SCANNER' },
    { label: 'Airbag', descripcion: 'AIRBAG' },
];

type Servicio = { descripcion: string; precio: string };
type FocusTarget = { index: number; field: 'desc' | 'precio' } | null;

function formatMilesConPunto(value: string) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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

// Función para comprimir imágenes antes de subir
async function comprimirImagen(file: File): Promise<File> {
    const options = {
        maxSizeMB: 1, // Máximo 1MB
        maxWidthOrHeight: 1920, // Máximo 1920px de ancho/alto
        useWebWorker: true,
        fileType: 'image/jpeg', // Convertir a JPEG para mejor compresión
    };

    try {
        console.log(`📸 Comprimiendo imagen: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        const compressedFile = await imageCompression(file, options);
        console.log(`✅ Imagen comprimida: ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)}MB)`);
        return compressedFile;
    } catch (error) {
        console.error('❌ Error al comprimir imagen:', error);
        // Si falla la compresión, retornar el archivo original
        return file;
    }
}

function RecepcionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [fechaHora, setFechaHora] = useState(nowCL());
    const [mecanico, setMecanico] = useState('Técnico en Turno');
    const [isLoadingCita, setIsLoadingCita] = useState(false);

    // Form states - Consolidated
    const [patente, setPatente] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [anio, setAnio] = useState('');
    const [motor, setMotor] = useState('');

    const [kmActual, setKmActual] = useState('');
    const [kmNuevo, setKmNuevo] = useState('');
    const [kmEnabled, setKmEnabled] = useState(false);
    const [kmServiceIndex, setKmServiceIndex] = useState<number | null>(null);

    const [vehiculoLocked, setVehiculoLocked] = useState(false);
    const [estadoBusqueda, setEstadoBusqueda] = useState('');
    const [isBuscando, setIsBuscando] = useState(false);

    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteWhatsapp, setClienteWhatsapp] = useState('');
    const [email, setEmail] = useState(''); // Kept if needed later

    const [detallesVehiculo, setDetallesVehiculo] = useState('');
    const [fotos, setFotos] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const [formaPago, setFormaPago] = useState('efectivo');

    const [servicios, setServicios] = useState<Servicio[]>([
        { descripcion: '', precio: '' },
    ]);
    const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Debt alert modal state
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [debtData, setDebtData] = useState<{
        totalDebt: number;
        debtOrders: OrdenDB[];
        lastVisit?: { date: string; service: string };
    } | null>(null);

    // Load Appointment Data
    useEffect(() => {
        const citaId = searchParams.get('citaId');
        if (citaId) {
            const loadCita = async () => {
                setIsLoadingCita(true);
                try {
                    // Fetch all appointments (temporary solution, ideally fetch by ID)
                    const citas = await obtenerCitas();
                    const cita = citas.find(c => c.id === Number(citaId));

                    if (cita) {
                        setPatente(cita.patente_vehiculo || '');
                        setClienteNombre(cita.cliente_nombre || '');
                        setClienteWhatsapp(cita.cliente_telefono || '');

                        // Parse services/notes
                        const serviceDesc = cita.servicio_solicitado || '';

                        // Pre-fill services
                        if (serviceDesc) {
                            // Split by comma if multiple services
                            const serviceParts = serviceDesc.split(',').map(s => s.trim());
                            const mappedServices = serviceParts.map(desc => ({ descripcion: desc, precio: '' }));
                            setServicios(mappedServices);
                        }

                        // Trigger vehicle lookup if we have a patente
                        if (cita.patente_vehiculo) {
                            // Use existing search logic (will be triggered manually or we can call search function here)
                            // For now, let's just set the state and let the user verify/search
                        }
                    }
                } catch (error) {
                    console.error("Error loading appointment:", error);
                } finally {
                    setIsLoadingCita(false);
                }
            };
            loadCita();
        }
    }, [searchParams]);




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

    // Update KM service row automatically
    useEffect(() => {
        if (kmEnabled && kmActual && kmNuevo) {
            const descripcionKM = `KM`; // Simplified description
            setServicios(prev => {
                const newServicios = [...prev];
                if (kmServiceIndex !== null && newServicios[kmServiceIndex]) {
                    newServicios[kmServiceIndex] = { ...newServicios[kmServiceIndex], descripcion: descripcionKM };
                } else {
                    const emptyIdx = newServicios.findIndex(s => !s.descripcion);
                    if (emptyIdx >= 0) {
                        newServicios[emptyIdx] = { descripcion: descripcionKM, precio: '' };
                        setKmServiceIndex(emptyIdx);
                    } else {
                        newServicios.push({ descripcion: descripcionKM, precio: '' });
                        setKmServiceIndex(newServicios.length - 1);
                    }
                }
                return newServicios;
            });
        }
    }, [kmEnabled, kmActual, kmNuevo, kmServiceIndex]);

    // Check for debts when phone number changes (after typing complete phone)
    useEffect(() => {
        const cleanPhone = clienteWhatsapp.replace(/\D/g, '');
        // Solo verificar si tiene al menos 8 dígitos (número chileno mínimo)
        if (cleanPhone.length >= 8) {
            const timer = setTimeout(() => {
                checkForDebts(undefined, cleanPhone);
            }, 300); // Debounce reducido a 300ms para respuesta más rápida

            return () => clearTimeout(timer);
        }
    }, [clienteWhatsapp]);


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

                    // Check for debts
                    checkForDebts(p);
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

                        // Check for debts
                        checkForDebts(p);

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

                // Check for debts
                checkForDebts(p);
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

    // Check for debts after finding vehicle or entering phone
    const checkForDebts = async (patente?: string, phone?: string) => {
        try {
            console.log(`[Debt Check] Checking debts for patente: ${patente}, phone: ${phone}`);
            const allOrders = await obtenerOrdenes();

            // Filter orders for this patente OR phone
            const vehicleOrders = allOrders.filter(order => {
                const matchesPatente = patente && order.patente_vehiculo?.toUpperCase() === patente.toUpperCase();
                const matchesPhone = phone && order.cliente_telefono &&
                    order.cliente_telefono.replace(/\D/g, '') === phone.replace(/\D/g, '');
                return matchesPatente || matchesPhone;
            });

            const ordersWithDebt = vehicleOrders.filter(order =>
                order.metodos_pago?.some(mp => mp.metodo === 'debe')
            );

            const totalDebt = ordersWithDebt.reduce((sum, order) => {
                const debtAmount = order.metodos_pago
                    ?.filter(mp => mp.metodo === 'debe')
                    .reduce((acc, mp) => acc + mp.monto, 0) || 0;
                return sum + debtAmount;
            }, 0);

            // Find last visit (most recent order)
            let lastVisit;
            if (vehicleOrders.length > 0) {
                const sorted = [...vehicleOrders].sort((a, b) =>
                    new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime()
                );
                const lastOrder = sorted[0];
                lastVisit = {
                    date: lastOrder.fecha_ingreso,
                    service: lastOrder.detalle_trabajos || lastOrder.descripcion_ingreso || 'Servicio no especificado'
                };
            }

            console.log(`[Debt Check] Found ${ordersWithDebt.length} orders with debt, total: $${totalDebt}`);

            // Show modal if there's debt or visit history
            if (totalDebt > 0 || lastVisit) {
                setDebtData({
                    totalDebt,
                    debtOrders: ordersWithDebt,
                    lastVisit
                });
                setIsDebtModalOpen(true);
            }
        } catch (error) {
            console.error('[Debt Check] Error checking debts:', error);
        }
    };


    const agregarFila = (prefill?: { descripcion?: string }) => {
        setServicios((prev) => {
            if (prev.length === 1 && !prev[0].descripcion && !prev[0].precio) {
                const next = [{ descripcion: prefill?.descripcion || '', precio: '' }];
                setFocusTarget({ index: 0, field: prefill?.descripcion ? 'precio' : 'desc' });
                return next;
            }
            const next = [...prev, { descripcion: prefill?.descripcion || '', precio: '' }];
            const idx = next.length - 1;
            setFocusTarget({ index: idx, field: prefill?.descripcion ? 'precio' : 'desc' });
            return next;
        });
    };

    const eliminarFila = (index: number) => {
        setServicios((prev) => {
            const next = prev.filter((_, i) => i !== index);
            return next.length ? next : [{ descripcion: '', precio: '' }];
        });
    };

    const updateServicio = (index: number, patch: Partial<Servicio>) => {
        setServicios((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    };

    const agregarServicioFrecuente = (label: string, descripcion: string) => {
        // Toggle: si ya existe, lo quita. Si no existe, lo agrega.
        const existIdx = servicios.findIndex(s => s.descripcion === descripcion);
        if (existIdx >= 0) {
            eliminarFila(existIdx);
        } else {
            agregarFila({ descripcion });
        }
    };

    const activarServicioKm = () => {
        setKmEnabled(true);
    };

    const desactivarServicioKm = () => {
        setKmEnabled(false);
        setKmServiceIndex(null);
        if (kmServiceIndex !== null) {
            eliminarFila(kmServiceIndex);
        }
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
        if (!marca || !modelo || !anio) {
            alert('Completa los datos del vehículo (Marca, Modelo, Año).');
            return;
        }

        const serviciosForOrder = servicios
            .map((s) => ({ descripcion: s.descripcion.trim(), precio: parsePrecio(s.precio) }))
            .filter((s) => s.descripcion || s.precio);

        if (serviciosForOrder.length === 0) {
            alert('Agrega al menos un servicio.');
            return;
        }

        const expandirDesc = (desc: string) => {
            const d = desc.toUpperCase().trim();
            if (d === 'KM') return 'REPARACION DE KILOMETRAJE';
            if (d === 'DPF OFF ELECTRONICO' || d === 'DPF ELECTRÓNICO') return 'DPF OFF ELECTRONICO';
            if (d === 'DPF FÍSICO' || d === 'DPF FISICO') return 'VACIADO FÍSICO';
            if (d === 'ADBLUE OFF') return 'ADBLUE OFF ELECTRÓNICO';
            if (d === 'REGENERACIÓN' || d === 'REGENERACION') return 'REGENERACIÓN FILTRO PARTÍCULAS';
            if (d === 'SCANNER') return 'DIAGNÓSTICO CON SCANNER';
            if (d === 'AIRBAG') return 'REPARACION SISTEMA AIRBAG';
            return desc;
        };

        const descripcionIngreso = serviciosForOrder
            .map((s) => {
                const descExpanded = expandirDesc(s.descripcion);
                return s.precio > 0 ? `${descExpanded} - $${moneyCL(s.precio)}` : descExpanded;
            })
            .filter((value, index, self) => self.indexOf(value) === index)
            .join('\n');

        // Detalle completo con precios para el registro interno (detalle_trabajos)
        const detalleServicios = serviciosForOrder
            .map((s) => `- ${s.descripcion || 'Servicio'}: $${moneyCL(s.precio)}`)
            .join('\n');

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

            // Convert KM values properly
            const kmIngresoValue = kmActual ? parseInt(kmActual.replace(/\D/g, '')) : undefined;
            const kmSalidaValue = kmNuevo ? parseInt(kmNuevo.replace(/\D/g, '')) : undefined;

            console.log('💾 Guardando KM - Ingreso:', kmIngresoValue, 'Salida:', kmSalidaValue);

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
                kilometraje: kmIngresoValue,
                kilometraje_salida: kmSalidaValue,
            });

            const currentCitaId = searchParams.get('citaId');

            if (orden) {
                // Si venimos de una cita, actualizar su estado
                if (currentCitaId) {
                    try {
                        await actualizarCita(Number(currentCitaId), { estado: 'confirmada' });
                        console.log(`✅ Cita #${currentCitaId} marcada como confirmada`);
                    } catch (err) {
                        console.error('Error actualizando estado de cita:', err);
                    }
                }
            }

            if (!orden) {
                alert('No se pudo crear la orden.');
                return;
            }

            setSuccessMsg(`Orden #${orden.id} creada`);

            // Invalidar caché para que la nueva orden aparezca inmediatamente
            await queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
            await queryClient.invalidateQueries({ queryKey: INFINITE_ORDERS_QUERY_KEY });
            await queryClient.invalidateQueries({ queryKey: DASHBOARD_ORDERS_QUERY_KEY });
            await queryClient.invalidateQueries({ queryKey: ['appointments'] });

            if (user.role === 'admin') {
                // Redirigir a lista de órdenes para admin
                router.push('/admin/ordenes');
            } else {
                limpiar();
                // Limpiar param de URL si existía
                if (currentCitaId) {
                    router.replace('/recepcion');
                }
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
        setKmActual('');
        setKmNuevo('');
        setKmEnabled(false);
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
        <div className="mx-auto max-w-5xl space-y-6 px-4 md:px-0">
            {successMsg ? (
                <div className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2">
                        <span className="font-semibold">{successMsg}</span>
                    </div>
                </div>
            ) : null}

            <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 px-4 py-4 md:px-6 md:py-5 shadow">
                <div className="text-lg md:text-xl font-bold text-white">Nueva Orden de Trabajo</div>
                <div className="mt-1 text-xs md:text-sm text-blue-100">{fechaHora}</div>
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

                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
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
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 md:py-4 text-center font-mono text-xl md:text-2xl font-bold uppercase tracking-widest text-white"
                            maxLength={6}
                        />
                        <div className="mt-2 text-xs text-slate-400">Ejemplos: PROFE1, BBBB10, TEST01</div>
                    </div>

                    <button
                        type="button"
                        onClick={buscarPatente}
                        disabled={isBuscando}
                        className="h-[50px] md:h-[54px] rounded-xl bg-blue-600 px-6 md:px-8 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
                    {SERVICIOS_FRECUENTES.map((s) => {
                        const isKm = s.label === 'KM';
                        const isActive = isKm ? kmEnabled : servicios.some(srv => srv.descripcion === s.descripcion);
                        return (
                            <button
                                key={s.label}
                                type="button"
                                onClick={() => {
                                    if (isKm) {
                                        if (kmEnabled) {
                                            desactivarServicioKm();
                                        } else {
                                            activarServicioKm();
                                        }
                                    } else {
                                        agregarServicioFrecuente(s.label, s.descripcion);
                                    }
                                }}
                                className={isActive
                                    ? 'rounded-full border border-blue-500 bg-blue-600/30 px-3 py-2 text-sm font-semibold text-blue-100'
                                    : 'rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700'
                                }
                            >
                                {isActive ? '✅' : '🔘'} {s.label}
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => agregarFila()}
                        className="rounded-full border border-dashed border-slate-600 bg-slate-800/40 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
                    >
                        ✏️ Otro
                    </button>
                </div>


                {kmEnabled && (
                    <div className="mb-4 grid gap-4 rounded-xl border border-slate-700 bg-slate-800/30 p-4 md:grid-cols-2 animate-in slide-in-from-top-2">
                        <div>
                            <label className="text-sm font-semibold text-slate-200">KM actual</label>
                            <input
                                value={formatMilesConPunto(kmActual)}
                                onChange={(e) => setKmActual(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="Ej: 200.000"
                                inputMode="numeric"
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-2xl font-bold font-mono tracking-wide text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-200">KM nuevo</label>
                            <input
                                value={formatMilesConPunto(kmNuevo)}
                                onChange={(e) => setKmNuevo(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="Ej: 120.000"
                                inputMode="numeric"
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-2xl font-bold font-mono tracking-wide text-white"
                            />
                        </div>
                    </div>
                )}


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
                                // Comprimir imágenes antes de subir
                                const compressedFiles = await Promise.all(files.map(comprimirImagen));
                                const uploads = await Promise.all(compressedFiles.map((f) => subirImagen(f, 'ordenes')));
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
                                // Comprimir imágenes antes de subir
                                const compressedFiles = await Promise.all(files.map(comprimirImagen));
                                const uploads = await Promise.all(compressedFiles.map((f) => subirImagen(f, 'ordenes')));
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


            {/* Debt Alert Modal */}
            {
                debtData && (
                    <DebtAlertModal
                        isOpen={isDebtModalOpen}
                        onClose={() => setIsDebtModalOpen(false)}
                        onProceed={() => {
                            console.log('[Debt Modal] User chose to proceed anyway');
                        }}
                        patente={patente}
                        totalDebt={debtData?.totalDebt ?? 0}
                        debtOrders={debtData?.debtOrders ?? []}
                        lastVisit={debtData?.lastVisit}
                    />
                )
            }
        </div >
    );
}

export default function RecepcionPage() {
    return (
        <Suspense fallback={
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-400">Cargando recepción...</span>
            </div>
        }>
            <RecepcionContent />
        </Suspense>
    );
}
