import { useQuery, useQueryClient } from '@tanstack/react-query';
import { obtenerCitas } from '@/lib/storage-adapter';
import { CitaDB } from '@/lib/supabase';

export const APPOINTMENTS_QUERY_KEY = ['appointments'];

export function useAppointments() {
    return useQuery({
        queryKey: APPOINTMENTS_QUERY_KEY,
        queryFn: obtenerCitas,
        staleTime: 0,
        gcTime: 2 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
        refetchInterval: 15000, // Same as orders
        refetchIntervalInBackground: true,
    });
}

export function useInvalidateAppointments() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
    };
}
