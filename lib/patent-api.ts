// Servicio para obtener datos de vehículos por patente
// Implementa un mock para demostración y estructura para API real

// ========================================
// CONFIGURACIÓN DE API REAL
// ========================================
// Cuando contrates la API de patentes, configura aquí:
const PATENT_API_CONFIG = {
    enabled: false, // Cambiar a true cuando tengas la API
    url: process.env.NEXT_PUBLIC_PATENT_API_URL || '', // URL de la API
    apiKey: process.env.NEXT_PUBLIC_PATENT_API_KEY || '', // Tu API Key
    timeout: 5000, // Timeout en ms
};

export interface VehicleData {
    patente: string;
    marca: string;
    modelo: string;
    anio: string;
    color: string;
    motor?: string;
    chasis?: string;
    combustible?: string;
}

// Base de datos simulada para la demo
const MOCK_DB: Record<string, VehicleData> = {
    'ABCD12': {
        patente: 'ABCD12',
        marca: 'Toyota',
        modelo: 'Yaris',
        anio: '2019',
        color: 'Gris Plata',
        motor: '1.5cc',
        combustible: 'Bencina'
    },
    'AAAA11': {
        patente: 'AAAA11',
        marca: 'Hyundai',
        modelo: 'Accent',
        anio: '2018',
        color: 'Blanco',
        motor: '1.4cc',
        combustible: 'Bencina'
    },
    'BBBB10': {
        patente: 'BBBB10',
        marca: 'Chevrolet',
        modelo: 'Sail',
        anio: '2020',
        color: 'Azul',
        motor: '1.5cc',
        combustible: 'Bencina'
    },
    'CCCC20': {
        patente: 'CCCC20',
        marca: 'Kia',
        modelo: 'Rio 5',
        anio: '2021',
        color: 'Rojo',
        motor: '1.4cc',
        combustible: 'Bencina'
    },
    'DDDD30': {
        patente: 'DDDD30',
        marca: 'Nissan',
        modelo: 'Morning',
        anio: '2017',
        color: 'Negro',
        motor: '1.2cc',
        combustible: 'Bencina'
    }
};

// Función para llamar a la API real de patentes
async function fetchFromRealAPI(patente: string): Promise<VehicleData | null> {
    if (!PATENT_API_CONFIG.enabled || !PATENT_API_CONFIG.url || !PATENT_API_CONFIG.apiKey) {
        return null;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PATENT_API_CONFIG.timeout);

        const response = await fetch(`${PATENT_API_CONFIG.url}/patente/${patente}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PATENT_API_CONFIG.apiKey}`,
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn('API de patentes no disponible:', response.status);
            return null;
        }

        const data = await response.json();
        
        // Adaptar respuesta de la API al formato VehicleData
        // NOTA: Ajusta estos campos según la respuesta real de tu API
        return {
            patente: data.patente || patente,
            marca: data.marca || '',
            modelo: data.modelo || '',
            anio: data.anio || data.año || '',
            color: data.color || '',
            motor: data.motor || data.motorización || '',
            chasis: data.chasis || data.vin || '',
            combustible: data.combustible || data.tipoCombustible || '',
        };
    } catch (error) {
        console.error('Error consultando API de patentes:', error);
        return null;
    }
}

export async function getVehicleData(patente: string): Promise<VehicleData | null> {
    // Normalizar patente
    const cleanPatente = patente.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // 1. Intentar API real primero (si está habilitada)
    if (PATENT_API_CONFIG.enabled) {
        console.log('🔍 Consultando API real de patentes...');
        const apiResult = await fetchFromRealAPI(cleanPatente);
        if (apiResult) {
            console.log('✅ Datos obtenidos de API real');
            return apiResult;
        }
        console.log('⚠️ API real no disponible, usando datos mock');
    }

    // 2. Simular delay de red para mock
    await new Promise(resolve => setTimeout(resolve, 800));

    // 3. Buscar en base de datos mock (fallback)
    if (MOCK_DB[cleanPatente]) {
        return MOCK_DB[cleanPatente];
    }

    // 3. Generar datos aleatorios "realistas" si no existe (para que la demo nunca falle)
    // Esto asegura que el formulario nunca se sienta "vacío"
    const marcas = ['Suzuki', 'Mazda', 'Ford', 'Volkswagen', 'Peugeot'];
    const modelos = ['Swift', '3', 'Focus', 'Gol', '208'];
    const colores = ['Blanco', 'Gris', 'Negro', 'Rojo', 'Azul'];
    const anios = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022'];

    const randomMarca = marcas[Math.floor(Math.random() * marcas.length)];
    const randomModelo = modelos[Math.floor(Math.random() * modelos.length)];
    const randomColor = colores[Math.floor(Math.random() * colores.length)];
    const randomAnio = anios[Math.floor(Math.random() * anios.length)];

    return {
        patente: cleanPatente,
        marca: randomMarca,
        modelo: randomModelo,
        anio: randomAnio,
        color: randomColor,
        motor: '1.6cc',
        combustible: 'Bencina'
    };
}
