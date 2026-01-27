import { useQuery } from '@tanstack/react-query';
import { obtenerOrdenesLight } from '@/lib/storage-adapter';

export const DASHBOARD_ORDERS_QUERY_KEY = ['orders', 'dashboard'];

export function useDashboardOrders() {
    return useQuery({
        queryKey: DASHBOARD_ORDERS_QUERY_KEY,
        queryFn: () => obtenerOrdenesLight(),
        staleTime: 5 * 60 * 1000, // 5 minutos de cache (menos crítico que órdenes en tiempo real)
        gcTime: 10 * 60 * 1000, // 10 minutos
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchInterval: 30000, // Cada 30 seg
    });
}
