import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { obtenerOrdenes, eliminarOrden, actualizarOrden } from '@/lib/storage-adapter';
import { OrdenDB } from '@/lib/supabase';

export const ORDERS_QUERY_KEY = ['orders'];

export function useOrders() {
    return useQuery({
        queryKey: ORDERS_QUERY_KEY,
        queryFn: obtenerOrdenes,
        staleTime: 0, // Siempre considerar datos obsoletos
        gcTime: 2 * 60 * 1000, // 2 minutos en caché
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true, // Refetch al montar componente
        refetchInterval: 15000, // Auto-actualizar cada 15 segundos (más rápido)
        refetchIntervalInBackground: true,
    });
}

export function usePrefetchOrders() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.prefetchQuery({
            queryKey: ORDERS_QUERY_KEY,
            queryFn: obtenerOrdenes,
        });
    };
}

export function useInvalidateOrders() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    };
}

export function useDeleteOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (orderId: number) => eliminarOrden(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
        },
    });
}

export function useUpdateOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: number; updates: Partial<Omit<OrdenDB, 'id' | 'fecha_ingreso'>> }) =>
            actualizarOrden(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
        },
    });
}
