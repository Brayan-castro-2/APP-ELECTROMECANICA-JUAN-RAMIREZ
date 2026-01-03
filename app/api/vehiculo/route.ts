import { NextRequest, NextResponse } from 'next/server';

const GETAPI_BASE_URL = 'https://chile.getapi.cl/v1/vehiculos/placa';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const patente = searchParams.get('patente');
    
    if (!patente) {
        return NextResponse.json(
            { error: 'Patente es requerida' },
            { status: 400 }
        );
    }

    const apiKey = process.env.NEXT_PUBLIC_GETAPI_KEY;
    
    if (!apiKey) {
        return NextResponse.json(
            { error: 'API Key no configurada' },
            { status: 500 }
        );
    }

    try {
        const patenteNormalizada = patente.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        console.log(`🔍 [API Route] Consultando patente ${patenteNormalizada} en GetAPI...`);
        
        const response = await fetch(`${GETAPI_BASE_URL}/${patenteNormalizada}`, {
            method: 'GET',
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.log(`❌ [API Route] Patente ${patenteNormalizada} no encontrada`);
                return NextResponse.json(
                    { error: 'Patente no encontrada' },
                    { status: 404 }
                );
            }
            
            if (response.status === 429) {
                console.error('⚠️ [API Route] Límite de consultas excedido');
                return NextResponse.json(
                    { error: 'Límite de consultas excedido' },
                    { status: 429 }
                );
            }

            if (response.status === 401) {
                console.error('⚠️ [API Route] API Key inválida');
                return NextResponse.json(
                    { error: 'API Key inválida' },
                    { status: 401 }
                );
            }

            const errorText = await response.text();
            console.error(`❌ [API Route] Error ${response.status}:`, errorText);
            return NextResponse.json(
                { error: `Error ${response.status} al consultar GetAPI` },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log(`✅ [API Route] Vehículo encontrado:`, data);
        
        return NextResponse.json(data);
    } catch (error) {
        console.error('❌ [API Route] Error:', error);
        return NextResponse.json(
            { error: 'Error al consultar la API de vehículos' },
            { status: 500 }
        );
    }
}
