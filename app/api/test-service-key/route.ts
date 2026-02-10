import { NextResponse } from 'next/server';

export async function GET() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    return NextResponse.json({
        hasServiceKey: !!serviceKey,
        keyLength: serviceKey?.length || 0,
        keyPrefix: serviceKey?.substring(0, 20) || 'NOT_FOUND',
        allEnvVars: {
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        }
    });
}
