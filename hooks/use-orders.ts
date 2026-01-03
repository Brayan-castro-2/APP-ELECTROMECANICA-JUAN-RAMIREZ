import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { obtenerOrdenes, eliminarOrden, actualizarOrden } from '@/lib/storage-adapter';
import { OrdenDB } from '@/lib/supabase';

export const ORDERS_QUERY_KEY = ['orders'];

export function useOrders() {
    return useQuery({
        queryKey: ORDERS_QUERY_KEY,
        queryFn: obtenerOrdenes,
        staleTime: 5 * 60 * 1000, // 5 minutos
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
