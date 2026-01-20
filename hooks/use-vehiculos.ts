import { useQuery } from '@tanstack/react-query';
import { obtenerVehiculos } from '@/lib/storage-adapter';

export const VEHICULOS_QUERY_KEY = ['vehiculos'];

export function useVehiculos() {
    return useQuery({
        queryKey: VEHICULOS_QUERY_KEY,
        queryFn: obtenerVehiculos,
        staleTime: 5 * 60 * 1000, // 5 minutos - los vehículos cambian ocasionalmente
        gcTime: 15 * 60 * 1000, // 15 minutos en caché
        refetchOnWindowFocus: false, // No refrescar automáticamente
    });
}
