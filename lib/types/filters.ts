export interface DateFilter {
    year?: number;
    month?: number; // 1-12
    startDate?: Date;
    endDate?: Date;
}

export interface FilteredStats {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
}
