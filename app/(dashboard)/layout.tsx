'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { NetworkStatus } from '@/components/network-status';
import { UpdateAnnouncement } from '@/components/update-announcement';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#121212] overflow-x-hidden">
                <UpdateAnnouncement />
                <NetworkStatus />
                <Header />
                <div className="flex overflow-x-hidden">
                    <Sidebar />
                    {/* Main content - adjusted for sidebar on desktop, bottom nav on mobile */}
                    <main className="flex-1 md:ml-64 pb-24 md:pb-6 overflow-x-hidden">
                        <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
