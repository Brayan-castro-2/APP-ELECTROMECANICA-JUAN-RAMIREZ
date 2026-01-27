import { useQuery, useQueryClient, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { obtenerOrdenes, obtenerOrdenesCount, eliminarOrden, actualizarOrden } from '@/lib/storage-adapter';
import { OrdenDB } from '@/lib/supabase';

export const ORDERS_QUERY_KEY = ['orders'];
export const INFINITE_ORDERS_QUERY_KEY = ['orders-infinite'];

export function useOrders() {
    return useQuery({
        queryKey: ORDERS_QUERY_KEY,
        queryFn: () => obtenerOrdenes(), // Wrap to match queryFn signature
        staleTime: 0, // Siempre considerar datos obsoletos
        gcTime: 2 * 60 * 1000, // 2 minutos en caché
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true, // Refetch al montar componente
        refetchInterval: 15000, // Auto-actualizar cada 15 segundos (más rápido)
        refetchIntervalInBackground: true,
    });
}

// Infinite scroll hook
export function useInfiniteOrders() {
    return useInfiniteQuery({
        queryKey: INFINITE_ORDERS_QUERY_KEY,
        queryFn: async ({ pageParam = 0 }) => {
            const limit = 20;
            const orders = await obtenerOrdenes({ limit, offset: pageParam });
            return { orders, nextOffset: pageParam + limit };
        },
        getNextPageParam: (lastPage, allPages) => {
            // If we got less than 20 orders, we've reached the end
            if (lastPage.orders.length < 20) {
                return undefined;
            }
            return lastPage.nextOffset;
        },
        initialPageParam: 0,
        staleTime: 0,
        gcTime: 2 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
}

// Get total count
export function useOrdersCount() {
    return useQuery({
        queryKey: [...ORDERS_QUERY_KEY, 'count'],
        queryFn: () => obtenerOrdenesCount(), // Wrap to match queryFn signature
        staleTime: 30000, // Cache count for 30 seconds
    });
}

export function usePrefetchOrders() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.prefetchQuery({
            queryKey: ORDERS_QUERY_KEY,
            queryFn: () => obtenerOrdenes(), // Wrap to match queryFn signature
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
