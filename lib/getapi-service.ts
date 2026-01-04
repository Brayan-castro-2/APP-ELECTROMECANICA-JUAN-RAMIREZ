// Servicio para consultar patentes de vehículos chilenos usando GetAPI
// Documentación: https://getapi.cl
// API Key: 59a683af-8a30-47b9-9a22-f1a6a35ebf29

const GETAPI_BASE_URL = 'https://chile.getapi.cl/v1/vehicles/plate';

// Estructura de respuesta de la API según documentación oficial
export interface GetAPIVehicleData {
    id: string;
    licensePlate: string;
    dvLicensePlate: string;
    modelId: string;
    version: string;
    mileage: number | null;
    color: string;
    year: number;
    codeSii: string | null;
    vinNumber: string;
    engineNumber: string;
    engine: string;
    fuel: string;
    transmission: string;
    doors: number;
    urlImage: string;
    model: {
        id: string;
        name: string;
        typeVehicle: {
            name: string;
        };
        brand: {
            name: string;
        };
    };
    monthRT: string;
}

export interface GetAPIResponse {
    success: boolean;
    status: number;
    data: GetAPIVehicleData;
}

export interface GetAPIVehicleResponse {
    patente: string;
    marca: string;
    modelo: string;
    anio: string;
    motor?: string;
    color?: string;
    tipo?: string;
    combustible?: string;
}

export interface GetAPIError {
    error: string;
    message: string;
}

/**
 * Consulta información de un vehículo por su patente usando GetAPI
 * @param patente - Patente del vehículo (formato chileno)
 * @returns Información del vehículo o null si no se encuentra
 */
export async function consultarPatenteGetAPI(patente: string): Promise<GetAPIVehicleResponse | null> {
    const apiKey = process.env.NEXT_PUBLIC_GETAPI_KEY;
    
    // Si no hay API key configurada, retornar null para usar datos mock
    if (!apiKey) {
        console.warn('⚠️ NEXT_PUBLIC_GETAPI_KEY no configurada. Usando datos mock.');
        return null;
    }

    try {
        const patenteNormalizada = patente.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        console.log(`🔍 Consultando patente ${patenteNormalizada} en GetAPI...`);
        
        // Usar nuestra API route para evitar problemas de CORS
        const response = await fetch(`/api/vehiculo?patente=${patenteNormalizada}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.log(`❌ Patente ${patenteNormalizada} no encontrada en GetAPI`);
                return null;
            }
            
            if (response.status === 429) {
                console.error('⚠️ Límite de consultas excedido en GetAPI');
                throw new Error('Límite de consultas excedido. Intenta nuevamente en unos minutos.');
            }

            if (response.status === 401 || response.status === 403) {
                console.error('⚠️ API Key inválida, expirada o sin créditos');
                // No lanzar error, solo retornar null para permitir entrada manual
                return null;
            }

            const errorData = await response.json().catch(() => null) as GetAPIError | null;
            console.warn(`⚠️ Error ${response.status} en GetAPI:`, errorData?.error);
            // Retornar null en lugar de lanzar error para permitir entrada manual
            return null;
        }

        const apiResponse = await response.json() as GetAPIResponse;
        console.log(`✅ Vehículo encontrado en GetAPI:`, apiResponse);
        
        // Transformar la respuesta de la API al formato que usa la app
        if (apiResponse.success && apiResponse.data) {
            const vehiculo = apiResponse.data;
            const transformed: GetAPIVehicleResponse = {
                patente: vehiculo.licensePlate,
                marca: vehiculo.model.brand.name,
                modelo: vehiculo.model.name,
                anio: vehiculo.year.toString(),
                motor: vehiculo.engine,
                color: vehiculo.color,
                tipo: vehiculo.model.typeVehicle.name,
                combustible: vehiculo.fuel,
            };
            console.log(`✅ Datos transformados:`, transformed);
            return transformed;
        }
        
        console.warn('⚠️ Respuesta de API sin datos válidos');
        return null;
    } catch (error) {
        if (error instanceof Error) {
            console.error('❌ Error consultando GetAPI:', error.message);
            // Re-lanzar errores específicos de la API
            if (error.message.includes('Límite') || error.message.includes('API Key')) {
                throw error;
            }
        }
        // Para otros errores (red, timeout, etc), retornar null para usar fallback
        console.error('❌ Error de red o timeout. Usando datos locales.');
        return null;
    }
}

/**
 * Verifica si la API key está configurada y es válida
 * @returns true si la API está lista para usar
 */
export function isGetAPIConfigured(): boolean {
    return !!process.env.NEXT_PUBLIC_GETAPI_KEY;
}

/**
 * Obtiene información sobre el estado de la API
 */
export function getAPIStatus(): { configured: boolean; key: string } {
    const apiKey = process.env.NEXT_PUBLIC_GETAPI_KEY;
    return {
        configured: !!apiKey,
        key: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'No configurada'
    };
}
