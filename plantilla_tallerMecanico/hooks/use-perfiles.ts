import { useQuery } from '@tanstack/react-query';
import { obtenerPerfiles } from '@/lib/storage-adapter';

export const PERFILES_QUERY_KEY = ['perfiles'];

export function usePerfiles() {
    return useQuery({
        queryKey: PERFILES_QUERY_KEY,
        queryFn: obtenerPerfiles,
        staleTime: 10 * 60 * 1000, // 10 minutos - los perfiles cambian poco
        gcTime: 30 * 60 * 1000, // 30 minutos en caché
        refetchOnWindowFocus: false, // No refrescar automáticamente
    });
}
