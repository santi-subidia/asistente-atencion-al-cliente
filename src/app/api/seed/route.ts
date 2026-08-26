import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { embedMany } from 'ai';
import { google } from '@ai-sdk/google';

const documentosEjemplo = [
  {
    titulo: 'Blanqueamiento Dental',
    contenido: 'El blanqueamiento dental es un tratamiento estético que logra reducir varios tonos el color original de las piezas dentales. El costo es de $150 USD. Requiere una sesión de 45 minutos. No causa dolor, pero puede generar leve sensibilidad temporal.'
  },
  {
    titulo: 'Implantes Dentales',
    contenido: 'Un implante dental es un componente de titanio que se ubica en el maxilar para sustituir la raíz de un diente perdido. El costo base es de $800 USD por implante. El tiempo de recuperación y oseointegración es de 3 a 6 meses. Requiere evaluación previa con radiografía panorámica.'
  },
  {
    titulo: 'Ortodoncia (Brackets)',
    contenido: 'Tratamiento para corregir la posición de los dientes. Ofrecemos brackets metálicos y estéticos (zafiro o invisalign). El tratamiento dura en promedio 18 a 24 meses. La consulta inicial de evaluación es gratuita. El mantenimiento mensual cuesta $50 USD.'
  },
  {
    titulo: 'Horarios de Atención y Ubicación',
    contenido: 'La clínica odontológica Sonrisa Feliz atiende de Lunes a Viernes de 09:00 a 18:00 horas. Los sábados atendemos solo urgencias de 09:00 a 13:00. Estamos ubicados en Av. Siempre Viva 742, Springfield.'
  },
  {
    titulo: 'Políticas de Cancelación de Turnos',
    contenido: 'Los turnos deben ser cancelados con al menos 24 horas de anticipación para poder reprogramarlos sin costo adicional.'
  }
];

export async function GET() {
  try {
    // 1. Generar embeddings para todos los documentos usando el modelo de Google Gemini
    const { embeddings } = await embedMany({
      model: google.embedding('gemini-embedding-001'),
      values: documentosEjemplo.map(doc => doc.contenido),
      providerOptions: {
        google: {
          outputDimensionality: 768,
        }
      }
    });

    // 2. Preparar los registros asociando cada documento con su respectivo vector
    const records = documentosEjemplo.map((doc, i) => ({
      titulo: doc.titulo,
      contenido: doc.contenido,
      embedding: embeddings[i],
    }));

    // 3. Insertar en la tabla documentos_rag de Supabase
    const { error } = await supabase.from('documentos_rag').insert(records);

    if (error) {
      console.error('Error insertando en Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Base de conocimiento sembrada correctamente.',
      registros_insertados: records.length 
    });

  } catch (error) {
    console.error('Error general:', error);
    return NextResponse.json({ error: 'Error procesando los embeddings' }, { status: 500 });
  }
}
