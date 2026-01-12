import { useQuery, useQueryClient } from '@tanstack/react-query';
import { obtenerPerfiles } from '@/lib/storage-adapter';

export const USERS_QUERY_KEY = ['users'];

export function useUsers() {
    return useQuery({
        queryKey: USERS_QUERY_KEY,
        queryFn: obtenerPerfiles,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

export function usePrefetchUsers() {
    const queryClient = useQueryClient();
    
    return () => {
        queryClient.prefetchQuery({
            queryKey: USERS_QUERY_KEY,
            queryFn: obtenerPerfiles,
        });
    };
}

export function useInvalidateUsers() {
    const queryClient = useQueryClient();
    
    return () => {
        queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    };
}
