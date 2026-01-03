-- ============================================
-- CREAR USUARIOS EN SUPABASE AUTH
-- ============================================
-- Ejecuta este SQL en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query > Pega y ejecuta

-- IMPORTANTE: Estos usuarios se crean en auth.users (sistema de autenticación)
-- Las contraseñas están hasheadas con bcrypt

-- 1. Rodrigo (Pass: 1986)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'rodrigo@taller.cl',
    crypt('1986', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Rodrigo"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- 2. Juan (Pass: 1989)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'juan@taller.cl',
    crypt('1989', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Juan"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- 3. Francisco (Pass: 2001)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'francisco@taller.cl',
    crypt('2001', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Francisco"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- 4. Javier (Pass: 2280)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'javier@taller.cl',
    crypt('2280', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Javier"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- ============================================
-- VERIFICAR QUE SE CREARON CORRECTAMENTE
-- ============================================
-- Ejecuta esta query para ver los usuarios creados:
SELECT 
    email,
    raw_user_meta_data->>'nombre' as nombre,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email LIKE '%@taller.cl'
ORDER BY created_at DESC;

-- ============================================
-- CREAR PERFILES EN LA TABLA 'perfiles'
-- ============================================
-- Esto sincroniza los usuarios con la tabla perfiles
-- Asegúrate de que el trigger de sincronización esté activo

INSERT INTO public.perfiles (id, nombre, rol, email)
SELECT 
    id,
    raw_user_meta_data->>'nombre',
    'mecanico',
    email
FROM auth.users
WHERE email LIKE '%@taller.cl'
ON CONFLICT (id) DO UPDATE
SET 
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email;
