# 🦷 Asistente de Atención al Cliente — Clínica Odontológica "Sonrisa Feliz"

Este proyecto es una aplicación web interactiva que implementa un **Asistente Virtual Inteligente** para una clínica odontológica. Está construido con **Next.js (App Router)**, **Vercel AI SDK**, **Google Gemini** y **Supabase** (actuando como base de datos relacional y vectorial).

El asistente utiliza **RAG (Retrieval-Augmented Generation)** para responder preguntas frecuentes sobre tratamientos y precios utilizando búsqueda semántica, y **Function Calling (Herramientas)** para interactuar en tiempo real con la base de datos de turnos médicos de la clínica.

---

## 🚀 Características Principales

*   **Búsqueda Semántica RAG**: El asistente genera embeddings vectoriales en tiempo real (`gemini-embedding-001`) para las preguntas del usuario y consulta la base de conocimiento clínica en Supabase mediante la extensión `pgvector` y similitud por coseno.
*   **Gestión Asistida de Citas (Function Calling)**:
    *   `consultar_turnos_disponibles`: El agente consulta la disponibilidad de horarios de atención en una fecha dada.
    *   `agendar_turno`: El agente registra citas médicas en horarios de atención libres (Lunes a Viernes de 09:00 a 18:00 en intervalos de 1 hora), solicitando la información obligatoria al paciente.
    *   `cancelar_turno`: Permite cancelar citas médicas ingresando el código identificador de la cita.
    *   `buscar_informacion_clinica`: Acceso instantáneo a la base de conocimiento sobre tratamientos y políticas.
*   **Validaciones de Negocio**: Restricción estricta de agendamiento y consultas en fechas pasadas y validación de horarios laborales.
*   **Persistencia de Sesiones**: Las conversaciones se asocian a un `sessionId` y se sincronizan automáticamente con Supabase mediante el hook `useChat` y respuestas de streaming, permitiendo mantener la memoria del chat al refrescar.
*   **Interfaz Responsiva**: Diseñada de forma moderna con **Tailwind CSS**.

---

## 🛠️ Tecnologías

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **Librería de IA**: [Vercel AI SDK 4.0](https://sdk.vercel.ai/)
*   **Modelo de Lenguaje**: [Google Gemini 2.5 Flash](https://aistudio.google.com/)
*   **Modelo de Embeddings**: `gemini-embedding-001` (salida de 768 dimensiones)
*   **Base de datos**: [Supabase](https://supabase.com/) (PostgreSQL + extensión `pgvector`)
*   **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/)

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:
1.  **Node.js** v18 o superior instalado.
2.  Una cuenta en **Supabase** para hospedar la base de datos.
3.  Una **Google Gemini API Key** desde [Google AI Studio](https://aistudio.google.com/).

---

## 🔧 Configuración e Instalación Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/santi-subidia/asistente-atencion-al-cliente.git
cd asistente-atencion-al-cliente
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar la base de datos en Supabase
1.  Ve a tu consola de Supabase, crea un nuevo proyecto o abre uno existente.
2.  Dirígete a la sección del **SQL Editor**.
3.  Copia el contenido del archivo [`supabase/setup.sql`](file:///C:/Users/santi/Documents/GitHub/asistente-atencion-al-cliente/supabase/setup.sql) y ejecútalo. Este script:
    *   Habilita la extensión `pgvector`.
    *   Crea las tablas `documentos_rag`, `turnos` y `sesiones_chat`.
    *   Crea un índice de unicidad para evitar que se superpongan citas agendadas en la misma fecha y hora.
    *   Crea la función RPC `match_documentos` para la búsqueda por similitud vectorial.
    *   Deshabilita las políticas RLS para permitir accesos directos desde el backend en este demo de portafolio.

### 4. Configurar variables de entorno
Copia el archivo de plantilla `.env.example` para crear tu configuración local:
```bash
cp .env.example .env.local
```

Abre `.env.local` e introduce tus claves de Supabase y de Google Gemini:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-clave-anon-de-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-de-supabase

GOOGLE_GENERATIVE_AI_API_KEY=tu-api-key-de-gemini
```

### 5. Sembrar la Base de Conocimiento (RAG)
Para que el asistente pueda responder preguntas sobre tratamientos, precios y políticas de la clínica, debes poblar la base de conocimiento. El proyecto incluye una ruta de siembra lista para ello.

1.  Inicia el servidor localmente:
    ```bash
    npm run dev
    ```
2.  Abre tu navegador o una herramienta como Postman y realiza una petición GET a la siguiente URL:
    [http://localhost:3000/api/seed](http://localhost:3000/api/seed)
3.  Recibirás un JSON confirmando que los documentos de ejemplo han sido convertidos a vectores y guardados en Supabase correctamente.

---

## 🌐 Despliegue en Vercel

Puedes desplegar este proyecto directamente en Vercel con un solo clic o importándolo desde tu cuenta de GitHub.

### Configurar Variables de Entorno en Vercel
Durante la configuración del proyecto en Vercel, asegúrate de ingresar exactamente las mismas variables del archivo `.env.local`:

| Variable | Descripción |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de API de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave anónima pública de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Clave de API de Gemini de Google AI Studio |

> [!IMPORTANT]
> Recuerda correr la ruta `/api/seed` en tu dominio de producción (ej. `https://tu-app.vercel.app/api/seed`) para sembrar los documentos RAG la primera vez que despliegues.

---

## 📂 Estructura del Proyecto

*   [`src/app/api/chat/route.ts`](file:///C:/Users/santi/Documents/GitHub/asistente-atencion-al-cliente/src/app/api/chat/route.ts): Endpoint principal de la conversación. Configura la lógica del agente, las herramientas de base de datos y almacena el historial.
*   [`src/app/api/chat/history/route.ts`](file:///C:/Users/santi/Documents/GitHub/asistente-atencion-al-cliente/src/app/api/chat/history/route.ts): Recupera el historial de chat persistido.
*   [`src/app/api/seed/route.ts`](file:///C:/Users/santi/Documents/GitHub/asistente-atencion-al-cliente/src/app/api/seed/route.ts): Sembrador (Seeder) que genera embeddings y puebla los documentos clínicos.
*   [`src/lib/supabase.ts`](file:///C:/Users/santi/Documents/GitHub/asistente-atencion-al-cliente/src/lib/supabase.ts): Inicialización del cliente Supabase.
*   [`supabase/setup.sql`](file:///C:/Users/santi/Documents/GitHub/asistente-atencion-al-cliente/supabase/setup.sql): Script SQL para recrear la base de datos y la función de búsqueda de vectores.
*   [`src/app/page.tsx`](file:///C:/Users/santi/Documents/GitHub/asistente-atencion-al-cliente/src/app/page.tsx): Interfaz de usuario del chat construida con React y Tailwind.
