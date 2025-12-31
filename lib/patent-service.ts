/**
 * Servicio de búsqueda de patentes chilenas con sistema de failover
 * Implementa cascada de APIs con contadores diarios y persistencia en localStorage
 */

export interface APISource {
    name: string;
    url: string;
    method: 'GET' | 'POST';
    dailyLimit: number;
    used: number;
    active: boolean;
    timeout?: number;
}

export interface VehicleData {
    source: string;
    marca: string;
    modelo: string;
    anio: number;
    motor?: string;
    patente: string;
}

interface StorageData {
    date: string;
    counters: Record<string, number>;
}

export class PatentService {
    private apiSources: APISource[];
    private storageKey = 'patent_api_counters';
    private today: string;

    constructor() {
        this.today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Definir las APIs disponibles
        this.apiSources = [
            {
                name: 'LibreAPI',
                url: 'https://api.libreapi.cl/vehicle/plates/{patente}',
                method: 'GET',
                dailyLimit: 100,
                used: 0,
                active: true,
                timeout: 5000
            },
            {
                name: 'BackupAPI',
                url: 'https://api.backup-service.cl/vehicle/{patente}',
                method: 'GET',
                dailyLimit: 50,
                used: 0,
                active: true,
                timeout: 5000
            },
            {
                name: 'PaidAPI',
                url: 'https://api.premium-service.cl/v1/vehicles/{patente}',
                method: 'GET',
                dailyLimit: 500,
                used: 0,
                active: true,
                timeout: 8000
            }
        ];

        this.loadCounters();
    }

    /**
     * Busca información de una patente usando el sistema de failover
     */
    async buscarPatente(patente: string): Promise<VehicleData> {
        const patenteNormalizada = patente.toUpperCase().trim();

        if (!patenteNormalizada) {
            throw new Error('Patente inválida');
        }

        console.log(`🔍 Buscando patente: ${patenteNormalizada}`);

        // Intentar con cada API en orden
        for (const api of this.apiSources) {
            if (!api.active) {
                console.log(`⏭️ ${api.name} está desactivada, saltando...`);
                continue;
            }

            if (api.used >= api.dailyLimit) {
                console.warn(`⚠️ ${api.name} alcanzó su límite diario (${api.dailyLimit}), saltando...`);
                continue;
            }

            try {
                console.log(`🔄 Intentando con ${api.name} (${api.used}/${api.dailyLimit} usados)...`);
                
                const data = await this.fetchFromAPI(api, patenteNormalizada);
                
                // Éxito: incrementar contador y guardar
                api.used++;
                this.saveCounters();
                
                console.log(`✅ Datos obtenidos desde ${api.name}`);
                
                return {
                    source: api.name,
                    patente: patenteNormalizada,
                    ...data
                };

            } catch (error) {
                console.error(`❌ Error en ${api.name}:`, error instanceof Error ? error.message : error);
                // Continuar con la siguiente API
            }
        }

        // Si todas las APIs fallaron
        throw new Error('Todas las APIs fallaron. Por favor ingrese los datos manualmente.');
    }

    /**
     * Realiza la petición HTTP a una API específica
     */
    private async fetchFromAPI(api: APISource, patente: string): Promise<Omit<VehicleData, 'source' | 'patente'>> {
        const url = api.url.replace('{patente}', patente);
        
        // Crear AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), api.timeout || 5000);

        try {
            const response = await fetch(url, {
                method: api.method,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Parsear respuesta según la API
            return this.parseAPIResponse(api.name, data);

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Timeout: La API no respondió a tiempo');
            }
            
            throw error;
        }
    }

    /**
     * Parsea la respuesta de cada API según su formato
     */
    private parseAPIResponse(apiName: string, data: any): Omit<VehicleData, 'source' | 'patente'> {
        switch (apiName) {
            case 'LibreAPI':
                // Formato esperado de LibreAPI
                return {
                    marca: data.data?.brand || data.marca || 'Desconocido',
                    modelo: data.data?.model || data.modelo || 'Desconocido',
                    anio: parseInt(data.data?.year || data.anio || '0'),
                    motor: data.data?.engine || data.motor
                };

            case 'BackupAPI':
                // Formato de API de respaldo
                return {
                    marca: data.vehicle?.brand || 'Desconocido',
                    modelo: data.vehicle?.model || 'Desconocido',
                    anio: parseInt(data.vehicle?.year || '0'),
                    motor: data.vehicle?.engine
                };

            case 'PaidAPI':
                // Formato de API premium
                return {
                    marca: data.result?.make || 'Desconocido',
                    modelo: data.result?.model || 'Desconocido',
                    anio: parseInt(data.result?.year || '0'),
                    motor: data.result?.engineType
                };

            default:
                throw new Error('Formato de API desconocido');
        }
    }

    /**
     * Carga los contadores desde localStorage
     */
    private loadCounters(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            
            if (!stored) {
                console.log('📊 No hay contadores guardados, iniciando desde cero');
                return;
            }

            const data: StorageData = JSON.parse(stored);

            // Si es un nuevo día, reiniciar contadores
            if (data.date !== this.today) {
                console.log('📅 Nuevo día detectado, reiniciando contadores');
                this.resetCounters();
                return;
            }

            // Restaurar contadores del día actual
            this.apiSources.forEach(api => {
                if (data.counters[api.name] !== undefined) {
                    api.used = data.counters[api.name];
                }
            });

            console.log('📊 Contadores cargados:', data.counters);

        } catch (error) {
            console.error('Error al cargar contadores:', error);
            this.resetCounters();
        }
    }

    /**
     * Guarda los contadores en localStorage
     */
    private saveCounters(): void {
        try {
            const counters: Record<string, number> = {};
            
            this.apiSources.forEach(api => {
                counters[api.name] = api.used;
            });

            const data: StorageData = {
                date: this.today,
                counters
            };

            localStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('💾 Contadores guardados:', counters);

        } catch (error) {
            console.error('Error al guardar contadores:', error);
        }
    }

    /**
     * Reinicia todos los contadores a 0
     */
    private resetCounters(): void {
        this.apiSources.forEach(api => {
            api.used = 0;
        });
        this.saveCounters();
    }

    /**
     * Obtiene el estado actual de las APIs
     */
    getAPIStatus(): Array<{name: string; used: number; limit: number; available: number; active: boolean}> {
        return this.apiSources.map(api => ({
            name: api.name,
            used: api.used,
            limit: api.dailyLimit,
            available: api.dailyLimit - api.used,
            active: api.active
        }));
    }

    /**
     * Activa o desactiva una API específica
     */
    setAPIActive(apiName: string, active: boolean): void {
        const api = this.apiSources.find(a => a.name === apiName);
        if (api) {
            api.active = active;
            console.log(`${active ? '✅' : '❌'} ${apiName} ${active ? 'activada' : 'desactivada'}`);
        }
    }

    /**
     * Reinicia manualmente los contadores (útil para testing)
     */
    manualReset(): void {
        console.log('🔄 Reinicio manual de contadores');
        this.resetCounters();
    }
}

// Exportar instancia singleton
export const patentService = new PatentService();
