import { 
  convertToModelMessages, 
  createUIMessageStreamResponse, 
  streamText, 
  toUIMessageStream, 
  tool, 
  isStepCount,
  type UIMessage 
} from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { embed } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Obtenemos la fecha y hora actual dinámicamente para inyectarla en el contexto del Agente
  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0]; // Ej: 2026-08-26
  const currentTimeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const currentDayName = now.toLocaleDateString('es-AR', { weekday: 'long' });

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    system: `Eres un asistente virtual amable y profesional de la clínica odontológica "Sonrisa Feliz".
    Tu objetivo es ayudar a los pacientes a resolver dudas sobre los tratamientos usando la base de conocimiento y a gestionar sus turnos médicos.
    
    INFORMACIÓN DE CONTEXTO:
    - Hoy es ${currentDayName}, ${currentDateStr}. La hora actual es ${currentTimeStr}.
    
    Reglas importantes:
    1. Si te preguntan sobre tratamientos, precios, horarios o recuperación, SIEMPRE usa la herramienta 'buscar_informacion_clinica' antes de responder. Nunca inventes precios o tratamientos.
    2. Si el usuario pide un turno para "mañana" o "el próximo martes", calcula mentalmente la fecha correcta basándote en la fecha de hoy (${currentDateStr}).
    3. REGLA ESTRICTA DE TIEMPO: NO puedes agendar ni consultar turnos para fechas en el pasado (fechas anteriores a ${currentDateStr}). Si el usuario pide una fecha pasada, indícale amablemente el error.
    4. Solo podés agendar turnos de Lunes a Viernes de 09:00 a 18:00 (en intervalos de 1 hora, ej 09:00, 10:00).
    5. Para agendar un turno, necesitás obligatoriamente: El nombre del paciente, la fecha, la hora, y el motivo (tratamiento).
    6. Sé cordial, breve y claro en tus respuestas.`,
    
    tools: {
      buscar_informacion_clinica: tool({
        description: 'Busca información en la base de datos de la clínica sobre tratamientos, precios, tiempos de recuperación y políticas.',
        inputSchema: z.object({
          query: z.string().describe('La duda o concepto a buscar, ej: "precio blanqueamiento" o "duele el implante"'),
        }),
        execute: async ({ query }: { query: string }) => {
          const { embedding } = await embed({
            model: google.embedding('gemini-embedding-001'),
            value: query,
            providerOptions: { google: { outputDimensionality: 768 } }
          });

          const { data, error } = await supabase.rpc('match_documentos', {
            query_embedding: embedding,
            match_threshold: 0.5, // Bajamos el umbral para que preguntas genéricas ("qué hay?") calcen con los documentos
            match_count: 5, // Traemos más documentos a la vez
          });

          if (error) {
            console.error('Error RAG:', error);
            return 'Hubo un error al buscar la información. Intenta de nuevo.';
          }

          if (!data || data.length === 0) {
            return 'No se encontró información sobre ese tema en la clínica.';
          }

          return data.map((d: any) => d.contenido).join('\n\n');
        },
      }),

      consultar_turnos_disponibles: tool({
        description: 'Consulta qué horarios están libres para una fecha específica.',
        inputSchema: z.object({
          fecha: z.string().describe('La fecha a consultar en formato YYYY-MM-DD'),
        }),
        execute: async ({ fecha }: { fecha: string }) => {
          // Validación de Backend: Evitamos que el modelo consulte el pasado si se equivoca
          if (fecha < currentDateStr) {
            return `Error: La fecha ${fecha} está en el pasado. Hoy es ${currentDateStr}. Pide al usuario una fecha válida.`;
          }

          const { data, error } = await supabase
            .from('turnos')
            .select('hora')
            .eq('fecha', fecha)
            .eq('estado', 'agendado');

          if (error) return `Error consultando turnos: ${error.message}`;

          const horasOcupadas = data.map((t) => t.hora.slice(0, 5));
          const horariosLaborables = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
          
          const horasLibres = horariosLaborables.filter(h => !horasOcupadas.includes(h));
          
          return horasLibres.length > 0 
            ? `Los horarios libres para el ${fecha} son: ${horasLibres.join(', ')}`
            : `No hay turnos disponibles para el ${fecha}.`;
        }
      }),

      agendar_turno: tool({
        description: 'Agenda un nuevo turno médico para un paciente en un horario que esté libre.',
        inputSchema: z.object({
          nombre: z.string().describe('Nombre del paciente'),
          fecha: z.string().describe('Fecha en formato YYYY-MM-DD'),
          hora: z.string().describe('Hora en formato HH:MM (ej. 14:00)'),
          tratamiento: z.string().describe('El motivo o tratamiento'),
        }),
        execute: async ({ nombre, fecha, hora, tratamiento }: { nombre: string, fecha: string, hora: string, tratamiento: string }) => {
          // Validación dura en Backend
          if (fecha < currentDateStr) {
            return `Error: No se pueden agendar turnos en el pasado. Hoy es ${currentDateStr}.`;
          }

          const { data, error } = await supabase
            .from('turnos')
            .insert([{ nombre_paciente: nombre, fecha, hora, tratamiento, estado: 'agendado' }])
            .select()
            .single();

          if (error) {
            if (error.code === '23505') {
              return `El horario ${hora} del día ${fecha} ya fue ocupado. Por favor elegí otro.`;
            }
            return `Ocurrió un error al agendar: ${error.message}`;
          }

          return `Turno agendado con éxito. El ID de tu turno es: ${data.id}. Te esperamos!`;
        }
      }),
      
      cancelar_turno: tool({
        description: 'Cancela un turno previamente agendado usando su ID.',
        inputSchema: z.object({
          id_turno: z.string().describe('El ID UUID del turno a cancelar'),
        }),
        execute: async ({ id_turno }: { id_turno: string }) => {
          const { error } = await supabase
            .from('turnos')
            .update({ estado: 'cancelado' })
            .eq('id', id_turno);

          if (error) return `Error al cancelar el turno: ${error.message}`;
          return `El turno ${id_turno} fue cancelado exitosamente.`;
        }
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
