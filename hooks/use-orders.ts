import { useQuery, useQueryClient } from '@tanstack/react-query';
import { obtenerOrdenes } from '@/lib/storage-adapter';
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
