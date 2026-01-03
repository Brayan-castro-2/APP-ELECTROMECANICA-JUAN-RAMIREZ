'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000, // 5 minutos - los datos se consideran frescos
                        gcTime: 10 * 60 * 1000, // 10 minutos - tiempo en cache
                        refetchOnWindowFocus: false, // No recargar al cambiar de ventana
                        refetchOnMount: false, // No recargar al montar componente si hay cache
                        retry: 1, // Solo 1 reintento en caso de error
                    },
                },
            })
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
