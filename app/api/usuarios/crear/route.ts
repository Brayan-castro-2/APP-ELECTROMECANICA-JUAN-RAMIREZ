import { NextRequest, NextResponse } from 'next/server';
import { crearUsuario } from '@/lib/supabase-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, nombreCompleto, rol } = body;

        // Validar datos
        if (!email || !password || !nombreCompleto || !rol) {
            return NextResponse.json(
                { success: false, error: 'Faltan datos requeridos' },
                { status: 400 }
            );
        }

        // Validar que el email termine con @taller.cl
        if (!email.endsWith('@taller.cl')) {
            return NextResponse.json(
                { success: false, error: 'El email debe terminar con @taller.cl' },
                { status: 400 }
            );
        }

        if (password.length < 4) {
            return NextResponse.json(
                { success: false, error: 'La contraseña debe tener al menos 4 caracteres' },
                { status: 400 }
            );
        }

        // Crear usuario usando la función del servidor
        const result = await crearUsuario(email, password, nombreCompleto, rol);

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error en API de crear usuario:', error);
        return NextResponse.json(
            { success: false, error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
