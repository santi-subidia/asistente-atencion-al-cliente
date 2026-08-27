import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ messages: [] }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('sesiones_chat')
    .select('messages')
    .eq('session_id', sessionId)
    .single();

  if (error || !data) {
    return NextResponse.json({ messages: [] });
  }

  return NextResponse.json({ messages: data.messages });
}
