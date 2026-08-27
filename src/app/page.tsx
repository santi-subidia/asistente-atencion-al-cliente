'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState } from 'react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export default function ChatWrapper() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let storedSession = localStorage.getItem('chat_session_id');
    if (!storedSession) {
      storedSession = uuidv4();
      localStorage.setItem('chat_session_id', storedSession);
    }
    setSessionId(storedSession);

    fetch(`/api/chat/history?sessionId=${storedSession}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setInitialMessages(data.messages);
        }
      })
      .catch((err) => console.error("Error fetching history:", err))
      .finally(() => setIsInitializing(false));
  }, []);

  if (isInitializing) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">Cargando memoria del chat...</div>;
  }

  return <Chat sessionId={sessionId!} initialMessages={initialMessages} />;
}

function Chat({ sessionId, initialMessages }: { sessionId: string; initialMessages: UIMessage[] }) {
  const [input, setInput] = useState('');
  
  const { messages, sendMessage, status, error } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({ sessionId }),
    }),
  });
  
  const isLoading = status === 'streaming' || status === 'submitted';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 items-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[90vh]">
        
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-xl text-center">
          <h1 className="text-xl font-bold">Asistente - Clínica Sonrisa Feliz 🦷</h1>
          <p className="text-sm opacity-80">RAG + Function Calling Demo</p>
        </div>

        {/* Área de Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-10">
              ¡Hola! Soy el asistente de la clínica. Podés preguntarme sobre nuestros tratamientos, precios, o pedirme que agende un turno para vos.
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                }`}
              >
                {/* En v5 de Vercel AI SDK los mensajes se renderizan recorriendo m.parts */}
                {m.parts && m.parts.map((part, index) => {
                  if (part.type === 'text') {
                    return (
                      <div key={index} className="whitespace-pre-wrap">
                        {part.text}
                      </div>
                    );
                  }
                  
                  if (part.type.startsWith('tool-')) {
                    const toolName = part.type.replace('tool-', '');
                    // @ts-ignore
                    const isRunning = part.state === 'input-streaming' || part.state === 'input-available';
                    
                    return (
                      <div key={index} className="mt-2 text-xs bg-gray-200/50 p-2 rounded-lg border border-gray-300 font-mono text-gray-600">
                        <span className="font-semibold text-purple-600 flex items-center gap-1">
                          ⚙️ Ejecutando herramienta: {toolName}
                        </span>
                        {isRunning ? (
                          <span className="text-yellow-600 animate-pulse block mt-1">Cargando...</span>
                        ) : (
                          <span className="text-green-600 block mt-1">✓ Terminado</span>
                        )}
                      </div>
                    );
                  }
                  
                  return null;
                })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Banner de Error */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-800 animate-fade-in">
            <span className="text-base mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold">
                {error.message?.includes('GEMINI_QUOTA_EXCEEDED') 
                  ? 'Límite de cuota superado' 
                  : 'Error de comunicación'}
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {error.message?.includes('GEMINI_QUOTA_EXCEEDED')
                  ? 'Se agotó la cuota gratuita temporal de Gemini (Rate Limit / Quota Exceeded). Por favor, espera de 1 a 2 minutos para que se reactive.'
                  : error.message?.replace('GEMINI_QUOTA_EXCEEDED: ', '').replace('ERROR: ', '') || 'Ocurrió un error inesperado.'}
              </p>
            </div>
          </div>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white rounded-b-xl flex gap-2">
          <input
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            value={input}
            placeholder="Preguntá algo o pedí un turno..."
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            Enviar
          </button>
        </form>

      </div>
    </div>
  );
}
