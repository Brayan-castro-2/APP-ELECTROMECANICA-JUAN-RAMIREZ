# Aplicación Móvil - Next.js + Supabase

Aplicación moderna construida con Next.js 14 (App Router), Tailwind CSS, shadcn/ui y Supabase.

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 14 con App Router
- **Estilos**: Tailwind CSS
- **Componentes UI**: shadcn/ui (componentes profesionales y accesibles)
- **Iconos**: Lucide React
- **Backend/Base de datos**: Supabase (Auth + PostgreSQL)
- **Lenguaje**: TypeScript

## 📦 Instalación

### Prerrequisitos

- Node.js 18+ y npm instalados
- Cuenta en Supabase (opcional, para funcionalidades de backend)

### Pasos de instalación

1. **Instalar dependencias**
```bash
npm install
```

2. **Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-de-supabase
```

Para obtener estas credenciales:
- Ve a [supabase.com](https://supabase.com)
- Crea un nuevo proyecto
- Ve a Settings > API
- Copia la URL y la anon/public key

3. **Iniciar el servidor de desarrollo**

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
aplicacion-movil/
├── app/                    # App Router de Next.js
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Página de inicio
│   └── globals.css        # Estilos globales
├── components/
│   └── ui/                # Componentes de shadcn/ui
│       ├── button.tsx
│       └── card.tsx
├── lib/
│   ├── utils.ts           # Utilidades (cn helper)
│   └── supabase.ts        # Cliente de Supabase
├── public/                # Archivos estáticos
├── tailwind.config.ts     # Configuración de Tailwind
├── tsconfig.json          # Configuración de TypeScript
└── package.json
```

## 🎨 Componentes UI

Este proyecto usa **shadcn/ui**, una colección de componentes reutilizables construidos con Radix UI y Tailwind CSS.

### Componentes incluidos:
- **Button**: Botón con múltiples variantes
- **Card**: Tarjetas para contenido

### Agregar más componentes:

Visita [ui.shadcn.com](https://ui.shadcn.com) y copia los componentes que necesites en la carpeta `components/ui/`.

## 🔐 Autenticación con Supabase

El cliente de Supabase está configurado en `lib/supabase.ts`. Ejemplo de uso:

```typescript
import { supabase } from '@/lib/supabase'

// Registro
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@ejemplo.com',
  password: 'contraseña123'
})

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@ejemplo.com',
  password: 'contraseña123'
})

// Logout
await supabase.auth.signOut()
```

## 🗄️ Base de Datos

Supabase proporciona una base de datos PostgreSQL completa. Para crear tablas:

1. Ve al Dashboard de Supabase
2. Navega a "Table Editor"
3. Crea tus tablas con la interfaz visual
4. Usa el cliente de Supabase para hacer queries:

```typescript
// Insertar datos
const { data, error } = await supabase
  .from('tabla')
  .insert({ columna: 'valor' })

// Consultar datos
const { data, error } = await supabase
  .from('tabla')
  .select('*')
```

## 🎨 Personalización de Estilos

Los colores y temas se configuran en:
- `tailwind.config.ts`: Configuración de Tailwind
- `app/globals.css`: Variables CSS para temas claro/oscuro

Para cambiar el tema, modifica las variables CSS en `globals.css`.

## 📱 Diseño Responsive

Todos los componentes están diseñados para ser responsive usando las utilidades de Tailwind:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Contenido */}
</div>
```

## 🚀 Despliegue

### Vercel (Recomendado)

1. Sube tu código a GitHub
2. Importa el proyecto en [vercel.com](https://vercel.com)
3. Configura las variables de entorno
4. Despliega

### Otras plataformas

Este proyecto puede desplegarse en cualquier plataforma que soporte Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 📚 Recursos

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Documentación de Supabase](https://supabase.com/docs)
- [Lucide Icons](https://lucide.dev)

## 🛠️ Scripts Disponibles

```bash
npm run dev      # Inicia el servidor de desarrollo
npm run build    # Construye la aplicación para producción
npm run start    # Inicia el servidor de producción
npm run lint     # Ejecuta el linter
```

## 📝 Notas

- Los errores de TypeScript en el IDE desaparecerán después de ejecutar `npm install`
- Asegúrate de no commitear el archivo `.env.local` (ya está en `.gitignore`)
- Para SQLite local en lugar de Supabase, considera usar Prisma con SQLite

## 🤝 Contribuir

Este es un proyecto base. Siéntete libre de:
- Agregar más componentes de shadcn/ui
- Implementar páginas adicionales
- Configurar autenticación completa
- Agregar más funcionalidades

---

**¡Feliz desarrollo! 🎉**
