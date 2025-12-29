'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#121212]">
                <Header />
                <div className="flex">
                    <Sidebar />
                    {/* Main content - adjusted for sidebar on desktop, bottom nav on mobile */}
                    <main className="flex-1 md:ml-64 pb-24 md:pb-6">
                        <div className="p-4 md:p-6 max-w-5xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
